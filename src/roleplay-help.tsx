import { useRef, useState } from "react";
import { Lightbulb, Languages, Volume2 } from "lucide-react";
import { Microphone } from "./microphone";
import type { Scenario } from "./content";

const hints: Record<Scenario, [string,string,string,string]> = {
  product:["관심 분야 → 검지 센서 → 맨발 체성분 측정 순으로 안내해 보세요.","First, select the health areas you’re interested in. Then place your index finger in the sensor and step barefoot onto the body composition analyser.","측정 결과와 고객이 선택한 관심 분야를 모두 언급하세요.","The kiosk combines both measurements and uses the results and the customer’s selected health interests to suggest personalised supplements."],
  pitch:["약국 구역 설치 → 소수 점포 파일럿 순서로 제안하세요.","We’d install T-health Solution in the pharmacy area and start with a pilot in a small number of stores.","이용 건수·첫 주문·재구매를 평가 지표로 제안하세요.","We’d agree on kiosk usage, first-order conversion and repeat purchases up front, then review those results together before discussing a wider rollout."],
  subscription:["로그인 → 추천 확인 → 앱 첫 주문을 연결하세요.","Once customers sign in, they can link their results to the app, review their recommendations and start with a four-week supply.","4주분은 진입 옵션이고 12개월은 목표임을 구분하세요.","We’d start with a four-week option and explain the annual plan to customers who are interested in continuing."],
  commercial:["장비 구독료와 판매 마진을 두 문장으로 설명하세요.","The pharmacy partner would pay a subscription fee for the equipment. We’re proposing a 50 per cent margin on supplement sales.","할인·반품·GST의 처리와 파일럿 기준을 먼저 합의하세요.","Could we agree on the treatment of discounts, returns and GST, and set pilot targets before planning a nationwide rollout?"],
  dispatch:["긴급 주문 → 인력 재배치 → 확인 시점 순으로 답하세요.","I’d prioritise urgent orders, move one person to packing, and check progress at two.","담당자와 고객에게 알릴 조건을 말하세요.","I’ll check progress at two and ask customer support to update anyone whose order may miss the cut-off."],
  staff:["긴급 업무를 먼저 정하고 가용 인력에게 나누세요.","I’d prioritise the urgent orders and redistribute the work among the available staff.","팀원의 여유 업무량과 후속 점검 시간을 넣어보세요.","I’d check everyone’s capacity before assigning tasks and review the workload again after lunch."],
  coaching:["관찰한 사실을 말하고 직원의 설명을 먼저 들어보세요.","Could you walk me through how you checked the label so we can see where things went wrong?","바꿔볼 절차와 점검일을 정하세요.","Let’s double-check the batch number before sealing each box, and review the error log on Friday."],
  budget:["세부 견적 요청과 대안 비교를 포함하세요.","I’d ask for an itemised quote and compare it with a second supplier’s offer.","어떤 우선순위를 기준으로 의사결정을 요청할지 말하세요.","I’d explain the trade-off between unit cost and lead time, then recommend the option that protects supply within budget."],
  meeting:["겹친 이유를 확인하고 결정 기준을 제안하세요.","Could we check which request has the tighter deadline and allocate the slot on that basis?","담당자와 진행 상황 공유 기한을 제시하세요.","I’ll confirm the agreed slot and send both teams an update by the end of the day."],
  customer:["현재 아는 사실과 다음 연락 시점을 전달하세요.","I’ll follow up with the courier now and update you by two this afternoon.","확답을 받은 범위와 대체 조치를 구분하세요.","I can commit to an update by two and explain the replacement options if the parcel can’t be located."],
  quality:["해당 배치 출고 보류와 추가 확인을 안내하세요.","Let’s set this batch aside, check the delivery paperwork and hold dispatch until we’ve verified the details.","배치·사진·승인 기록을 포함하세요.","I’ll record the batch number, save a photo of the label and document who signed off before releasing the stock."],
};

type TranslatorFactory = {
  availability(options:{sourceLanguage:string;targetLanguage:string}):Promise<string>;
  create(options:{sourceLanguage:string;targetLanguage:string}):Promise<{translate(text:string):Promise<string>;destroy():void}>;
};
const translator = () => (globalThis as typeof globalThis & {Translator?:TranslatorFactory}).Translator;

export function RoleplayHelp({topic,question,second,onUse,listen}:{topic:Scenario;question:string;second:boolean;onUse:(s:string)=>void;listen:(s:string)=>void}){
  const [opened,setOpened]=useState(false);
  const [model,setModel]=useState(false);
  const [ko,setKo]=useState("");
  const [english,setEnglish]=useState("");
  const [prompt,setPrompt]=useState("");
  const [status,setStatus]=useState("");
  const [busy,setBusy]=useState(false);
  const generation=useRef(0);
  const pair=hints[topic];
  const hint=pair[second?2:0], example=pair[second?3:1];
  function edit(text:string){
    generation.current++;
    setKo(text);setEnglish("");setPrompt("");setStatus("");setBusy(false);
  }
  async function translate(){
    const input=ko.trim();
    if(!input||busy)return;
    const id=++generation.current;
    setBusy(true);setStatus("");
    const fallback="Translate my Korean answer into concise and natural New Zealand business English. Answer the question directly, preserve my intentions and facts, avoid adding any promises or numbers, and give me one version I can say aloud.\nBuyer or colleague question: "+question+"\nMy answer (Korean): "+input;
    try{
      const api=translator();
      const options={sourceLanguage:"ko",targetLanguage:"en"};
      if(!api||await api.availability(options)==="unavailable")throw Error();
      const engine=await api.create(options);
      try{
        const value=await engine.translate(input);
        if(id===generation.current)setEnglish(value.trim());
      }finally{engine.destroy();}
    }catch{
      if(id!==generation.current)return;
      setPrompt(fallback);
      setStatus("이 기기에서 내장 AI 번역을 지원하지 않아요. 아래 요청문을 ChatGPT에 붙여넣으면 비즈니스 영어 답변을 받을 수 있어요.");
    }finally{if(id===generation.current)setBusy(false);}
  }
  return <div className="roleplay-help">
    <button type="button" className="btn secondary" onClick={()=>setOpened(!opened)} aria-expanded={opened}><Lightbulb size={16}/> 답변 힌트</button>
    {opened&&<div className="callout"><p>{hint}</p><button type="button" className="link-btn" onClick={()=>setModel(!model)}>{model?"모범답안 숨기기":"모범답안 보기"}</button>{model&&<><p lang="en-NZ">{example}</p><button type="button" className="link-btn" onClick={()=>listen(example)}><Volume2 size={16}/> 모범답안 듣기</button></>}</div>}
    <details className="chatgpt-option"><summary>한국어로 말하고 영어로 바꾸기</summary>
      <label className="field-label">한국어 답변<textarea lang="ko" maxLength={1000} value={ko} onChange={e=>edit(e.target.value)} placeholder="한국어로 말하거나 입력하세요."/></label>
      <div className="toolbar"><Microphone onText={edit} language="ko-KR"/><button type="button" className="btn primary" onClick={()=>void translate()} disabled={busy||!ko.trim()}><Languages size={16}/>{busy?"번역 중…":"영어로 바꾸기"}</button></div>
      {status&&<p role="status">{status}</p>}
      {prompt&&<><textarea aria-label="ChatGPT 번역 요청문" readOnly value={prompt}/><div className="toolbar"><button type="button" className="btn secondary" onClick={()=>{if(!navigator.clipboard){setStatus("위 요청문을 직접 선택해 복사해 주세요.");return;}void navigator.clipboard.writeText(prompt).then(()=>setStatus("복사했어요. ChatGPT에 붙여넣으세요.")).catch(()=>setStatus("위 요청문을 직접 선택해 복사해 주세요."));}}>번역 요청 복사</button><a className="btn secondary" href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">ChatGPT 열기</a></div></>}
      {(english||prompt)&&<><label className="field-label">영어 답변<textarea lang="en-NZ" value={english} onChange={e=>setEnglish(e.target.value)} maxLength={1800} placeholder="ChatGPT의 번역 결과를 붙여넣을 수 있어요."/></label><button type="button" className="btn secondary" disabled={!english.trim()} onClick={()=>onUse(english.trim())}>내 답변에 넣기</button></>}
    </details>
  </div>;
}
