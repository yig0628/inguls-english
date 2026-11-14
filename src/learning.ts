import { addDays, allCards, archiveCards, cardMap, dailyCards, dayKey, defaultProfile, talkCards, weekday, type Card, type Profile } from "./content";

export type Feedback = { grammar: string; natural: string; logic: string; nz: string; ielts: string; followup: string; improved: string; issue: string; original: string; score: number };
export type Attempt = { day: string; at?: number; score: number; issue: string };
export type RecordItem = {
  card: Card; answer: string; feedback?: Feedback; method?: "criteria" | "ai"; score: number;
  day: string; due: string; step: number; saved: boolean; history: Attempt[]; updated: number;
};
export type Session = {
  cards: Card[]; studied: string[]; recalled: Record<string, boolean>; corrected: string[];
  roleplay: boolean; updated: number;
};
export type Data = {
  rewards?: string[];
  schema: 1; profile: Profile; profileUpdated: number; records: Record<string, RecordItem>;
  sessions: Record<string, Session>; imports: Record<string, Card>;
};

export const clean = (s: string) => s.toLowerCase().replace(/[’‘]/g, "'").replace(/[^\p{L}\p{N}' ]/gu," ").replace(/\s+/g," ").trim();
export function initialData(): Data {
  return {schema:1,profile:{...defaultProfile},profileUpdated:0,sessions:{},imports:{},records:{}};
}

export function mergeData(a: Data, b: Data): Data {
  const latest = <T extends {updated: number}>(left: Record<string,T>,right: Record<string,T>) => {
    const result = {...left};
    for (const [id,item] of Object.entries(right)) if (!result[id] || item.updated >= result[id].updated) result[id] = item;
    return result;
  };
  const sessions = latest(a.sessions,b.sessions);
  for (const [key, right] of Object.entries(b.sessions)) {
    const left = a.sessions[key];
    if (!left || left.cards.map(c=>c.id).join() !== right.cards.map(c=>c.id).join()) continue;
    const newer = sessions[key], older = newer === left ? right : left;
    sessions[key] = {...newer, studied:[...new Set([...left.studied,...right.studied])],
      recalled:{...older.recalled,...newer.recalled}, corrected:[...new Set([...left.corrected,...right.corrected])],
      roleplay:left.roleplay || right.roleplay };
  }
  return { schema:1,rewards:[...new Set([...(a.rewards??[]),...(b.rewards??[])])],profile: a.profileUpdated > b.profileUpdated ? a.profile : b.profile,
    profileUpdated:Math.max(a.profileUpdated,b.profileUpdated),records:latest(a.records,b.records),sessions,imports:{...a.imports,...b.imports} };
}
export function makeSession(cards: Card[]): Session {
  return { cards,studied:[],recalled:{},corrected:[],roleplay:false,updated:Date.now() };
}
export function getScenario(cards: Card[], profile: Profile) {
  const topic = cards.find(c=>c.kind==="work")?.topic;
  return topic && topic !== "smalltalk" ? topic : profile.scenario === "auto" ? "dispatch" : profile.scenario;
}
const gaps = [1,3,7,14,30];
export function schedule(score: number, previous?: RecordItem, today = dayKey()) {
  const previousStep = previous?.step ?? -1;
  const isNewDay = previous?.day !== today;
  const progressed = previousStep + Number(isNewDay) + Number(score === 4 && (!previous || (!isNewDay && previous.score < 4)));
  const step = score < 3 ? 0 : Math.min(gaps.length - 1, Math.max(0, progressed));
  let due = addDays(today,gaps[step]);
  if (weekday(due) === 0) due = addDays(due,1);
  return {day:today,due,step};
}
export const isComplete = (s?: Session) => Boolean(s && s.cards.length === 10 && s.studied.length === 10 &&
  Object.keys(s.recalled).length === 10 && s.corrected.length > 0 && s.roleplay);

export function reviewQueue(data: Data, today: string) {
  return Object.values(data.records).filter(r=>r.due && r.score > 0 && r.due <= today)
    .sort((a,b)=>a.score-b.score || countIssue(data,b.feedback?.issue)-countIssue(data,a.feedback?.issue) || a.due.localeCompare(b.due) || a.card.en.localeCompare(b.card.en));
}
export function countIssue(data: Data, issue?: string) {
  return issue ? Object.values(data.records).reduce((total,r)=>total+r.history.filter(a=>a.issue===issue).length,0) : 0;
}

export function weeklyCards(data: Data, today: string) {
  const distance = (weekday(today) + 6) % 7;
  const monday = addDays(today,-distance);
  const recent = [...new Map(Object.entries(data.sessions).filter(([key])=>key >= monday && key < today && !key.includes("/review-"))
    .flatMap(([,session])=>session.cards.filter(c=>session.studied.includes(c.id) || c.id in session.recalled || session.corrected.includes(c.id)))
    .map(c=>[c.id,c])).values()];
  const due = reviewQueue(data,today).map(r=>r.card);
  const priority = (a: Card,b: Card) => Number(Boolean(data.records[b.id]?.due && data.records[b.id].due <= today))
    - Number(Boolean(data.records[a.id]?.due && data.records[a.id].due <= today))
    || (data.records[a.id]?.score || 3)-(data.records[b.id]?.score || 3);
  const actual = [...new Map([...recent,...due].map(c=>[c.id,c])).values()].sort(priority);
  const plan = Array.from({length:5},(_,n)=>dailyCards(addDays(monday,n), {...data.profile,scenario:"auto"})).flat();
  const eligible = [...actual,...plan,...archiveCards,...allCards,...talkCards];
  const unique = [...new Map(eligible.slice().reverse().map(c=>[c.id,c])).values()].reverse();
  const work = unique.filter(c=>c.kind==="work").slice(0,21);
  const talk = unique.filter(c=>c.kind==="talk").slice(0,9);
  return Array.from({length:3},(_,batch)=>[...work.slice(batch*7,batch*7+7),...talk.slice(batch*3,batch*3+3)]);
}
export function knownCards(data: Data) {
  return Object.values({...cardMap,...data.imports,...Object.fromEntries(Object.entries(data.records).map(([id,r])=>[id,r.card]))});
}

const corrections: [RegExp, string, string][] = [
  [/\bdispath\b/gi,"dispatch","철자 · dispatch"],
  [/\b(today|yesterday) morning at the morning\b/gi,"$1 morning","시간 표현"],
  [/\bI am agree\b/gi,"I agree","동사 형태 · agree"],
  [/\bdiscuss about\b/gi,"discuss","동사 뒤 전치사"],
  [/\bexplain me\b/gi,"explain to me","동사 뒤 전치사"],
  [/\bI will to\b/gi,"I will","조동사 뒤 동사원형"],
  [/\bwill prioritised\b/gi,"will prioritise","조동사 뒤 동사원형"],
  [/\bwill (dispatch|check)ed\b/gi,"will $1","조동사 뒤 동사원형"],
  [/\btwo (staff|employee|order|person)\b/gi,"two $1","수·복수형"],
  [/\blook forward to (see|hear|meet)\b/gi,"look forward to $1ing","전치사 뒤 동명사"],
  [/\bpeoples\b/gi,"people","수·복수형"],
  [/\bmake a decision about to\b/gi,"decide to","동사 구조"],
];
export function criteriaFeedback(answer: string, card: Card, inRoleplay = false): Feedback {
  let improved = answer.trim().replace(/([.!?])([A-Z])/g,"$1 $2").replace(/^i\b/,"I");
  let issue = "", original = "";
  for (const [rule, replacement, label] of corrections) {
    const match = improved.match(rule)?.[0];
    if (!match) continue;
    if (!issue) { issue = label; original = match; }
    improved = improved.replace(rule,replacement);
  }
  const plurals: Record<string,string> = {staff:"staff members",employee:"employees",order:"orders",person:"people"};
  improved = improved.replace(/\btwo (staff|employee|order|person)\b(?! members)/gi,(_,word:string)=>"two "+plurals[word.toLowerCase()]);
  const nzSpelling = /\b(prioritize|prioritizing|organize|organization|labor|favorite)\b/i;
  const isTalk = card.kind==="talk";
  const count = clean(answer).split(" ").length;
  const connectors = /\b(first|then|because|so that|if|before|after|once|but|while)\b/i.test(answer);
  const actionWords = clean(card.phrase).split(" ").filter(w=>w.length>3);
  const usesTarget = actionWords.some(w=>clean(answer).includes(w));
  const concise = count >= (inRoleplay ? 16 : isTalk ? 4 : 6);
  const businessFocus = {
    product: "관심 분야 선택 → 검지 맥파·맨발 체성분 측정 → 결과와 맞춤 추천 순으로 설명해 보세요.",
    pitch: "약국 구역에 설치하는 이유, 파일럿에서 확인할 지표, 본사와 합의할 다음 단계를 연결해 보세요.",
    subscription: "로그인과 앱 연동을 설명하고, 첫 구매 4주분과 12개월 구독 전환 목표를 구분해 보세요.",
    commercial: "장비 구독료와 제안 중인 판매 마진 50%를 각각 설명하고, 마진 계산 기준과 확대 조건을 확인해 보세요.",
  }[card.topic as "product"|"pitch"|"subscription"|"commercial"];
  if (!issue && !concise) { issue = "답변 구체화"; original = answer.trim(); }
  return {
    grammar: issue && issue !== "답변 구체화" ? `‘${original}’에서 ${issue}을(를) 점검하세요.` : "자동 점검에서 자주 나오는 문법 오류는 발견되지 않았어요. 주어와 동사 형태를 한 번 더 읽어보세요.",
    natural: usesTarget ? `‘${card.phrase}’ 표현을 답변에 활용했어요. 전체 문장을 소리 내어 이어 읽어 보세요.` : `‘${card.phrase}’를 상황에 맞게 써 보세요. 예문: ${card.example}`,
    logic: inRoleplay && businessFocus ? businessFocus : inRoleplay ? (connectors ? "연결어를 사용했어요. 조치의 담당자, 확인 시점, 지연 시 대안이 드러나는지 확인하세요." : "먼저 할 조치, 그 이유, 지연 시 대안을 순서대로 설명해 보세요.") :
      isTalk ? "동료의 질문이나 관심사에 한 마디 덧붙여 자연스럽게 대화를 이어 보세요." :
      concise ? "요청이나 조치의 주체가 분명한지 확인하고, 필요한 경우 완료 시점을 덧붙여 보세요." : "누가 무엇을 언제 하는지 한 문장으로 완성해 보세요.",
    nz: nzSpelling.test(answer) ? "업무 메모에서는 뉴질랜드식 철자(prioritise, organise, labour, favourite)를 일관되게 써 보세요." :
      isTalk ? "가벼운 질문이나 짧은 맞장구가 동료와의 대화에 잘 어울려요." : "Could you …?처럼 협조를 구하거나 I’ll …로 맡을 조치를 명확히 하는 표현을 연습하세요.",
    ielts: inRoleplay ? "결정과 근거를 연결하고, 구체적인 예를 넣어 30초 답변으로 확장해 보세요. 이 피드백은 텍스트 기준이에요." :
      "핵심 표현을 비슷한 말로 바꿔 말한 뒤 이유를 덧붙여 보세요. 이 피드백은 텍스트 기준이에요.",
    followup: inRoleplay && businessFocus ? "바이어에게 결정을 요청하면서, 다음에 확인할 항목 한 가지와 미팅 일정을 붙여 보세요." : isTalk ? "상대방의 답에 이어 가볍게 질문을 하나 더 해 보세요." : "답변을 다시 말하면서 담당자와 다음 확인 시점을 넣어 보세요.",
    improved: improved === answer.trim() && !concise ? card.en : improved, issue, original,
    score: !concise ? 1 : issue ? 2 : 3,
  };
}
