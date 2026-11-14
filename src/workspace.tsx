"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import {
  Activity, ArrowDownToLine, ArrowLeft, ArrowRight, AudioLines, BookOpen, Box, CalendarDays,
  Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, ClipboardCheck, Clock3,
  Headphones, LayoutDashboard, ListChecks, Menu, MessageCircle, MessagesSquare, Mic, Pause,
  PenLine, Play, Repeat2, Search, Settings2, ShieldCheck, SlidersHorizontal, Sparkles,
  TrendingUp, Upload, Users, Volume2, X,
} from "lucide-react";
import { Reminder, Rewards, progress } from "./motivation";
import { RoleplayHelp } from "./roleplay-help";
import Worksheets from "./worksheets";
import { Microphone } from "./microphone";
import { categoryFor, meetingGuide, roleCategories } from "./business";
import { addDays, dailyCards, dateObj, dayKey, defaultProfile, scenarios, topicName, weekday, type Card, type Level, type Profile, type Scenario } from "./content";
import { clean, criteriaFeedback, getScenario, initialData, isComplete, knownCards, makeSession, mergeData, reviewQueue, schedule, weeklyCards, type Data, type Feedback, type RecordItem, type Session } from "./learning";

type View = "worksheet" | "dashboard" | "learn" | "scenarios" | "speaking" | "review" | "library" | "meetings";
type Stage = "learn" | "quiz" | "voice" | "correct";
const storageKey = "workspeak-health-lab-v1";
const navigation = [
  {id:"dashboard",label:"대시보드",icon:LayoutDashboard}, {id:"worksheet",label:"오늘의 학습지",icon:ClipboardCheck}, {id:"learn",label:"오늘의 연습",icon:BookOpen},
  {id:"scenarios",label:"직급별 연습",icon:MessagesSquare}, {id:"meetings",label:"비즈니스 미팅",icon:CalendarDays}, {id:"speaking",label:"말하기 도전",icon:Mic},
  {id:"review",label:"복습",icon:Repeat2}, {id:"library",label:"문장 보관함",icon:ListChecks},
] as const;
const stageLabels = {learn:"문장 학습",quiz:"회상 퀴즈",voice:"음성 역할극",correct:"교정·후속조치"};
const fieldLabels = {grammar:"문법",natural:"자연스러움",logic:"논리성",nz:"뉴질랜드 직장 적합성",ielts:"IELTS Speaking 6.5",followup:"후속 연습"};
const displayDate = (day: string, full = false) => new Intl.DateTimeFormat("ko-KR",{timeZone:"UTC",month:"long",day:"numeric",...(full?{weekday:"long"}:{})}).format(dateObj(day));
const dayType = (day: string) => weekday(day)===0 ? "휴식일" : weekday(day)===6 ? "주간 복습" : "신규 학습";

function currentDefaults(data:Data):Data {
  const profile = data.profileUpdated===0 && data.profile.role==="Office Manager" && data.profile.scenario==="auto"
    ? {...defaultProfile} : data.profile;
  const rename = (card:Card):Card => {
    if (!["product","pitch","subscription","commercial"].includes(card.topic)) return card;
    const replace = (text:string) => text.replace(/\b(?:Thealt(?: (?:Solution|Lab))?|T-Solution)\b/gi,"T-health Solution");
    return {...card,en:replace(card.en),ko:replace(card.ko),phrase:replace(card.phrase),example:replace(card.example)};
  };
  const records = Object.fromEntries(Object.entries(data.records).map(([key,item])=>[key,{...item,card:rename(item.card)}]));
  const sessions = Object.fromEntries(Object.entries(data.sessions).map(([key,item])=>[key,{...item,cards:item.cards.map(rename)}]));
  const imports = Object.fromEntries(Object.entries(data.imports).map(([key,card])=>[key,rename(card)]));
  return {...data,profile,records,sessions,imports};
}

function readLocal(): Data {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) ?? "null");
    if (parsed?.schema === 1 && parsed.sessions && parsed.records && parsed.imports) return currentDefaults(parsed);
  } catch {}
  return initialData();
}

function useLearning() {
  const [data,setData]=useState(readLocal);
  const [saved,setSaved]=useState(true);
  const ref=useRef(data);
  function update(fn:(prev:Data)=>Data) {
    const value=fn(ref.current);
    ref.current=value;
    setData(value);
    try {
      localStorage.setItem(storageKey,JSON.stringify(value));
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }
  return {data,update,saved};
}

function Pill({children,tone=""}:{children:ReactNode;tone?:string}) {return <span className={"pill "+tone}>{children}</span>;}
function Progress({value}:{value:number}) {return <div className="progress-track" role="progressbar" aria-label="진행률" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}><span style={{width:value+"%"}}/></div>;}
function Empty({children}:{children:ReactNode}) {return <div className="empty">{children}</div>;}
function speak(text:string,slow=false) {
  if (!("speechSynthesis" in window)) return false;
  const synth=window.speechSynthesis;
  synth.cancel();
  const voice=new SpeechSynthesisUtterance(text);
  voice.lang="en-NZ";
  voice.voice=synth.getVoices().find(v=>v.lang==="en-NZ") ?? synth.getVoices().find(v=>v.lang==="en-AU") ?? synth.getVoices().find(v=>v.lang==="en-GB") ?? null;
  voice.rate=slow ? .78 : .93;
  synth.speak(voice);
  return true;
}
const listen = (text:string,slow=false) => { if(!speak(text,slow)) window.alert("이 브라우저에서는 음성 재생을 사용할 수 없어요."); };
function HeroArt() {
  return <div className="hero-art" aria-hidden="true">
    <div className="orbit orbit-a"/><div className="orbit orbit-b"/><div className="orbit orbit-c"/><div className="orbit orbit-d"/>
    <i className="orbit-point point-a"/><i className="orbit-point point-b"/><i className="orbit-point point-c"/>
    <div className="hero-wave">{[11,18,33,55,77,46,64,101,70,41,74,53,31,48,25,13,8].map((v,i)=><i key={i} style={{height:v,opacity:.68+(i%4)*.09}} />)}</div>
    <div className="hero-mic"><Mic size={19}/></div>
  </div>;
}

export default function Workspace() {
  const {data,update,saved}=useLearning();
  const [today,setToday]=useState(dayKey);
  const [view,setView]=useState<View>("dashboard");
  const [mobile,setMobile]=useState(false);
  const [filters,setFilters]=useState(true);
  const [stage,setStage]=useState<Stage>("learn");
  const [index,setIndex]=useState(0);
  const [batch,setBatch]=useState(0);
  const [picked,setPicked]=useState<Card|null>(null);
  const [notification,setNotification]=useState("");
  const ai=false;
  const [voiceTopic,setVoiceTopic]=useState("");
  const [course,setCourse]=useState<(typeof roleCategories)[number]["id"] | null>(null);
  const activeCategory=roleCategories.find(c=>c.id===course)??categoryFor(data.profile.role);
  const [returnTo,setReturnTo]=useState<View>("dashboard");
  const [activeDay,setActiveDay]=useState<string|null>(null);
  const [draftProfile,setDraftProfile]=useState<Profile|null>(null);
  const profile=draftProfile??data.profile;
  const selectedDay=activeDay??today;
  const rest=weekday(selectedDay)===0;
  const saturday=weekday(selectedDay)===6;
  const sessionKey=saturday ? selectedDay+"/review-"+batch : selectedDay;
  const week=weeklyCards(data,selectedDay);
  const current=data.sessions[sessionKey];
  const cards=current?.cards ?? (saturday?week[batch]:dailyCards(selectedDay,data.profile));
  const studied=current?.studied.length??0;
  const recalled=Object.keys(current?.recalled??{}).length;
  const todayQueue=reviewQueue(data,today);
  const unresolvedToday=todayQueue.length;
  const todaySession=data.sessions[today];
  const todayStage:Stage=!todaySession || todaySession.studied.length<10 ? "learn" :
    Object.keys(todaySession.recalled).length<10 ? "quiz" : !todaySession.roleplay ? "voice" : "correct";
  function resumeToday(){
    if(weekday(today)===0){open("library");return;}
    if(weekday(today)===6){
      const unfinished=week.findIndex((_,n)=>!isComplete(data.sessions[today+"/review-"+n]));
      start(today,Math.max(0,unfinished));return;
    }
    if(isComplete(todaySession)&&todayQueue.length){open("review");return;}
    start();
    setStage(todayStage);
    if(todaySession){
      const upcoming=todaySession.cards.findIndex(c=>todayStage==="learn"?!todaySession.studied.includes(c.id):todayStage==="quiz"?!(c.id in todaySession.recalled):false);
      if(upcoming>=0)setIndex(upcoming);
    }
  }
  const scenario=scenarios.find(s=>s.id===((view==="speaking"?voiceTopic:"") || getScenario(cards,data.profile)))??scenarios[0];
  useEffect(()=>{
    const timer=window.setInterval(()=>setToday(dayKey()),15000);
    const hash=window.location.hash.slice(1);
    if(navigation.some(n=>n.id===hash))setView(hash as View);
    const onHash=()=>{const key=window.location.hash.slice(1);if(navigation.some(n=>n.id===key))setView(key as View);else setView("dashboard");};
    window.addEventListener("hashchange",onHash);
    return()=>{clearInterval(timer);window.removeEventListener("hashchange",onHash);};
  },[]);
  useEffect(()=>{
    if(!notification)return;
    const t=window.setTimeout(()=>setNotification(""),3900);
    return()=>clearTimeout(t);
  },[notification]);

  function open(next:View) {
    setView(next);setMobile(false);
    window.history.replaceState(null,"",next==="dashboard"?window.location.pathname:"#"+next);
    window.scrollTo({top:0,behavior:"instant"});
  }
  function patchSession(edit:(s:Session)=>Session) {
    if (!cards.length) return;
    update(p=>({...p,sessions:{...p.sessions,[sessionKey]:{...edit(p.sessions[sessionKey]??makeSession(cards)),updated:Date.now()}}}));
  }
  function start(day?:string,n=0) {
    setActiveDay(day??null);setBatch(n);setStage("learn");setIndex(0);setVoiceTopic("");open("learn");
  }
  function applyProfile(e:FormEvent) {
    e.preventDefault();
    saveProfile(profile);
  }
  function sessionsForProfile(p:Data,nextProfile:Profile) {
    if(weekday(today)===0 || weekday(today)===6)return p.sessions;
    const sessions={...p.sessions};
    const previous=sessions[today];
    const next=dailyCards(today,nextProfile);
    if(previous?.cards.every((c,i)=>c.id===next[i]?.id && c.en===next[i]?.en))return sessions;
    if(previous){
      if(previous.studied.length || Object.keys(previous.recalled).length || previous.corrected.length || previous.roleplay) {
        sessions[today+"/saved-"+previous.updated]=previous;
      }
    }
    sessions[today]=makeSession(next);
    return sessions;
  }
  function focusToday(topic:Scenario){
    update(p=>({...p,sessions:sessionsForProfile(p,{...p.profile,scenario:topic})}));
    start();
  }
  function saveProfile(nextProfile:Profile){
    update(p=>({...p,profile:nextProfile,profileUpdated:Date.now(),sessions:sessionsForProfile(p,nextProfile)}));
    setDraftProfile(null);setIndex(0);setStage("learn");setActiveDay(null);
    setNotification("연습 설정을 적용했어요.");
  }
  function saveRecord(card:Card, answer:string, feedback:Feedback|undefined, score:number, method:"criteria"|"ai"="criteria", mark?:boolean) {
    update(p=>{
      const prev=p.records[card.id];
      const timing=score ? schedule(score,prev,today):{day:prev?.day??today,due:prev?.due??"",step:prev?.step??0};
      const item:RecordItem={card,answer,feedback,score,method,...timing,saved:mark??prev?.saved??Boolean(feedback?.issue),
        history:score ? [...(prev?.history??[]),{day:today,at:Date.now(),score,issue:feedback?.issue??""}].slice(-80):prev?.history??[],updated:Date.now()};
      return {...p,records:{...p.records,[card.id]:item}};
    });
  }
  function saveEditor(card:Card, answer:string, feedback:Feedback, method:"criteria"|"ai", score:number) {
    saveRecord(card,answer,feedback,score,method);
    if(cards.some(c=>c.id===card.id))patchSession(s=>({...s,corrected:[...new Set([...s.corrected,card.id])]}));
    setNotification("교정과 다음 복습 일정을 저장했어요.");
  }
  function bookmark(card:Card) {
    update(p=>{
      const existing=p.records[card.id]??{card,answer:"",score:0,day:today,due:"",step:0,saved:false,history:[],updated:0};
      return {...p,records:{...p.records,[card.id]:{...existing,saved:!existing.saved,updated:Date.now()}}};
    });
  }
  function chooseCategory(category:(typeof roleCategories)[number]) {
    setCourse(category.id);
    if(data.profile.role!==category.role||data.profile.seniority!==category.seniority)saveProfile({...data.profile,role:category.role,seniority:category.seniority,scenario:"auto"});
    open("scenarios");
  }
  function roleplay(topic:string,from:View) {
    setVoiceTopic(topic);setReturnTo(from);open("speaking");
  }

  return <div className="shell">
    <aside className={"sidebar "+(mobile?"sidebar-open":"")}>
      <button className="brand" onClick={()=>open("dashboard")}><div className="brandmark"><AudioLines size={23}/></div><span>INGUL’S English<small>Business English · NZ</small></span></button>
      <div className="nav-label">워크스페이스</div>
      <nav aria-label="학습 메뉴">{navigation.map(n=>{const Icon=n.icon;return <button key={n.id} className={view===n.id?"nav active":"nav"} aria-current={view===n.id?"page":undefined} onClick={()=>n.id==="learn"?start():open(n.id)}><Icon size={19}/><span>{n.label}</span>{n.id==="review"&&todayQueue.length>0&&<b>{todayQueue.length}</b>}</button>;})}</nav>
      <div className="sidebar-bottom">
        <div className="target-card"><div className="target-icon"><TrendingUp size={17}/></div><div><strong>나의 학습 목표</strong><p>CEFR B2 <span>·</span> IELTS 6.5</p></div></div>
        <div className="user-card"><span className="avatar">TH</span><div><strong>{data.profile.role}</strong><small><i className={saved?"online":""}/>{saved?"이 기기에 기록 저장":"저장 공간 확인 필요"}</small></div></div>
      </div>
    </aside>
    {mobile&&<button className="backdrop" aria-label="메뉴 닫기" onClick={()=>setMobile(false)}/>}
    <div className="main-area">
      <header className="topbar"><div className="breadcrumb"><button className="icon-btn mobile-menu" aria-label="메뉴 열기" onClick={()=>setMobile(!mobile)}><Menu size={22}/></button><span>워크스페이스</span><ChevronRight size={14}/><strong>{navigation.find(n=>n.id===view)?.label}</strong></div><div className="top-right"><Reminder completed={isComplete(data.sessions[today])||Object.entries(data.sessions).some(([key,session])=>key.startsWith(today+"/")&&isComplete(session))} onOpen={()=>open("worksheet")}/><span className="top-date"><CalendarDays size={15}/> {displayDate(today,true)}</span><button className="icon-btn settings-btn" title="연습 설정" aria-label="연습 설정" onClick={()=>{if(view!=="dashboard"){open("dashboard");setFilters(true);}else setFilters(!filters);}}><Settings2 size={19}/></button></div></header>
      <main className="page">
        {view==="dashboard"&&<>
          <div className="heading"><div><p className="eyebrow"><i/> BUSINESS ENGLISH · NEW ZEALAND</p><h1>비즈니스 영어 대시보드</h1><p>제품을 설명하고, 바이어를 설득하고, 다음 미팅을 잡는 영어.</p></div><Pill tone="green"><Activity size={14}/> {dayType(today)}</Pill></div>
          <RoleCategories current={categoryFor(data.profile.role).id} onChoose={chooseCategory}/>
          {filters&&<form className="profile-panel panel" onSubmit={applyProfile}>
            <div className="profile-title"><div className="section-icon"><SlidersHorizontal size={17}/></div><div><h2>나의 연습 설정</h2><p>오늘 연습할 상황과 역할을 선택하세요.</p></div></div>
            <div className="profile-fields">
              <Select label="직무 상황" value={profile.scenario} onValue={v=>setDraftProfile({...profile,scenario:v as Profile["scenario"]})} options={[["auto","자동 추천"],...scenarios.map(s=>[s.id,s.name] as [string,string])]}/>
              <Select label="CEFR 수준" value={profile.level} onValue={v=>setDraftProfile({...profile,level:v as Level})} options={[["B1","B1 · 중급"],["B2","B2 · 중상급"],["C1","C1 · 고급"]]}/>
              <Select label="직급" value={profile.seniority} onValue={v=>setDraftProfile({...profile,seniority:v})} options={["Coordinator","Team Lead","Manager"].map(s=>[s,s])}/>
              <Select label="직무" value={profile.role} onValue={v=>setDraftProfile({...profile,role:v})} options={["Sales & Marketing Manager","Office Manager","Team Manager","Operations Coordinator","Commercial Director"].map(s=>[s,s])}/>
              <button className="btn secondary apply-btn">적용 <Check size={15}/></button>
            </div>
          </form>}
          <div className="dashboard-main">
            <section className="hero">
              <HeroArt/>
              <div className="hero-copy">
                <div className="hero-label"><Clock3 size={14}/> {weekday(today)===0?"SUNDAY REST":weekday(today)===6?"SATURDAY REVIEW":"TODAY’S PRACTICE"}</div>
                <h2>{weekday(today)===0?"오늘은 휴식일이에요":weekday(today)===6?"토요일 주간 복습":"오늘의 10분 연습"}</h2>
                <p>{weekday(today)===0?"다음 신규 학습은 월요일에 열려요.":weekday(today)===6?"한 주 동안 본 표현을 10개씩 꺼내 말해 보세요.":topicName(getScenario(data.sessions[today]?.cards??dailyCards(today,data.profile),data.profile))+" 상황에서 바로 쓰는 영어"}</p>
                <div className="hero-actions">
                  <button className="btn hero-btn" onClick={resumeToday}>{weekday(today)===0?"보관함 열기":weekday(today)===6?"주간 복습 시작":isComplete(todaySession)&&todayQueue.length?"복습 시작":todaySession?.studied.length?"이어하기":"연습 시작"}<ArrowRight size={17}/></button>
                  {weekday(today)!==0&&<span>{weekday(today)<6&&todaySession?.studied.length ? (isComplete(todaySession)?`학습 완료 · 복습 ${todayQueue.length}개`:"다음 · "+stageLabels[todayStage]) : <>실무 7문장 <b>·</b> 스몰토크 3문장</>}</span>}
                </div>
              </div>
            </section>
            <WeekPanel today={today} data={data} onDay={d=>start(d)}/>
          </div>
          <section className="panel worksheet-entry"><div><h2>오늘의 10문장 학습지</h2><p>한국어 뜻을 보고 영어를 떠올린 뒤 외웠는지 체크하세요.</p></div><button className="btn primary" onClick={()=>open("worksheet")}>학습지 열기 <ArrowRight size={16}/></button></section>
          <div className="quick-grid">
            <Quick icon={<MessagesSquare size={20}/>} tone="green" title="비즈니스 미팅" description="오프닝부터 제안·클로징까지" onClick={()=>open("meetings")}/>
            <Quick icon={<Mic size={20}/>} tone="purple" title="말하기 도전" description="직장 대화에 소리 내어 답하기" onClick={()=>roleplay("", "dashboard")}/>
            <Quick icon={<Repeat2 size={20}/>} tone="orange" title="간격 반복 복습" description={todayQueue.length ? `복습할 표현 ${todayQueue.length}개`:"다음 복습 일정 확인"} onClick={()=>open("review")}/>
          </div>
          <Rewards data={data} today={today} redeem={()=>update(p=>progress(p,today).balance>=1000&&!p.rewards?.includes("business-100")?{...p,rewards:[...(p.rewards??[]),"business-100"]}:p)}/>
          <DashboardMetrics data={data} today={today} onLibrary={()=>open("library")} onRecord={setPicked} onReview={()=>open("review")}/>
        </>}
        {view==="worksheet"&&<Worksheets onSpeak={topic=>roleplay(topic,"worksheet")} onListen={listen}/>}
        {view==="learn"&&<>
          <div className="heading"><div><p className="eyebrow"><i/> {displayDate(selectedDay,true)}</p><h1>{rest?"일요일은 휴식일":saturday?"토요일 주간 복습":"오늘의 10분 연습"}</h1><p>{rest?"다음 신규 학습은 월요일에 열립니다.":saturday?"실무 7문장과 스몰토크 3문장씩 복습하세요.":`${scenario.name} · ${data.profile.level} · ${data.profile.role} / ${data.profile.seniority}`}</p></div><button className="btn secondary" onClick={()=>open("dashboard")}><ArrowLeft size={16}/> 대시보드</button></div>
          {rest?<section className="panel empty big-empty"><CalendarDays size={32}/><p>편하게 쉬고, 월요일에 이어가세요.</p></section>:<>
            {saturday&&<div className="batch-row">{week.map((_,n)=><button key={n} className={"btn "+(batch===n?"primary":"secondary")} onClick={()=>start(selectedDay,n)}>세트 {n+1} {isComplete(data.sessions[selectedDay+"/review-"+n])?"✓":""}</button>)}</div>}
            <div className="steps panel">{(Object.keys(stageLabels) as Stage[]).map((s,n)=><button key={s} className={stage===s?"step selected":"step"} onClick={()=>{setStage(s);setIndex(0);}}><span>{(s==="learn"&&studied===10)||(s==="quiz"&&recalled===10)||(s==="voice"&&current?.roleplay)||(s==="correct"&&current?.corrected.length)?<Check size={15}/>:n+1}</span>{stageLabels[s]}</button>)}</div>
            <div className="lesson-grid">
              <div className="panel lesson-nav"><h2>{saturday?"복습 10문장":"오늘의 10문장"}</h2><Progress value={studied*10}/><small>{studied} / 10 문장 학습</small>
                {cards.map((c,n)=><button key={c.id} className={index===n?"lesson-number active":"lesson-number"} onClick={()=>{setIndex(n);if(stage==="voice")setStage("learn");}}><span>{n+1}</span><div><strong>{c.phrase}</strong><small>{c.kind==="work"?"실무 영어":"스몰토크"}</small></div>{current?.studied.includes(c.id)&&<Check size={15}/>}</button>)}
              </div>
              {stage==="learn"&&cards[index]&&<LessonCard key={cards[index].id} card={cards[index]} index={index} saved={data.records[cards[index].id]?.saved} onSave={()=>bookmark(cards[index])}
                onNext={()=>{const id=cards[index].id;patchSession(s=>({...s,studied:[...new Set([...s.studied,id])]}));if(index<9)setIndex(index+1);else{setStage("quiz");setIndex(0);}}} onPrev={index>0?()=>setIndex(index-1):undefined}/>}
              {stage==="quiz"&&cards[index]&&<Quiz key={cards[index].id} card={cards[index]} index={index} original={current?.recalled[cards[index].id]}
                onResult={(answer,pass)=>{const card=cards[index];const previous=data.records[card.id];if(!previous?.feedback){let feedback=criteriaFeedback(answer,card);if(!pass)feedback={...feedback,issue:"회상 퀴즈",original:answer,improved:card.en};saveRecord(card,answer,feedback,pass?3:1);}
                  else if(!pass) update(p=>{const existing=p.records[card.id]??previous;return {...p,records:{...p.records,[card.id]:{...existing,...schedule(1,existing,today),score:1,history:[...existing.history,{day:today,at:Date.now(),score:1,issue:"회상 퀴즈"}].slice(-80),updated:Date.now()}}};});patchSession(s=>({...s,recalled:{...s.recalled,[card.id]:pass}}));}}
                onNext={()=>{if(index<9)setIndex(index+1);else setStage("voice");}}/>}
              {stage==="voice"&&<Roleplay key={scenario.id} scenario={scenario} profile={data.profile} ai={ai} inline onFinish={(answer,feedback,method)=>{
                const card=cards.find(c=>c.kind==="work");
                if(card){saveEditor(card,answer,feedback,method,feedback.score);patchSession(s=>({...s,roleplay:true}));setIndex(cards.indexOf(card));setStage("correct");}
              }}/>}
              {stage==="correct"&&cards[index]&&<Editor key={cards[index].id} card={cards[index]} record={data.records[cards[index].id]} ai={ai} onSave={saveEditor} onClose={undefined}
                extra={<button className="btn secondary" onClick={()=>open("review")}><Repeat2 size={16}/> 간격 반복 복습</button>}/>}
            </div>
          </>}
        </>}
        {view==="scenarios"&&<>
          <div className="heading"><div><p className="eyebrow"><i/> BUSINESS SCENARIOS</p><h1>직급별 연습</h1><p>직급 카드를 눌러 업무에 맞는 과정을 열어보세요.</p></div></div>
          <RoleCategories current={activeCategory.id} onChoose={chooseCategory}/>
          <div className="stats-heading course-heading"><h2>{activeCategory.label} 과정</h2><span>{data.profile.level}</span></div>
          <div className="scenario-grid">{activeCategory.scenarios.map(id=>{const s=scenarios.find(s=>s.id===id)!;return <section className="panel scenario-card business-scenario" key={s.id}><img src={"/business/"+s.image+".webp"} alt="" loading="lazy"/><div><span>{s.en}</span><h2>{s.name}</h2><p>{s.brief}</p><div className="toolbar"><button className="btn primary" onClick={()=>roleplay(s.id,"scenarios")}>말하기 <ArrowRight size={16}/></button>{weekday(today)>0&&weekday(today)<6&&<button className="btn secondary" onClick={()=>focusToday(s.id)}>오늘의 10문장</button>}</div></div></section>;})}</div>
        </>}
        {view==="meetings"&&<MeetingPlaybook onPractice={()=>roleplay("pitch","meetings")}/>}
        {view==="speaking"&&<>
          <div className="heading"><div><p className="eyebrow"><i/> SPEAKING PRACTICE</p><h1>말하기 도전</h1><p>바이어나 동료의 질문에 영어로 답하고, 후속 질문까지 이어가세요.</p></div><button className="btn secondary" onClick={()=>open(returnTo)}><ArrowLeft size={16}/> 돌아가기</button></div>
          <div className="speaking-wrap"><div className="panel conversation-controls"><Select label="연습 상황" value={scenario.id} onValue={setVoiceTopic} options={scenarios.map(s=>[s.id,s.name])}/><Pill tone="green">{data.profile.level} · {data.profile.role}</Pill></div>
          <Roleplay key={scenario.id} scenario={scenario} profile={data.profile} ai={ai} onFinish={(answer,feedback,method)=>{
            const id="roleplay-"+scenario.id;
            const card:Card={id,topic:scenario.id,kind:"work",en:scenario.opening,ko:scenario.brief,phrase:scenario.en,meaning:"말하기 연습",example:feedback.improved,source:"말하기 도전"};
            saveEditor(card,answer,feedback,method,feedback.score);
            if(cards.some(c=>c.topic===scenario.id))patchSession(s=>({...s,roleplay:true}));
          }}/></div>
        </>}
        {view==="review"&&<Review data={data} today={today} due={todayQueue} unresolved={unresolvedToday} onStart={start} onPick={setPicked} onRate={(r,n)=>{
          saveRecord(r.card,r.answer,r.feedback,n,r.method,r.saved);setNotification("다음 복습 날짜를 갱신했어요.");
        }}/>}
        {view==="library"&&<Library data={data} today={today} onPick={setPicked} onBookmark={bookmark} onImport={(cards,records)=>{
          update(p=>({...p,imports:{...p.imports,...Object.fromEntries(cards.map(c=>[c.id,c]))},records:{...p.records,...Object.fromEntries(records.filter(r=>!p.records[r.card.id]||r.updated>=p.records[r.card.id].updated).map(r=>[r.card.id,r]))}}));
          setNotification(`${cards.length}개 문장과 ${records.length}개 기록을 가져왔어요.`);
        }} onRestore={(backup)=>{update(p=>mergeData(p,currentDefaults(backup)));setNotification("학습 기록과 설정을 가져왔어요.");}} notify={setNotification}/>}
      </main>
    </div>
    {picked&&<div className="modal-backdrop" onClick={()=>setPicked(null)}><div className="modal" role="dialog" aria-modal="true" aria-label="문장과 학습 기록 수정" onClick={e=>e.stopPropagation()}><Editor key={picked.id} card={picked} record={data.records[picked.id]} ai={ai} onSave={saveEditor} onClose={()=>setPicked(null)}/></div></div>}
    {notification&&<div className="toast" role="status"><Check size={17}/>{notification}</div>}
  </div>;
}

function RoleCategories({current,onChoose}:{current:string;onChoose:(category:(typeof roleCategories)[number])=>void}) {
  return <section className="role-section" aria-label="직급별 과정"><div className="stats-heading"><h2>직급별 과정</h2></div><div className="role-grid">{roleCategories.map(category=>
    <button className={"role-card "+(current===category.id?"chosen":"")} key={category.id} onClick={()=>onChoose(category)} aria-pressed={current===category.id}>
      <img src={"/business/"+category.image+".webp"} alt=""/><span className="role-copy"><strong>{category.label}</strong><small>{category.subtitle}</small></span><ArrowRight size={17}/>
    </button>)}</div></section>;
}

function MeetingPlaybook({onPractice}:{onPractice:()=>void}){
  return <>
    <div className="heading"><div><p className="eyebrow"><i/> BUYER MEETING</p><h1>비즈니스 미팅</h1><p>Chemist Warehouse 본사 바이어 미팅을 가정한 문장 구조와 예시예요.</p></div></div>
    <section className="panel playbook-intro"><img src="/business/meeting.webp" alt=""/><div><h2>T-health Solution 바이어 미팅</h2><p>제품 시연에서 사업 조건으로 넘어가고, 파일럿 담당자와 다음 일정을 합의하는 연습.</p><button className="btn primary" onClick={onPractice}>바이어 역할극 <ArrowRight size={16}/></button></div></section>
    <div className="playbook-grid">{meetingGuide.map(([title,structure,example])=><section className="panel playbook-card" key={title}><h2>{title}</h2><div><small>문장 구조</small><p lang="en-NZ">{structure}</p></div><div><small>미팅 예시</small><p lang="en-NZ">{example}</p></div><button className="link-btn" onClick={()=>listen(example)}><Volume2 size={16}/> 예시 듣기</button></section>)}</div>
  </>;
}

function ChatGPTPractice({scenario}:{scenario:ScenarioDetail}){
  const [copied,setCopied]=useState(false);
  const [show,setShow]=useState(false);
  const isBusiness=["product","pitch","subscription","commercial"].includes(scenario.id);
  const text="Act as my business English coach for a realistic New Zealand workplace roleplay. My level is CEFR B2, and my IELTS Speaking goal is 6.5. Ask one question at a time, in English. Use only the scenario facts supplied. Context: "+scenario.en+". "+(isBusiness?"T-health Solution is a pharmacy wellness kiosk. Customers select health interests, place their index finger in a pulse waveform sensor and stand barefoot on a body composition analyser. The kiosk combines the measurements and suggests supplements based on the results and selected interests. Results and recommendations are stored on a server. Signing in links them to the app, where customers can review recommendations and order. Four-week supply is the entry option. A 12-month subscription is our goal. Proposed terms for the retailer: equipment subscription fee and 50% margin on supplement sales. We aim to pitch Chemist Warehouse New Zealand head office, pilot in pharmacy areas, and expand nationwide if agreed. ":"")+"Start with: "+scenario.opening+" After two answers, give concise Korean feedback on grammar, naturalness, logic, NZ workplace appropriateness and IELTS-style coherence and vocabulary. Offer an improved English answer. Base your feedback on the transcript.";
  return <details className="chatgpt-option"><summary>별도 API 결제 없이 ChatGPT에서 대화 연습</summary><p>연습 지시문을 복사해서 ChatGPT에 붙여넣으세요. 여기서는 기준표 교정과 복습 기록을 계속 사용할 수 있어요.</p><div className="toolbar"><button type="button" className="btn secondary" onClick={async()=>{try{await navigator.clipboard.writeText(text);setCopied(true);}catch{setShow(true);}}}>{copied?"복사 완료":"연습 지시문 복사"}</button><a className="btn secondary" href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">ChatGPT 열기 <ArrowRight size={16}/></a></div>{show&&<textarea readOnly value={text} aria-label="연습 지시문"/>}</details>;
}

function Select({label,value,onValue,options}:{label:string;value:string;onValue:(v:string)=>void;options:[string,string][]}) {
  return <label className="select-label">{label}<span className="select-wrap"><select value={value} onChange={e=>onValue(e.target.value)}>{options.map(([id,title])=><option key={id} value={id}>{title}</option>)}</select><ChevronDown size={14}/></span></label>;
}
function Quick({icon,tone,title,description,onClick}:{icon:ReactNode;tone:string;title:string;description:string;onClick:()=>void}) {
  return <button className="quick panel" onClick={onClick}><div className={"quick-icon "+tone}>{icon}</div><div><h3>{title}</h3><p>{description}</p></div><ChevronRight className="quick-arrow" size={19}/></button>;
}
function WeekPanel({today,data,onDay}:{today:string;data:Data;onDay:(d:string)=>void}) {
  const monday=addDays(today,-((weekday(today)+6)%7));
  const dayLabels=["월","화","수","목","금","토","일"];
  const days=dayLabels.map((label,n)=>({label,day:addDays(monday,n)}));
  const completed=days.slice(0,5).filter(d=>isComplete(data.sessions[d.day])).length;
  return <section className="panel week-panel"><div className="section-header"><div className="section-icon"><CalendarDays size={18}/></div><div><h2>이번 주 학습</h2><p>{displayDate(monday)} – {displayDate(addDays(monday,6))}</p></div></div>
    <div className="week-line">{days.map(({label,day},n)=><button key={day} title={dayType(day)} disabled={day>today && n<5} aria-label={label+"요일 "+dayType(day)} onClick={()=>onDay(day)}
      className={`day ${day===today?"today":""} ${n===5?"saturday":""} ${n===6?"rest":""}`}><span>{label}</span><strong>{isComplete(data.sessions[day])?<Check size={14}/>:dateObj(day).getUTCDate()}</strong></button>)}</div>
    <div className="week-legend"><span><i className="legend-new"/>평일 신규</span><span><i className="legend-review"/>토요일 복습</span><span><i className="legend-rest"/>일요일 휴식</span></div>
    <div className="week-progress"><span>평일 연습 완료</span><strong>{completed} / 5일</strong></div><Progress value={completed*20}/>
  </section>;
}

function DashboardMetrics({data,today,onLibrary,onRecord,onReview}:{data:Data;today:string;onLibrary:()=>void;onRecord:(c:Card)=>void;onReview:()=>void}) {
  const monday=addDays(today,-((weekday(today)+6)%7));
  const sessions=Object.entries(data.sessions).filter(([k])=>!k.includes("/")&&k>=monday&&k<=today).map(([,v])=>v);
  const count=sessions.reduce((n,s)=>n+s.studied.length,0);
  const history=Object.values(data.records).filter(r=>r.history.length).sort((a,b)=>b.day.localeCompare(a.day)||b.updated-a.updated);
  const errors=Object.entries(history.flatMap(r=>r.history).reduce<Record<string,number>>((p,a)=>{if(a.issue)p[a.issue]=(p[a.issue]??0)+1;return p;},{})).sort((a,b)=>b[1]-a[1]);
  const due=reviewQueue(data,today);
  const expected=Math.min(5,Math.max(1,weekday(today) || 7))*10;
  const completion=Math.round(count/expected*100);
  const metrics=[{title:"이번 주 문장 완료율",value:completion+"%",subtitle:`${count} / ${expected}개 · 경과한 평일 기준`,icon:ClipboardCheck,tone:"green"},
    {title:"오늘 복습 예정",value:String(due.length)+"개",subtitle:due.length?"기한이 된 표현":"오늘 기한에 도달한 표현 없음",icon:Repeat2,tone:"orange"},
    {title:"반복 오류",value:errors.filter(e=>e[1]>1).length+"가지",subtitle:errors[0]?.[1]>1?errors[0][0]:"같은 오류가 두 번 나오면 표시",icon:Activity,tone:"purple"}];
  return <div className="dashboard-bottom">
    <div className="stats-heading"><h2>나의 학습 현황</h2><span>{displayDate(monday)} 시작 주</span></div>
    <div className="metrics-grid">{metrics.map(m=>{const Icon=m.icon;return <section className="panel metric" key={m.title}><div><p>{m.title}</p><strong>{m.value}</strong><small>{m.subtitle}</small></div><div className={"quick-icon "+m.tone}><Icon size={18}/></div></section>;})}</div>
    <div className="record-grid">
      <section className="panel records"><div className="record-header"><h2>최근 연습 이력</h2><button className="link-btn" onClick={onLibrary}>보관함 <ArrowRight size={15}/></button></div>
        {history.length?history.slice(0,4).map(r=><button className="record-row" onClick={()=>onRecord(r.card)} key={r.card.id}><div><strong>{r.card.phrase}</strong><small>{topicName(r.card.topic)} · {displayDate(r.day)}</small></div><Pill tone={r.score<3?"orange":"green"}>{r.score<3?"다시 연습":"기록 있음"}</Pill></button>):<Empty>답변을 저장하면 여기에 표시돼요.</Empty>}
      </section>
      <section className="panel records"><div className="record-header"><h2>주간 복습 목록</h2><button className="link-btn" onClick={onReview}>전체 <ArrowRight size={15}/></button></div>
        {weeklyCards(data,addDays(monday,5))[0].slice(0,3).map(c=><button className="record-row" key={c.id} onClick={()=>onRecord(c)}><div><strong>{c.phrase}</strong><small>{topicName(c.topic)}</small></div><Pill tone={data.records[c.id]?.due<=today?"orange":""}>{data.records[c.id]?.due<=today?"복습 필요":"토요일"}</Pill></button>)}
      </section>
      <section className="panel growth"><div className="record-header"><h2>상황별 성장</h2><span>첫 기록 대비 최근 기록</span></div>
        <div className="growth-grid">{scenarios.map(s=>{const attempts=history.filter(r=>r.card.topic===s.id).flatMap(r=>r.history).sort((a,b)=>a.day.localeCompare(b.day)||(a.at??0)-(b.at??0));const a=attempts[0]?.score??0;const b=attempts.at(-1)?.score??0;const change=Math.round((b-a)/4*100);return <div key={s.id}><div><strong>{s.name}</strong><span>{attempts.length>1?`${change>0?"+":""}${change}%p`:attempts.length?"기준점 저장":"연습 전"}</span></div><Progress value={b*25}/></div>;})}</div>
      </section>
    </div>
  </div>;
}

function LessonCard({card,index,saved,onSave,onNext,onPrev}:{card:Card;index:number;saved?:boolean;onSave:()=>void;onNext:()=>void;onPrev?:()=>void}) {
  return <section className="panel lesson-card">
    <div className="record-header"><div className="tag-row"><Pill tone={card.kind==="work"?"green":"purple"}>{card.kind==="work"?"실무 영어":"스몰토크"}</Pill><span>{index+1} / 10</span></div><button className="link-btn" onClick={onSave}>{saved?"✓ 보관됨":"보관하기"}</button></div>
    <h2 lang="en-NZ">{card.en}</h2><p className="translation">{card.ko}</p>
    <div className="audio-actions"><button className="btn secondary" onClick={()=>listen(card.en)}><Volume2 size={17}/> 듣기</button><button className="btn secondary" onClick={()=>listen(card.en,true)}><Headphones size={17}/> 천천히</button></div>
    <div className="phrase-box"><span>핵심 표현</span><strong lang="en-NZ">{card.phrase}</strong><p>{card.meaning}</p><div><span>예문</span><p lang="en-NZ">{card.example}</p></div></div>
    <div className="card-footer">{onPrev?<button className="btn secondary" onClick={onPrev}><ChevronLeft size={16}/> 이전</button>:<span/>}<button className="btn primary" onClick={onNext}>{index===9?"학습 완료 · 회상 퀴즈":"학습 완료 · 다음"}<ArrowRight size={16}/></button></div>
  </section>;
}

function Quiz({card,index,original,onResult,onNext}:{card:Card;index:number;original?:boolean;onResult:(a:string,p:boolean)=>void;onNext:()=>void}) {
  const [answer,setAnswer]=useState("");
  const [result,setResult]=useState<boolean|undefined>(original);
  const [hint,setHint]=useState(false);
  function check(e:FormEvent){e.preventDefault();if(!answer.trim())return;const expected=clean(card.en);const given=clean(answer);const sequence=expected.split(" ");const shared=new Set(given.split(" ").filter(w=>sequence.includes(w))).size;
    const pass=given===expected || (shared>=Math.ceil(new Set(sequence).size*.8) && clean(card.phrase).split(" ").filter(w=>w.length>3).some(w=>given.includes(w)));
    setResult(pass);onResult(answer,pass);
  }
  return <form className="panel lesson-card" onSubmit={check}>
    <div className="record-header"><div className="tag-row"><Pill tone="purple">회상 퀴즈</Pill><span>{index+1} / 10</span></div><button className="link-btn" type="button" onClick={()=>setHint(!hint)}><CircleHelp size={16}/> 힌트</button></div>
    <h2 className="quiz-heading">{card.ko}</h2><p className="translation">한국어 뜻을 보고 배운 영어 표현을 떠올려 보세요.</p>
    {hint&&<div className="phrase-box"><span>핵심 표현</span><strong>{card.phrase}</strong></div>}
    <label className="field-label">내 답변<textarea value={answer} onChange={e=>setAnswer(e.target.value)} placeholder="Type your answer in English…" maxLength={1800}/></label>
    {result!==undefined&&<div className="callout" role="status"><strong>{result?"핵심 표현을 잘 기억했어요.":"원문과 비교하며 다시 말해보세요."}</strong><p lang="en-NZ">{card.en}</p><button type="button" className="link-btn" onClick={()=>listen(card.en)}><Volume2 size={16}/> 정답 듣기</button></div>}
    <div className="card-footer"><button className="btn secondary" disabled={!answer.trim()}>답 확인</button>{result!==undefined&&<button className="btn primary" type="button" onClick={onNext}>{index===9?"음성 역할극으로":"다음 퀴즈"}<ArrowRight size={16}/></button>}</div>
  </form>;
}

async function coach(payload:object) {
  const response=await fetch("/api/coach",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
  if(!response.ok)throw Error();
  return await response.json() as {reply?:unknown};
}
function validFeedback(value:unknown): value is Feedback {
  if(!value || typeof value!=="object") return false;
  const obj=value as Record<string,unknown>;
  return [...Object.keys(fieldLabels),"improved","issue","original"].every(k=>typeof obj[k]==="string") && typeof obj.score==="number" && [1,2,3,4].includes(obj.score);
}
async function getFeedback(answer:string,card:Card,ai:boolean,roleplay=false,context?:object):Promise<{feedback:Feedback;method:"criteria"|"ai";failed?:boolean}> {
  if(ai){try{
    const result=await coach({mode:"feedback",answer,card,roleplay,context});
    if(validFeedback(result))return {feedback:result,method:"ai"};
  }catch{}}
  return {feedback:criteriaFeedback(answer,card,roleplay),method:"criteria",failed:ai};
}
function Editor({card,record,ai,onSave,onClose,extra}:{card:Card;record?:RecordItem;ai:boolean;onSave:(card:Card,answer:string,f:Feedback,m:"criteria"|"ai",score:number)=>void;onClose?:()=>void;extra?:ReactNode}) {
  const [answer,setAnswer]=useState(record?.answer??"");
  const [evaluated,setEvaluated]=useState(record?.answer??"");
  const [feedback,setFeedback]=useState(record?.feedback);
  const [method,setMethod]=useState<"criteria"|"ai">(record?.method??"criteria");
  const [score,setScore]=useState(record?.score||3);
  const [busy,setBusy]=useState(false);
  const [fallback,setFallback]=useState(false);
  useEffect(()=>{
    if(record?.feedback){
      setAnswer(record.answer);setEvaluated(record.answer);setFeedback(record.feedback);
      setScore(record.score||3);setMethod(record.method??"criteria");
    }
  },[record?.updated]);
  useEffect(()=>{
    if(!onClose)return;
    const escape=(e:KeyboardEvent)=>{if(e.key==="Escape")onClose();};
    window.addEventListener("keydown",escape);
    return()=>window.removeEventListener("keydown",escape);
  },[onClose]);
  async function evaluate(save=false) {
    if(!answer.trim()||busy)return;
    setBusy(true);
    const result=await getFeedback(answer,card,ai,card.id.startsWith("roleplay-"),{topic:topicName(card.topic)});
    setFeedback(result.feedback);setMethod(result.method);setFallback(Boolean(result.failed));setScore(result.feedback.score);setEvaluated(answer);setBusy(false);
    if(save)onSave(card,answer,result.feedback,result.method,result.feedback.score);
  }
  return <section className="panel editor">
    <div className="record-header"><div className="tag-row"><Pill tone="green">교정·후속조치</Pill>{card.source&&<span>{card.source}</span>}</div>{onClose&&<button className="icon-btn" aria-label="닫기" onClick={onClose}><X size={21}/></button>}</div>
    <h2 lang="en-NZ">{card.en}</h2><p className="translation">{card.ko}</p>
    <div className="editor-example"><strong>{card.phrase}</strong> <span>{card.meaning}</span><p lang="en-NZ">{card.example}</p></div>
    <label className="field-label">내 답변<textarea value={answer} onChange={e=>setAnswer(e.target.value)} maxLength={1800} placeholder="영어 문장으로 답해 보세요."/></label>
    <div className="toolbar"><Microphone onText={setAnswer}/><button className="btn secondary" type="button" disabled={busy||!answer.trim()} onClick={()=>void evaluate()}><Sparkles size={16}/> {busy?"확인 중…":"피드백 받기"}</button></div>
    {feedback&&<FeedbackFields feedback={feedback} setFeedback={setFeedback} method={method} fallback={fallback}/>}
    {feedback&&<div className="review-rating"><Select label="내 복습 상태" value={String(score)} onValue={v=>setScore(Number(v))} options={[["1","1 · 다시 연습"],["2","2 · 조금 어려움"],["3","3 · 말할 수 있음"],["4","4 · 쉽게 말함"]]}/>{record?.due&&<p>현재 다음 복습 <strong>{displayDate(record.due)}</strong></p>}</div>}
    <div className="card-footer">{extra??<span/>}<button className="btn primary" disabled={busy||!answer.trim()} onClick={()=>feedback&&evaluated===answer?onSave(card,answer,feedback,method,score):void evaluate(true)}><Check size={16}/> 기록 저장</button></div>
  </section>;
}

function FeedbackFields({feedback,setFeedback,method,fallback}:{feedback:Feedback;setFeedback?:(f:Feedback)=>void;method:"criteria"|"ai";fallback?:boolean}) {
  return <div className="feedback-fields">
    <div className="record-header"><h3>답변 피드백</h3><Pill tone={method==="ai"?"purple":"green"}>{method==="ai"?"AI 코치":"기준표 피드백"}</Pill></div>
    {fallback&&<small className="inline-error">AI 응답을 가져오지 못해 기준표 피드백을 표시했어요.</small>}
    <div className="feedback-grid">{Object.entries(fieldLabels).map(([key,label])=>{const field=key as keyof typeof fieldLabels;return <div key={key}><strong>{label}</strong>{setFeedback?<textarea aria-label={label} maxLength={1800} value={feedback[field]} onChange={e=>setFeedback({...feedback,[field]:e.target.value})}/>:<p>{feedback[field]}</p>}</div>;})}</div>
    <div className="feedback-notes">{setFeedback?<><label className="field-label">틀린 표현<textarea value={feedback.original} maxLength={500} onChange={e=>setFeedback({...feedback,original:e.target.value})}/></label><label className="field-label">반복 오류 유형<input value={feedback.issue} maxLength={100} onChange={e=>setFeedback({...feedback,issue:e.target.value})}/></label></>:feedback.original&&<p>다시 볼 표현 <strong>{feedback.original}</strong></p>}</div>
    <label className="field-label">개선 문장{setFeedback?<textarea lang="en-NZ" value={feedback.improved} maxLength={1800} onChange={e=>setFeedback({...feedback,improved:e.target.value})}/>:<p lang="en-NZ">{feedback.improved}</p>}</label>
  </div>;
}

type ScenarioDetail=typeof scenarios[number];
type Turn={by:"coach"|"you";text:string};
function Roleplay({scenario,profile,ai,inline,onFinish}:{scenario:ScenarioDetail;profile:Profile;ai:boolean;inline?:boolean;onFinish:(a:string,f:Feedback,m:"criteria"|"ai")=>void}) {
  const [turns,setTurns]=useState<Turn[]>([{by:"coach",text:scenario.opening}]);
  const [answer,setAnswer]=useState("");
  const [busy,setBusy]=useState(false);
  const [done,setDone]=useState(false);
  const [feedback,setFeedback]=useState<Feedback>();
  const [method,setMethod]=useState<"criteria"|"ai">("criteria");
  const [fallback,setFallback]=useState(false);
  const [saved,setSaved]=useState(false);
  const questions=turns.filter(t=>t.by==="you").length;
  const context={scenario:scenario.name,brief:scenario.brief,profile,turns};
  const isSupervisor=profile.seniority==="Team Lead"||profile.seniority==="Manager";
  const probed=(value:string)=>{
    if(["product","pitch","subscription","commercial"].includes(scenario.id))return scenario.probe;
    if(!/\b(i|we|can|could|will|would|let's)\b/i.test(value)) return "What would you do first? Could you give me one specific action?";
    if(profile.level==="B1")return "What will you do next, and when?";
    if(profile.level==="C1")return "How would you explain your reasoning if the preferred option wasn’t available?";
    if(profile.role==="Operations Coordinator"||!isSupervisor)return "Who would you update, and what would you tell them?";
    return scenario.probe;
  };
  async function submit(e:FormEvent){
    e.preventDefault();
    if(!answer.trim()||busy)return;
    const text=answer.trim();
    const next:Turn[]=[...turns,{by:"you",text}];
    setAnswer("");setTurns(next);setBusy(true);
    if(questions===0){
      let followup=probed(text);
      if(ai){try{const result=await coach({mode:"roleplay",answer:text,...context});if(typeof result.reply==="string"&&result.reply.trim())followup=result.reply;else setFallback(true);}catch{setFallback(true);}}
      setTurns([...next,{by:"coach",text:followup}]);
      speak(followup);
    }else{
      const card:Card={id:"roleplay-"+scenario.id,topic:scenario.id,kind:"work",en:scenario.opening,ko:scenario.brief,phrase:"next steps",meaning:"다음 조치",example:"I’ll confirm the owner and the next check-in time."};
      const evaluated=await getFeedback(next.filter(t=>t.by==="you").map(t=>t.text).join("\n\n"),card,ai,true,{...context,turns:next});
      setFeedback(evaluated.feedback);setMethod(evaluated.method);if(evaluated.failed)setFallback(true);setDone(true);
    }
    setBusy(false);
  }
  return <section className="panel voice-card">
    <div className="record-header"><div className="tag-row"><Pill tone="purple"><Mic size={14}/> {ai?"AI 음성 역할극":"음성 역할극"}</Pill><span>{scenario.en}</span></div><button className="link-btn" onClick={()=>{setTurns([{by:"coach",text:scenario.opening}]);setAnswer("");setDone(false);setFeedback(undefined);setSaved(false);setFallback(false);}} disabled={busy}>다시 시작</button></div>
    <h2>{scenario.name}</h2><p className="translation">{scenario.brief}</p>
    <div className="conversation" aria-live="polite">{turns.map((turn,i)=><div key={i} className={"turn "+turn.by}><span>{turn.by==="coach"?(["product","pitch","subscription","commercial"].includes(scenario.id)?"바이어":"동료"):"나"}</span><p lang="en-NZ">{turn.text}</p>{turn.by==="coach"&&<button className="icon-btn" aria-label="질문 듣기" onClick={()=>listen(turn.text)}><Volume2 size={18}/></button>}</div>)}</div>
    {!done&&<form onSubmit={submit}><RoleplayHelp key={questions} topic={scenario.id} question={turns.at(-1)?.text??scenario.opening} second={questions>0} onUse={setAnswer} listen={listen}/><label className="field-label">내 답변<textarea value={answer} onChange={e=>setAnswer(e.target.value)} maxLength={1800} placeholder="말해서 입력하거나 영어 답변을 작성하세요." disabled={busy}/></label><div className="card-footer"><Microphone onText={setAnswer}/><button className="btn primary" disabled={busy||!answer.trim()}>{busy?"응답 확인 중…":questions===0?"답변 보내기":"교정 받기"} <ArrowRight size={16}/></button></div></form>}
    {done&&feedback&&<><FeedbackFields feedback={feedback} method={method} fallback={fallback}/><div className="card-footer"><span/><button className="btn primary" disabled={saved} onClick={()=>{onFinish(turns.filter(t=>t.by==="you").map(t=>t.text).join("\n\n"),feedback,method);setSaved(true);}}><Check size={16}/>{saved?"저장 완료":inline?"교정으로 이어가기":"교정·복습에 저장"}</button></div></>}
    <p className="fine">{ai?"AI 코치는 음성 인식으로 변환된 답변 텍스트를 사용해요.":"기준표 모드에서는 상황과 답변에 따라 준비된 후속 질문이 이어져요."} 듣기와 마이크 지원은 브라우저에 따라 달라요.</p>
    {!ai&&<ChatGPTPractice scenario={scenario}/>}
  </section>;
}

function Review({data,today,due,unresolved,onStart,onPick,onRate}:{data:Data;today:string;due:RecordItem[];unresolved:number;onStart:(d?:string,n?:number)=>void;onPick:(c:Card)=>void;onRate:(r:RecordItem,n:number)=>void}) {
  const saturday=addDays(today,5-((weekday(today)+6)%7));
  const batches=weeklyCards(data,saturday);
  const [tab,setTab]=useState<"due"|"week"|"upcoming">("due");
  const [offset,setOffset]=useState(0);
  const [revealed,setRevealed]=useState<string[]>([]);
  const upcoming=Object.values(data.records).filter(r=>r.due>today).sort((a,b)=>a.due.localeCompare(b.due));
  const list=tab==="upcoming"?upcoming:due;
  const page=Math.min(offset,Math.max(0,Math.ceil(list.length/10)-1));
  return <>
    <div className="heading"><div><p className="eyebrow"><i/> SPACED REPETITION</p><h1>복습</h1><p>틀리거나 어려웠던 표현을 먼저 연습하세요.</p></div><Pill tone="orange"><Repeat2 size={14}/> 오늘 남은 표현 {unresolved}개</Pill></div>
    {weekday(today)===0&&<div className="callout"><strong>오늘은 쉬는 날이에요.</strong><p>새 표현 없이 다음 복습 일정을 확인할 수 있어요.</p></div>}
    <div className="tabs" role="tablist" aria-label="복습 목록">{([["due","오늘 복습"],["week","토요일 주간 복습"],["upcoming","예정된 복습"]] as const).map(([v,label])=><button key={v} role="tab" aria-selected={v===tab} className={v===tab?"tab active":"tab"} onClick={()=>{setTab(v);setOffset(0);setRevealed([]);}}>{label}</button>)}</div>
    {tab==="week"?<div className="review-grid">{batches.map((set,n)=><section key={n} className="panel scenario-card"><div className="section-icon"><CalendarDays size={20}/></div><span>{displayDate(saturday,true)}</span><h2>복습 세트 {n+1}</h2><p>실무 7개 · 스몰토크 3개</p><div className="review-preview">{set.slice(0,3).map(c=><span key={c.id}>{c.phrase}</span>)}</div><button className="btn secondary" onClick={()=>onStart(saturday,n)}>10문장 복습 <ArrowRight size={16}/></button></section>)}</div>:<section className="panel list-panel">
      {!list.length&&<Empty>{tab==="due"?"오늘 복습할 표현이 없어요. 새 답변을 저장하면 일정이 생겨요.":"예정된 복습이 없어요."}</Empty>}
      {list.slice(page*10,page*10+10).map(r=><div className="review-row" key={r.card.id}><div><div className="tag-row"><Pill tone={r.score<3?"orange":"green"}>{r.score<3?"다시 연습":"기억 점검"}</Pill><span>{topicName(r.card.topic)} · {displayDate(r.due)}</span></div><h3>{r.card.ko}</h3>{revealed.includes(r.card.id)&&<p lang="en-NZ">{r.feedback?.improved||r.card.en}</p>}{r.feedback?.original&&<small>틀린 표현 · {r.feedback.original}</small>}</div><div className="review-controls"><button className="btn secondary" onClick={()=>setRevealed(r0=>r0.includes(r.card.id)?r0.filter(id=>id!==r.card.id):[...r0,r.card.id])}>{revealed.includes(r.card.id)?"영어 숨기기":"영어 확인"}</button>{revealed.includes(r.card.id)&&<><button className="btn secondary" onClick={()=>onRate(r,1)}>다시 연습</button><button className="btn secondary" onClick={()=>onRate(r,3)}>기억했어요</button></>}<button className="link-btn" onClick={()=>onPick(r.card)}><PenLine size={15}/> 수정</button></div></div>)}
      {list.length>10&&<Pagination page={page} total={list.length} onPage={setOffset}/>}
    </section>}
  </>;
}
function Pagination({page,total,onPage}:{page:number;total:number;onPage:(n:number)=>void}) {
  const pages=Math.ceil(total/10);
  return <div className="pagination"><button className="btn secondary" disabled={page===0} onClick={()=>onPage(page-1)}><ChevronLeft size={16}/> 이전</button><span>{page+1} / {pages}</span><button className="btn secondary" disabled={page+1>=pages} onClick={()=>onPage(page+1)}>다음 <ChevronRight size={16}/></button></div>;
}

function validBackup(value: unknown): value is Data {
  if(!value || typeof value!=="object")return false;
  const obj=value as Data;
  const dict=(v:unknown)=>Boolean(v && typeof v==="object" && !Array.isArray(v));
  const card=(c:Card)=>c && typeof c.id==="string" && typeof c.en==="string" && typeof c.ko==="string" &&
    typeof c.phrase==="string" && typeof c.meaning==="string" && typeof c.example==="string" && ["work","talk"].includes(c.kind);
  const day=(d:unknown)=>typeof d==="string" && /^\d{4}-\d{2}-\d{2}$/.test(d) && Number.isFinite(dateObj(d).getTime());
  if(obj.schema!==1 || !obj.profile || !["B1","B2","C1"].includes(obj.profile.level) ||
    !["auto",...scenarios.map(s=>s.id)].includes(obj.profile.scenario) ||
    typeof obj.profile.role!=="string" || typeof obj.profile.seniority!=="string" || !Number.isFinite(obj.profileUpdated) ||
    (obj.rewards!==undefined && (!Array.isArray(obj.rewards)||!obj.rewards.every(x=>x==="business-100")))|| !dict(obj.records)||!dict(obj.sessions)||!dict(obj.imports))return false;
  return Object.values(obj.imports).every(card) &&
    Object.values(obj.records).every(r=>r && card(r.card) && typeof r.answer==="string" && [0,1,2,3,4].includes(r.score) &&
      day(r.day) && (r.due==="" || day(r.due)) && Number.isFinite(r.updated) && Number.isInteger(r.step) && typeof r.saved==="boolean" &&
      (!r.feedback || validFeedback(r.feedback)) && Array.isArray(r.history) && r.history.every(a=>a && day(a.day) && typeof a.issue==="string" && [1,2,3,4].includes(a.score))) &&
    Object.entries(obj.sessions).every(([key,s])=>day(key.split("/")[0]) && s && Array.isArray(s.cards)&&s.cards.length===10&&s.cards.every(card)&&
      Array.isArray(s.studied)&&s.studied.every(id=>typeof id==="string") && dict(s.recalled) && Object.values(s.recalled).every(v=>typeof v==="boolean") &&
      Array.isArray(s.corrected)&&s.corrected.every(id=>typeof id==="string") && typeof s.roleplay==="boolean"&&Number.isFinite(s.updated));
}

function Library({data,today,onPick,onBookmark,onImport,onRestore,notify}:{data:Data;today:string;onPick:(c:Card)=>void;onBookmark:(c:Card)=>void;onImport:(c:Card[],r:RecordItem[])=>void;onRestore:(backup:Data)=>void;notify:(s:string)=>void}) {
  const [search,setSearch]=useState("");
  const [topic,setTopic]=useState("");
  const [kind,setKind]=useState("");
  const [status,setStatus]=useState("");
  const [issue,setIssue]=useState("");
  const [page,setPage]=useState(0);
  const fileInput=useRef<HTMLInputElement|null>(null);
  const issues=[...new Set(Object.values(data.records).map(r=>r.feedback?.issue).filter((s):s is string=>Boolean(s)))];
  const query=clean(search);
  const list=knownCards(data).filter(c=>{
    const r=data.records[c.id];
    if(topic&&c.topic!==topic || kind&&c.kind!==kind) return false;
    if(issue&&(issue==="any"?!r?.feedback?.issue:r?.feedback?.issue!==issue))return false;
    if(status==="due"&&!(r?.due&&r.due<=today)||status==="upcoming"&&!(r?.due&&r.due>today)||status==="saved"&&!r?.saved||status==="new"&&r?.history.length)return false;
    return !query || clean([c.en,c.ko,c.phrase,c.meaning,c.source,topicName(c.topic),r?.answer,r?.feedback?.issue,r?.feedback?.improved,r?.feedback?.original].join(" ")).includes(query);
  }).sort((a,b)=>Number(Boolean(data.records[b.id]?.saved))-Number(Boolean(data.records[a.id]?.saved))||Number(Boolean(b.source))-Number(Boolean(a.source)));
  const displayed=Math.min(page,Math.max(0,Math.ceil(list.length/10)-1));
  function exportData(){
    const blob=new Blob([JSON.stringify({version:2,backup:data})],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download="inguls-english-backup.json";a.click();window.setTimeout(()=>URL.revokeObjectURL(url),3000);
  }
  async function importData(e:ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0];e.target.value="";
    if(!file)return;
    try{
      if(file.size>1_500_000)throw Error();
      const value=JSON.parse(await file.text());
      if(value?.version===2 && validBackup(value.backup)){
        onRestore(value.backup);setPage(0);return;
      }
      const entries=Array.isArray(value)?value:value?.cards??[];
      const records=Array.isArray(value?.records)?value.records:[];
      if(!Array.isArray(entries)||entries.length>500||records.length>500)throw Error();
      const cardValid=(c:Card)=>c && typeof c.en==="string"&&c.en.trim()&&c.en.length<=1500 && typeof c.ko==="string";
      function normalise(c:Card):Card {
        if(!cardValid(c))throw Error();
        const k=c.kind==="talk"||c.topic==="smalltalk"?"talk":"work";
        const id=typeof c.id==="string"&&/^[\w-]{1,90}$/.test(c.id)?c.id:crypto.randomUUID();
        return {id,topic:k==="talk"?"smalltalk":scenarios.find(s=>s.id===c.topic)?.id??"dispatch",kind:k,en:c.en.trim(),ko:c.ko.slice(0,1500),
          phrase:typeof c.phrase==="string"?c.phrase.slice(0,350):c.en.trim().slice(0,75),meaning:typeof c.meaning==="string"?c.meaning.slice(0,800):"",example:typeof c.example==="string"?c.example.slice(0,1500):c.en,source:"가져온 문장"};
      }
      const imported=entries.map(normalise) as Card[];
      const importedRecords=records.filter((r:RecordItem)=>cardValid(r?.card)&&typeof r.answer==="string"&&[0,1,2,3,4].includes(r.score)&&/^\d{4}-\d{2}-\d{2}$/.test(r.day)&&Array.isArray(r.history)).map((r:RecordItem):RecordItem=>({...r,
        card:normalise(r.card),answer:r.answer.slice(0,1800),feedback:validFeedback(r.feedback)?r.feedback:undefined,
        method:r.method==="ai"?"ai":"criteria",step:Number.isInteger(r.step)?Math.max(0,Math.min(4,r.step)):0,
        due:/^\d{4}-\d{2}-\d{2}$/.test(r.due)?r.due:"",saved:Boolean(r.saved),updated:Number.isFinite(r.updated)?r.updated:Date.now(),
        history:r.history.filter(a=>a&&typeof a.issue==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(a.day)&&[1,2,3,4].includes(a.score)).slice(-80),
      }));
      if(!imported.length&&!importedRecords.length)throw Error();
      onImport(imported,importedRecords);setPage(0);
    }catch{notify("가져올 수 있는 문장 또는 기록 JSON 파일을 확인해 주세요.");}
  }
  return <>
    <div className="heading"><div><p className="eyebrow"><i/> SENTENCE LIBRARY</p><h1>문장 보관함</h1><p>이전 표현과 교정 기록을 찾아 다시 활용하세요.</p></div><div className="toolbar"><button className="btn secondary" onClick={()=>fileInput.current?.click()}><Upload size={16}/> 가져오기</button><button className="btn secondary" onClick={exportData}><ArrowDownToLine size={16}/> 기록 내보내기</button><input type="file" accept=".json,application/json" ref={fileInput} onChange={importData} hidden/></div></div>
    <details className="import-help"><summary>가져올 수 있는 항목</summary><p>내보낸 JSON으로 연습 설정, 완료율, 교정 기록과 복습 일정을 다른 기기나 앱으로 옮길 수 있어요. 영어(en)와 한국어(ko)를 담은 문장 JSON도 가져올 수 있어요.</p></details>
    <div className="panel library-filters"><label className="search"><Search size={19}/><input aria-label="문장 또는 오류 검색" value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}} placeholder="문장, 핵심 표현, 오류 또는 상황 검색"/></label>
      <div className="filter-row">
        <Select label="상황" value={topic} onValue={v=>{setTopic(v);setPage(0);}} options={[["","전체 상황"],...scenarios.map(s=>[s.id,s.name] as [string,string]),["smalltalk","동료 스몰토크"]]}/>
        <Select label="유형" value={kind} onValue={v=>{setKind(v);setPage(0);}} options={[["","전체 유형"],["work","실무 영어"],["talk","스몰토크"]]}/>
        <Select label="오류" value={issue} onValue={v=>{setIssue(v);setPage(0);}} options={[["","전체 오류"],["any","오류 기록 있음"],...issues.map(s=>[s,s] as [string,string])]}/>
        <Select label="복습 상태" value={status} onValue={v=>{setStatus(v);setPage(0);}} options={[["","전체 상태"],["due","오늘 복습"],["upcoming","복습 예정"],["saved","보관함에 저장"],["new","아직 연습 전"]]}/>
      </div>
    </div>
    <section className="panel list-panel"><div className="list-heading"><h2>검색 결과 <span>{list.length}개</span></h2></div>
      {!list.length&&<Empty>검색 조건에 맞는 문장이 없어요.</Empty>}
      {list.slice(displayed*10,displayed*10+10).map(c=>{const r=data.records[c.id];return <div className="review-row" key={c.id}><div><div className="tag-row"><Pill tone={c.kind==="work"?"green":"purple"}>{topicName(c.topic)}</Pill>{c.source&&<span>{c.source}</span>}{r?.due&&<span>복습 {displayDate(r.due)}</span>}</div><h3 lang="en-NZ">{c.en}</h3><p>{c.ko}</p>{r?.feedback?.issue&&<small>{r.feedback.issue} · {r.feedback.original}</small>}</div><div className="review-controls"><button className="link-btn" onClick={()=>onBookmark(c)}>{r?.saved?"✓ 보관됨":"보관"}</button><button className="btn secondary" onClick={()=>onPick(c)}><PenLine size={15}/> 기록 열기</button></div></div>;})}
      {list.length>10&&<Pagination page={displayed} total={list.length} onPage={setPage}/>}
    </section>
  </>;
}
