import {useEffect,useState} from 'react';

type Config={publicKey:string};
const supported=()=>window.isSecureContext&&'serviceWorker'in navigator&&'PushManager'in window&&'Notification'in window;
async function request<T>(path:string, data?:unknown):Promise<T>{
 const response=await fetch('/api/push/'+path,data===undefined?{cache:'no-store'}:{
  method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data),
 });
 const result=await response.json();
 if(!response.ok)throw Error(result.message || '알림 설정을 확인해 주세요.');
 return result;
}
const decodeKey=(key:string)=>Uint8Array.from(atob(key.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(key.length/4)*4,'=')),char=>char.charCodeAt(0));
let registration:Promise<ServiceWorkerRegistration>|undefined;
function ready(){
 registration??=navigator.serviceWorker.register('/sw.js').then(async registration=>{
  if(registration.active)return registration;
  let timer:number|undefined;
  try{
   return await Promise.race([navigator.serviceWorker.ready,new Promise<never>((_,reject)=>{
    timer=window.setTimeout(()=>reject(Error('알림을 준비할 수 없어요. 페이지를 새로 열고 다시 시도해 주세요.')),7000);
   })]);
  }finally{clearTimeout(timer);}
 }).catch(error=>{registration=undefined;throw error;});
 return registration;
}
export function DeviceReminders(){
 const canPush=supported();
 const [key,setKey]=useState<string>();
 const [enabled,setEnabled]=useState(false);
 const [message,setMessage]=useState('');
 const [busy,setBusy]=useState(false);
 useEffect(()=>{
  if(!canPush)return;
  let alive=true;
  request<Config>('config').then(async result=>{
   if(!alive)return;
   setKey(result.publicKey);
   if(!result.publicKey)return;
   const sub=await (await ready()).pushManager.getSubscription();
   if(!sub)return;
   const info=await request<{enabled:boolean}>('status',sub.toJSON());
   if(alive)setEnabled(info.enabled&&Notification.permission==='granted');
  }).catch(()=>{if(alive){setKey('');setMessage('알림 설정을 불러오지 못했어요. 메뉴를 다시 열어 주세요.');}});
  return ()=>{alive=false;};
 },[canPush]);
 async function action(type:'enable'|'disable'|'test'){
  if(busy||!key)return;
  setBusy(true);setMessage('');
  try {
   if(type==='enable'&&await Notification.requestPermission()!=='granted'){
    setMessage('알림 권한이 꺼져 있어요. 기기의 사이트 알림 설정에서 허용한 뒤 다시 시도해 주세요.');return;
   }
   const manager=(await ready()).pushManager;
   let subscription=await manager.getSubscription();
   if(type==='enable'){
    const applicationServerKey=decodeKey(key);
    const existingKey=subscription?.options.applicationServerKey;
    if(subscription&&existingKey&&new Uint8Array(existingKey).join()!==applicationServerKey.join()){
     await request('remove',subscription.toJSON());
     await subscription.unsubscribe();
     subscription=null;
    }
    subscription??=await manager.subscribe({userVisibleOnly:true,applicationServerKey});
    await request('subscribe',subscription.toJSON());
    setEnabled(true);setMessage('이 기기에서 학습 알림을 켰어요.');
   }else if(type==='disable'){
    if(subscription){
     await request('remove',subscription.toJSON());
     await subscription.unsubscribe();
    }
    setEnabled(false);setMessage('이 기기에서 학습 알림을 껐어요.');
   }else{
    if(!subscription)throw Error('이 기기에서 알림을 먼저 켜 주세요.');
    await request('test',subscription.toJSON());
    setMessage('테스트 알림을 보냈어요.');
   }
  }catch(e){setMessage(e instanceof Error?e.message:'알림 설정을 확인해 주세요.');}
  finally{setBusy(false);}
 }
 return <>
  {canPush&&key?<>
   <button type="button" className="btn secondary" disabled={busy} onClick={()=>void action(enabled?'disable':'enable')}>
    {enabled?'이 기기 알림 끄기':'이 기기 알림 켜기'}
   </button>
   {enabled&&<button type="button" className="link-btn" disabled={busy} onClick={()=>void action('test')}>테스트 알림</button>}
  </>:<p>{!canPush?'이 화면은 기기 푸시를 지원하지 않아요. iPhone·iPad에서는 홈 화면에 추가한 앱을 열어 주세요.':key===''?'기기 푸시를 사용할 수 없어요.':'기기 알림을 확인 중이에요.'}</p>}
  {message&&<p role="status">{message}</p>}
 </>;
}
