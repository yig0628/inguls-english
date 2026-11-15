import { useEffect, useRef, useState } from "react";
import { Bell, Flame, Gift, Download } from "lucide-react";
import { addDays, allCards, dayKey, topicName, weekday } from "./content";
import { isComplete, type Data } from "./learning";
import bonus from "./reward-sentences.json";
import { DeviceReminders } from "./push";

const price=1000;
const reward="business-100";
const weeklyMission=150;
export function progress(data:Data,today:string){
  const completed=new Set<string>();
  for(const [key,session] of Object.entries(data.sessions)){
    const day=key.split("/")[0];
    if(day<=today && weekday(day)!==0 && isComplete(session))completed.add(day);
  }
  const days=[...completed].sort();
  const mondays=new Set(days.map(day=>addDays(day,-((weekday(day)+6)%7))));
  const wins=[...mondays].filter(monday=>[0,1,2,3,4].filter(n=>completed.has(addDays(monday,n))).length>=3 && completed.has(addDays(monday,5)));
  const active=(day:string)=>weekday(day)!==0;
  let streak=0;
  for(let day=completed.has(today)||!active(today)?today:addDays(today,-1);;day=addDays(day,-1)){
    if(!active(day))continue;
    if(!completed.has(day))break;
    streak++;
  }
  let best=0,run=0,previous="";
  for(const day of days){
    const prior=addDays(day,weekday(day)===1?-2:-1);
    run=previous===prior?run+1:1;best=Math.max(best,run);previous=day;
  }
  const monday=addDays(today,-((weekday(today)+6)%7));
  const total=days.length*100+wins.length*weeklyMission;
  const owned=Boolean(data.rewards?.includes(reward));
  return {streak,best,owned,total,balance:Math.max(0,total-(owned?price:0)),week:[0,1,2,3,4].filter(n=>completed.has(addDays(monday,n))).length,sat:completed.has(addDays(monday,5)),weeklyWon:wins.includes(monday)};
}

function download(file:string,text:string,type:string){
  const url=URL.createObjectURL(new Blob([text],{type}));
  const a=document.createElement("a");a.href=url;a.download=file;a.click();
  window.setTimeout(()=>URL.revokeObjectURL(url),2000);
}
export function Rewards({data,today,redeem}:{data:Data;today:string;redeem:()=>void}){
  const p=progress(data,today);
  return <section className="panel motivation-panel" aria-labelledby="rewards-heading">
    <div className="record-header"><h2 id="rewards-heading"><Flame size={19}/> 주간 챌린지</h2><strong>{p.balance.toLocaleString()}P</strong></div>
    <div className="challenge-grid">
      <div><strong>연속 {p.streak}일 · 최고 {p.best}일</strong><p>10문장, 회상 퀴즈, 역할극 교정을 완료하면 하루 +100P. 일요일은 연속 기록에서 쉬어가요.</p></div>
      <div><strong>평일 {Math.min(p.week,3)}/3 · 토요일 {p.sat?"완료":"예정"}{p.weeklyWon?" · +150P 획득":""}</strong><p>이번 주에 평일 3회와 토요일 복습 1세트를 완료하면 +{weeklyMission}P.</p><progress max={4} value={Math.min(p.week,3)+Number(p.sat)} aria-label="주간 챌린지 진행률"/></div>
    </div>
    <div className="reward-row"><Gift size={21}/><div><strong>비즈니스 영어 예시문 100선</strong><p>제품 시연, 본사 미팅, 협상과 실무 표현 · 영어와 한국어 CSV</p></div>
    {p.owned?<button className="btn primary" onClick={()=>{
      const rows=[["상황","영어","한국어"],...allCards.map(c=>[topicName(c.topic),c.en,c.ko]),...bonus.map(([topic,en,ko])=>[topicName(topic),en,ko])];
      const csv=rows.map(r=>r.map(s=>'"'+s.replaceAll('"','""')+'"').join(",")).join("\r\n");
      download("business-english-100.csv","\uFEFF"+csv,"text/csv;charset=utf-8");
    }}><Download size={16}/> 다운로드</button>:<button className="btn secondary" disabled={p.balance<price} onClick={redeem}>{p.balance<price?`${(price-p.balance).toLocaleString()}P 더 필요`:"1,000P로 교환"}</button>}</div>
  </section>;
}

const hour=()=>Number(new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Seoul",hour:"2-digit",hourCycle:"h23"}).format(new Date()));
export function Reminder({completed,onOpen}:{completed:boolean;onOpen:()=>void}){
  const enabledKey="ingul-reminder";
  const seenKey="ingul-reminder-seen";
  const [enabled,setEnabled]=useState(()=>localStorage.getItem(enabledKey)!=="off");
  const [open,setOpen]=useState(false);
  const [due,setDue]=useState(false);
  const audio=useRef<AudioContext|null>(null);
  function ring(){
    const context=audio.current;
    if(context?.state!=="running")return;
    [660,880].forEach((frequency,i)=>{
      const tone=context.createOscillator(), volume=context.createGain(), at=context.currentTime+i*.18;
      tone.frequency.value=frequency;volume.gain.setValueAtTime(.07,at);volume.gain.exponentialRampToValueAtTime(.001,at+.16);
      tone.connect(volume).connect(context.destination);tone.start(at);tone.stop(at+.17);
    });
  }
  useEffect(()=>{
    const check=()=>{
      const day=dayKey();
      const next=enabled && weekday(day)!==0 && hour()>=9 && !completed && localStorage.getItem(seenKey)!==day;
      setDue(next);
      if(next && document.visibilityState==="visible" && audio.current?.state==="running"){
        const sounded=localStorage.getItem("ingul-reminder-sounded");
        if(sounded!==day){ring();localStorage.setItem("ingul-reminder-sounded",day);}
      }
    };
    check();const interval=window.setInterval(check,10000);
    document.addEventListener("visibilitychange",check);
    return ()=>{window.clearInterval(interval);document.removeEventListener("visibilitychange",check);};
  },[enabled,completed]);
  useEffect(()=>()=>{void audio.current?.close().catch(()=>{});},[]);
  function calendar(){
    const today=dayKey(),candidate=hour()<9?today:addDays(today,1);
    const first=weekday(candidate)===0?addDays(candidate,1):candidate, compact=first.replaceAll("-","");
    download("INGUL-ENGLISH-09.ics",[
      "BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//INGUL ENGLISH//Reminder//KO","CALSCALE:GREGORIAN",
      "BEGIN:VEVENT","UID:ingul-english-daily-0900@inguls-english", "DTSTAMP:"+new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,""),
      "DTSTART:"+compact+"T000000Z",
      "RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR,SA","DURATION:PT10M","SUMMARY:INGUL’S English 10분 연습",
      "BEGIN:VALARM","TRIGGER:PT0M","ACTION:DISPLAY","DESCRIPTION:INGUL’S English 학습 알림","END:VALARM","END:VEVENT","END:VCALENDAR","",
    ].join("\r\n"),"text/calendar;charset=utf-8");
  }
  return <div className="reminder">
    <button className="icon-btn settings-btn reminder-button" type="button" onClick={()=>setOpen(!open)} aria-expanded={open} aria-label={due?"9시 학습 알림 확인":"학습 알림 설정"}><Bell size={18}/>{due&&<i/>}</button>
    {open&&<div className="panel reminder-panel"><strong>월~토 오전 9시 · 한국 시간</strong>
      {due&&<p>오늘의 10문장 학습지를 열어 보세요.</p>}
      <label><input type="checkbox" checked={enabled} onChange={e=>{setEnabled(e.target.checked);localStorage.setItem(enabledKey,e.target.checked?"on":"off");}}/> 앱 상단 알림</label>
      <button className="link-btn" onClick={async()=>{try{audio.current??=new AudioContext();await audio.current.resume();ring();}catch{}}}>앱을 열어 둔 동안 알림음 켜기</button>
      <DeviceReminders/>
      <button className="btn secondary" type="button" onClick={calendar}>휴대폰 캘린더 알림 추가</button>
      {due&&<button className="btn primary" onClick={()=>{localStorage.setItem(seenKey,dayKey());setDue(false);setOpen(false);onOpen();}}>확인 · 오늘의 학습지</button>}
    </div>}
  </div>;
}
