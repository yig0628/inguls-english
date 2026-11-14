"use client";

import { useEffect,useState } from "react";
import { Bell,BookOpen,Check,ChevronLeft,Eye,Mic,Volume2 } from "lucide-react";
import { dayKey,weekday,dateObj,addDays,topicName,type Card } from "./content";
import { worksheetCards,recentWorksheetDays,retentionStart } from "./sheet-content";

type Mark="known"|"again";
type Sheet={marks:Record<string,Mark>;completed:boolean;cards?:string[]};
type Sheets=Record<string,Sheet>;
const blank:Sheet={marks:{},completed:false};
const key="ingul-worksheets-v1";
function recentSheets(value:Sheets,today:string):Sheets {
  return Object.fromEntries(Object.entries(value).filter(([date])=>date>=retentionStart(today)&&date<=today));
}
function localSheets():Sheets {
  try {return recentSheets(JSON.parse(localStorage.getItem(key)??"{}"),dayKey());}catch{return {};}
}
function clock(){
  const now=new Date();
  return {day:dayKey(now),hour:Number(new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Seoul",hour:"2-digit",hourCycle:"h23"}).format(now))};
}
function selectCards(day:string,sheets:Sheets){
  if(weekday(day)!==6)return worksheetCards(day);
  const available=Array.from({length:5},(_,i)=>addDays(day,i-5)).flatMap(worksheetCards);
  const lookup=new Map(available.map(c=>[c.id,c]));
  const fixed=sheets[day]?.cards?.map(id=>lookup.get(id)).filter((x):x is Card=>Boolean(x));
  if(fixed?.length===10)return fixed;
  const rank=(c:Card)=>{
    const m=sheets[c.id.slice(10,20)]?.marks[c.id];
    return m==="again"?0:m==="known"?2:1;
  };
  const sorted=[...available].sort((a,b)=>rank(a)-rank(b));
  return [...sorted.filter(c=>c.kind==="work").slice(0,7),...sorted.filter(c=>c.kind==="talk").slice(0,3)];
}
function label(day:string){
  return new Intl.DateTimeFormat("ko-KR",{timeZone:"UTC",month:"long",day:"numeric",weekday:"short"}).format(dateObj(day));
}

export default function Worksheets({onSpeak,onListen}:{onSpeak:(topic:string)=>void;onListen:(s:string)=>void}){
  const [time,setTime]=useState(clock);
  const [sheets,setSheets]=useState(localSheets);
  const [page,setPage]=useState<"today"|"past">("today");
  const [chosen,setChosen]=useState("");
  const [memory,setMemory]=useState(false);
  const [reveal,setReveal]=useState<string[]>([]);
  const [message,setMessage]=useState("");
  useEffect(()=>{
    const tick=()=>setTime(clock());
    const timer=window.setInterval(tick,10000);
    const refresh=()=>{tick();setSheets(localSheets());};
    window.addEventListener("focus",refresh);
    window.addEventListener("storage",refresh);
    return()=>{
      window.clearInterval(timer);
      window.removeEventListener("focus",refresh);
      window.removeEventListener("storage",refresh);
    };
  },[]);
  const {day:today,hour}=time;
  useEffect(()=>{
    const retained=localSheets();
    setSheets(retained);
    try {localStorage.setItem(key,JSON.stringify(retained));}catch{}
  },[today]);
  const todayItem=sheets[today];
  const activeDay=page==="today"?today:chosen;
  const saved=activeDay?sheets[activeDay]??blank:blank;
  const cards=activeDay?selectCards(activeDay,sheets):[];
  const history=[...(todayItem?.completed?[today]:[]),...recentWorksheetDays(today)];
  const done=Object.values(sheets).filter(s=>s.completed).length;
  const allowed=activeDay && activeDay>=retentionStart(today) && cards.length===10 && (activeDay<today||hour>=9);
  function change(item:Sheet){
    const value={...item,cards:weekday(activeDay)===6?cards.map(c=>c.id):undefined};
    const next=recentSheets({...sheets,...localSheets(),[activeDay]:value},today);
    setSheets(next);
    try {localStorage.setItem(key,JSON.stringify(next));setMessage("");}
    catch {setMessage("이 기기의 저장 공간을 확인해 주세요.");}
  }
  function switchPage(next:"today"|"past",date=""){
    setPage(next);setChosen(date);setReveal([]);
  }
  return <>
    <div className="heading"><div><p className="eyebrow"><i/> DAILY WORKSHEET</p><h1>매일 10문장 학습지</h1><p>한국어 뜻을 보고 영어 문장을 떠올려 보세요.</p></div><span className="pill green"><Check size={15}/> 최근 30일 · {done}일 완료</span></div>
    <div className="tabs" aria-label="학습지 보기">
      <button className={page==="today"?"tab active":"tab"} onClick={()=>switchPage("today")}>오늘의 학습지</button>
      <button className={page==="past"?"tab active":"tab"} onClick={()=>switchPage("past")}>지난 학습지 · 30일</button>
    </div>
    {message&&<p className="fine" role="status">{message}</p>}
    {page==="today" && (weekday(today)===0||hour<9||todayItem?.completed) &&
      <div className="callout"><strong>{weekday(today)===0?"일요일은 휴식일이에요.":todayItem?.completed?"오늘 학습지는 마감했어요.":"한국 시간 오전 9시에 열려요."}</strong><p>{weekday(today)===0?"지난 학습지를 다시 읽어볼 수 있어요.":todayItem?.completed?"오늘 문장은 지난 학습지에서 다시 열 수 있어요.":"지난 학습지는 지금도 볼 수 있어요."}</p><button className="link-btn" onClick={()=>switchPage("past",todayItem?.completed?today:"")}>지난 학습지 열기</button></div>}
    {page==="past"&&!chosen&&<section className="panel list-panel">{history.length===0&&<p className="empty">오늘 학습지를 마감하면 여기에 쌓여요.</p>}{history.map(date=><button className="record-row" key={date} onClick={()=>switchPage("past",date)}><div><strong>{label(date)}</strong><small>{weekday(date)===6?"토요일 복습":"실무 7문장 · 스몰토크 3문장"}</small></div><span className={sheets[date]?.completed?"pill green":"pill"}>{sheets[date]?.completed?"완료":"미완료"}</span></button>)}</section>}
    {page==="past"&&chosen&&chosen<retentionStart(today)&&<div className="callout">30일이 지나 보관 기간이 끝났어요. <button className="link-btn" onClick={()=>switchPage("past")}>지난 학습지 목록</button></div>}
    {allowed&&(page==="past"||!todayItem?.completed)&&<section className="panel sheet-panel">
      {page==="past"&&<button className="link-btn" onClick={()=>switchPage("past")}><ChevronLeft size={16}/> 지난 학습지 목록</button>}
      <div className="record-header"><div><h2>{label(activeDay)} · {weekday(activeDay)===6?"토요일 복습":topicName(cards[0].topic)}</h2><p className="fine">실무 영어 7문장 · 스몰토크 3문장</p></div><button className="btn secondary" aria-pressed={memory} onClick={()=>{setMemory(!memory);setReveal([]);}}><Eye size={16}/> {memory?"원문 보기 모드":"암기 모드"}</button></div>
      {cards.map((c,n)=><article className="sheet-row" key={c.id}><span className="sheet-number">{n+1}</span><div>
        <small>{c.kind==="work"?"실무 영어":"스몰토크"}</small>
        <p>{c.ko}</p>
        {(!memory||reveal.includes(c.id))?<><strong lang="en-NZ">{c.en}</strong><p className="fine">{c.phrase} · {c.meaning}</p><p className="fine" lang="en-NZ">{c.example}</p><button className="link-btn" onClick={()=>onListen(c.en)}><Volume2 size={15}/> 듣기</button></>:<button className="link-btn" onClick={()=>setReveal(a=>[...a,c.id])}>영어 정답 보기</button>}
        <div className="toolbar">{([["known","외웠어요"],["again","다시 볼래요"]] as const).map(([mark,name])=><button key={mark} aria-pressed={saved.marks[c.id]===mark} className={saved.marks[c.id]===mark?"btn primary":"btn secondary"} onClick={()=>{const item=saved;change({...item,marks:{...item.marks,[c.id]:mark}});}}>{name}</button>)}</div>
      </div></article>)}
      <div className="card-footer"><button className="btn secondary" onClick={()=>onSpeak(cards[0].topic)}><Mic size={16}/> 이 상황 말하기</button>
      {saved.completed?<span className="pill green">학습 완료</span>:<button className="btn primary" onClick={()=>{change({...saved,completed:true});switchPage("past",activeDay);}}><Check size={16}/> {activeDay===today?"오늘 학습 완료":"이 학습지 완료"}</button>}</div>
    </section>}
    <div className="sheet-note"><Bell size={15}/> 오전 9시 알림은 상단 종 아이콘에서 설정하세요. <BookOpen size={15}/> 학습지는 최근 30일만 표시돼요.</div>
  </>;
}
