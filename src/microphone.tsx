"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Mic, Pause } from "lucide-react";

type Policy = { allowsFeature(name: string): boolean };
type Recognition = {
  lang: string; interimResults: boolean;
  onresult: ((e:{results: ArrayLike<ArrayLike<{transcript:string}>>})=>void) | null;
  onerror: ((e:{error:string})=>void) | null;
  onend: (()=>void) | null;
  start():void; stop():void; abort():void;
};
type Mode = "dictate" | "record";

function micMessage(error:string) {
  switch(error) {
    case "not-allowed": case "service-not-allowed": case "NotAllowedError": case "SecurityError":
      return "마이크가 차단됐어요. Chrome에서 사이트 마이크와 Android의 Chrome 마이크 권한을 허용해 주세요.";
    case "audio-capture": case "NotFoundError":
      return "사용할 수 있는 마이크를 찾지 못했어요. 기기의 마이크를 확인해 주세요.";
    case "NotReadableError":
      return "마이크를 사용 중인 다른 앱이 있는지 확인하고 다시 시도해 주세요.";
    case "network":
      return "브라우저 음성 인식 서비스에 연결되지 않았어요. 녹음·재생이나 키보드 음성 입력을 사용할 수 있어요.";
    case "no-speech":
      return "음성이 감지되지 않았어요. 마이크 가까이에서 다시 말해 주세요.";
    default:
      return "음성 입력을 시작하지 못했어요. 녹음·재생 또는 키보드 음성 입력을 이용해 보세요.";
  }
}

export function Microphone({onText,language="en-NZ"}:{onText:(text:string)=>void;language?:string}) {
  const [status,setStatus]=useState<Mode|"prompt"|"idle">("idle");
  const [issue,setIssue]=useState("");
  const [audio,setAudio]=useState("");
  const [help,setHelp]=useState(false);
  const recognition=useRef<Recognition|null>(null);
  const recording=useRef<MediaRecorder|null>(null);
  const stream=useRef<MediaStream|null>(null);
  const timer=useRef<number|undefined>(undefined);
  const latestUrl=useRef("");
  const mounted=useRef(false);
  useEffect(()=>{
    mounted.current=true;
    return ()=>{
      mounted.current=false;
      if(recognition.current){recognition.current.onend=null;recognition.current.onerror=null;recognition.current.onresult=null;recognition.current.abort();}
      if(recording.current?.state==="recording"){recording.current.onstop=null;recording.current.stop();}
      stream.current?.getTracks().forEach(track=>track.stop());
      window.clearTimeout(timer.current);
      if(latestUrl.current)URL.revokeObjectURL(latestUrl.current);
    };
  },[]);

  function stop() {
    if(recognition.current)recognition.current.stop();
    if(recording.current?.state==="recording")recording.current.stop();
  }

  async function start(mode:Mode) {
    if(status!=="idle"){stop();return;}
    setIssue("");
    const doc=document as Document&{permissionsPolicy?:Policy;featurePolicy?:Policy};
    const policy=doc.permissionsPolicy??doc.featurePolicy;
    const embedded=window.top!==window.self;
    if(policy?.allowsFeature("microphone")===false || (!policy && embedded)){
      setIssue("이 화면에서는 마이크 권한을 요청할 수 없어요. Chrome에서 직접 열어 주세요.");return;
    }
    if(!navigator.mediaDevices?.getUserMedia){
      setIssue("이 화면은 마이크 입력을 지원하지 않아요. Chrome의 별도 탭에서 열어 주세요.");return;
    }
    const browser=window as Window&{SpeechRecognition?:new()=>Recognition;webkitSpeechRecognition?:new()=>Recognition};
    const Recognizer=browser.SpeechRecognition??browser.webkitSpeechRecognition;
    if(mode==="dictate"&&!Recognizer){
      setIssue("이 브라우저에는 음성 받아쓰기 기능이 없어요. 녹음·재생 또는 키보드의 마이크를 이용해 주세요.");return;
    }
    if(mode==="record"&&typeof MediaRecorder==="undefined"){
      setIssue("이 브라우저에는 녹음 기능이 없어요. Chrome에서 열거나 키보드 마이크를 이용해 주세요.");return;
    }
    window.speechSynthesis?.cancel();
    try {
      if(mode==="dictate"&&Recognizer){
        const next=new Recognizer();
        recognition.current=next;
        next.lang=language;
        next.interimResults=false;
        next.onresult=e=>onText(e.results[0][0].transcript);
        next.onerror=e=>{
          if(e.error!=="aborted")setIssue(micMessage(e.error));
          recognition.current=null;
          setStatus("idle");
        };
        next.onend=()=>{recognition.current=null;setStatus("idle");};
        next.start();
        setStatus("dictate");
        return;
      }
      setStatus("prompt");
      const input=await navigator.mediaDevices.getUserMedia({audio:true});
      if(!mounted.current){input.getTracks().forEach(t=>t.stop());return;}
      stream.current=input;
      const next=new MediaRecorder(input);
      recording.current=next;
      const chunks:Blob[]=[];
      next.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      next.onerror=()=>setIssue("녹음 중 문제가 생겼어요. 다시 시작해 주세요.");
      next.onstop=()=>{
        input.getTracks().forEach(t=>t.stop());
        stream.current=null;recording.current=null;
        window.clearTimeout(timer.current);
        if(!mounted.current)return;
        if(chunks.length){
          if(latestUrl.current)URL.revokeObjectURL(latestUrl.current);
          latestUrl.current=URL.createObjectURL(new Blob(chunks,{type:next.mimeType}));
          setAudio(latestUrl.current);
        }
        setStatus("idle");
      };
      next.start();
      setStatus("record");
      timer.current=window.setTimeout(()=>{if(next.state==="recording")next.stop();},90000);
    } catch(e){
      stream.current?.getTracks().forEach(t=>t.stop());
      stream.current=null;recording.current=null;recognition.current=null;
      if(mounted.current){setStatus("idle");setIssue(micMessage(e instanceof Error?e.name:""));}
    }
  }

  return <div className="record-control">
    <div className="mic-actions">
      <button className="btn secondary" type="button" disabled={status==="prompt"||status==="record"} onClick={()=>void start("dictate")}>{status==="dictate"?<Pause size={16}/>:<Mic size={16}/>} {status==="dictate"?"듣는 중 · 종료":language==="ko-KR"?"한국어로 말하기":"말해서 입력"}</button>
      <button className="btn secondary" type="button" disabled={status==="prompt"||status==="dictate"} onClick={()=>void start("record")}>{status==="prompt"?"권한 확인 중…":status==="record"?"녹음 종료":"녹음·재생"}</button>
      <button className="link-btn" type="button" onClick={()=>setHelp(!help)} aria-expanded={help}>마이크 도움말</button>
    </div>
    {audio&&<audio className="mic-audio" src={audio} aria-label="내 녹음 듣기" controls/>}
    {issue&&<small className="inline-error" role="status">{issue}</small>}
    {(help||issue)&&<div className="mic-help">
      <a href="/#speaking" target="_blank" rel="noopener noreferrer">Chrome에서 직접 열기 <ExternalLink size={13}/></a>
      <p>ChatGPT 앱에서 열려 있으면 메뉴에서 <strong>Chrome에서 열기</strong>를 선택하세요. Chrome에서는 주소창 왼쪽 사이트 설정에서 마이크를 허용하세요. Android의 <strong>설정 → 앱 → Chrome → 권한 → 마이크</strong>도 확인하세요.</p>
      <p>키보드 마이크로 답변을 입력할 수 있어요. 녹음·재생은 이 화면에서만 사용하며, 녹음 파일은 서버에 보내지 않아요.</p>
    </div>}
  </div>;
}
