import { addDays, dateObj, weekday, type Card, type Scenario } from "./content";

type Brief = [Scenario,string,string,string,string,string,string,string,string];
const briefs: Brief[] = [
["product","T-health Solution at the pharmacy counter","약국 카운터의 T-health Solution","how customers choose their health interests","고객이 관심 건강 분야를 선택하는 방법","demonstrate the finger sensor and body composition analyser","검지 센서와 체성분 분석기를 시연하다","where the kiosk would fit","키오스크를 어디에 설치할지"],
["pitch","a pilot in three pharmacy stores","약국 세 곳에서의 시범 운영","which stores would make a representative sample","어떤 매장이 대표성을 갖는지","track first orders and customer feedback","첫 주문과 고객 의견을 추적하다","who would sponsor the pilot","누가 시범 운영을 후원할지"],
["subscription","the four-week starter option","4주분 첫 구매 옵션","how customers move from the kiosk to the app","고객이 키오스크에서 앱으로 넘어가는 방법","walk through the first order in the app","앱에서 첫 주문 과정을 시연하다","when to introduce the annual plan","연간 구독을 언제 안내할지"],
["commercial","the equipment subscription fee","장비 구독료","what support is included in the fee","구독료에 어떤 지원이 포함되는지","set out the proposed terms in writing","제안 조건을 문서로 정리하다","who approves the equipment budget","누가 장비 예산을 승인하는지"],
["coaching","a brief coaching session for pharmacy staff","약국 직원 대상 짧은 코칭","which part of the demo staff find hardest","직원들이 시연 중 어느 부분을 가장 어려워하는지","practise one customer explanation together","고객 안내 한 가지를 함께 연습하다","when we can check their progress","언제 진행 상황을 점검할 수 있는지"],
["product","the body composition assessment","체성분 분석","why customers need to remove their shoes and socks","고객이 신발과 양말을 벗어야 하는 이유","show customers where to stand on the analyser","분석기 위 어디에 서는지 고객에게 보여주다","how staff should explain the results","직원이 결과를 어떻게 설명할지"],
["pitch","the buyer’s criteria for a successful trial","바이어가 보는 성공적인 시범 운영의 기준","what a useful trial would look like to head office","본사가 어떤 시범 운영을 유용하다고 보는지","agree on a review date before we start","시작 전에 검토 날짜를 합의하다","who will attend the review","누가 검토 회의에 참석할지"],
["subscription","linking assessment results to an app account","분석 결과와 앱 계정 연동","what customers see after signing in","고객이 로그인한 뒤 무엇을 보는지","show the account link during the demo","시연 중 계정 연동 과정을 보여주다","where customers can get help signing in","고객이 로그인 도움을 어디서 받을 수 있는지"],
["commercial","the proposed supplement margin","건강기능식품 마진 제안","how discounts, returns and GST affect the calculation","할인·반품·GST가 계산에 어떤 영향을 주는지","prepare a worked example for both teams","양측을 위해 숫자를 넣은 계산 예시를 준비하다","which sales figures to use","어떤 판매 수치를 기준으로 삼을지"],
["meeting","the follow-up after the buyer meeting","바이어 미팅 이후 후속 조치","which decisions still need sign-off","어떤 결정에 아직 승인이 필요한지","send a summary with named owners and dates","담당자와 날짜를 명시한 요약을 보내다","when we should meet again","언제 다시 만날지"],
["product","the kiosk’s personalised recommendations","키오스크의 맞춤 추천","how results and selected interests shape the suggestions","분석 결과와 선택한 관심 분야가 추천에 어떻게 반영되는지","use a sample screen to explain the recommendations","예시 화면으로 추천 내용을 설명하다","what the customer sees next","다음에 고객이 어떤 화면을 보는지"],
["pitch","the pharmacy team’s workload during the pilot","파일럿 기간 약국팀의 업무 부담","who will introduce the kiosk to customers","누가 고객에게 키오스크를 소개할지","agree on a simple handover for each shift","근무조별로 간단한 인수인계 방식을 합의하다","how much training time is available","교육에 배정할 수 있는 시간이 얼마나 되는지"],
["subscription","the annual subscription conversation","연간 구독 안내","what customers need to know before subscribing","구독 전에 고객이 무엇을 알아야 하는지","explain the options after the first purchase","첫 구매 후 선택 가능한 옵션을 설명하다","when customers would find a reminder helpful","고객에게 언제 알림이 도움이 될지"],
["commercial","a regional rollout plan","지역별 도입 계획","which region should follow the pilot","시범 운영 이후 어느 지역에 먼저 도입할지","plan installation and training by region","지역별로 설치와 교육을 계획하다","what needs to be ready before expansion","확대 전에 무엇을 갖춰야 할지"],
["staff","backup cover for a busy launch day","바쁜 출시일의 대체 인력 배치","which shifts need an extra person","어느 근무조에 인력이 더 필요한지","arrange cover for the busiest hours","가장 바쁜 시간에 대체 인력을 배정하다","who can take over urgent requests","누가 긴급 요청을 대신 맡을 수 있는지"],
["product","the start-to-finish product demonstration","제품 시연의 전체 과정","which questions customers ask most often","고객이 어떤 질문을 가장 자주 하는지","rehearse the full demonstration with a colleague","동료와 전체 시연을 예행연습하다","how to explain where results are stored","결과가 어디에 저장되는지 어떻게 설명할지"],
["pitch","a buyer’s concern about floor space","설치 면적에 대한 바이어의 우려","how much room each pharmacy can spare","각 약국에서 얼마나 공간을 낼 수 있는지","check the dimensions against a sample store plan","샘플 매장 도면과 장비 치수를 대조하다","who can sign off on the proposed location","누가 제안 위치를 승인할 수 있는지"],
["subscription","conversion from a first purchase to repeat orders","첫 구매에서 재구매로의 전환","where customers drop out of the purchase journey","구매 과정 중 고객이 어디에서 이탈하는지","compare first-order and repeat-purchase figures","첫 주문과 재구매 수치를 비교하다","which step to improve first","어느 단계를 먼저 개선할지"],
["commercial","a pilot budget for head office","본사에 제안할 파일럿 예산","which costs belong in the budget","어떤 비용을 예산에 포함할지","list installation, training and support costs","설치·교육·지원 비용을 나열하다","whether to phase the spending","지출을 단계적으로 나눌지"],
["customer","a customer who cannot find their results","결과를 찾지 못하는 고객 응대","whether the assessment is linked to the right account","분석 결과가 올바른 계정에 연동됐는지","check the account details with the customer","고객과 계정 정보를 확인하다","when we can provide an update","언제 진행 상황을 안내할 수 있는지"],
["pitch","a short pitch for the national buying team","전국 구매팀을 위한 짧은 제안","what would make the proposal worth exploring","어떤 조건이면 제안을 검토할 가치가 있는지","outline the customer journey before discussing terms","조건을 논의하기 전에 고객 이용 흐름을 설명하다","who should join the next discussion","누가 다음 논의에 참여할지"],
["quality","a consistent process for setting up each kiosk","키오스크 설치를 위한 일관된 절차","which checks must happen before launch","운영 시작 전에 어떤 점검이 필요한지","record the setup checks for each location","설치 장소별 점검 사항을 기록하다","who signs off at store level","매장 단위에서 누가 승인하는지"],
["dispatch","the first batch of orders after launch","출시 후 첫 주문 물량","which orders have the tightest cut-off","어떤 주문의 출고 마감이 가장 촉박한지","share the dispatch plan with warehouse staff","창고 직원과 출고 계획을 공유하다","when the courier can collect the orders","택배사가 언제 주문 물량을 수거할 수 있는지"],
["budget","a supplier’s revised quote","공급업체의 수정 견적","whether delivery and training are included","배송과 교육이 견적에 포함돼 있는지","compare the new quote with our original allowance","새 견적과 당초 반영한 예산을 비교하다","which assumptions need to be checked","어떤 전제를 확인해야 하는지"],
];

const talk: [string,string,string,string][] = [
["a walk by the water","물가 산책","the waterfront?","워터프런트"],
["a quiet coffee","느긋하게 커피 한 잔","the café near the office?","사무실 근처 카페"],
["lunch out","외식","the noodle place down the road?","길 건너편 국숫집"],
["a drive out of town","교외 드라이브","the lookout above the coast?","해안 위 전망대"],
["a market visit","마켓 구경","the Hobsonville market?","홉슨빌 마켓"],
["a bike ride","자전거 타기","the new cycle path?","새 자전거 길"],
["a family barbecue","가족 바비큐","the park with the outdoor grills?","야외 그릴이 있는 공원"],
["a bit of gardening","가벼운 정원 손질","the garden centre nearby?","근처 가든센터"],
["a swim","수영","the local pool?","동네 수영장"],
["a run before work","출근 전 달리기","the trail behind the office?","사무실 뒤 산책로"],
["a simple dinner at home","집에서 간단한 저녁","the bakery on the corner?","모퉁이 빵집"],
["a catch-up with friends","친구들과 근황 나누기","the coffee cart by the station?","역 옆 커피 카트"],
["a movie night","저녁에 영화 보기","the cinema near the shops?","상가 근처 영화관"],
["a trip to the library","도서관 나들이","the library in town?","시내 도서관"],
["a weekend hike","주말 하이킹","the track by the reservoir?","저수지 옆 산책로"],
["breakfast with the family","가족과 아침 식사","the brunch place by the water?","물가 브런치 가게"],
["a walk with the dog","반려견과 산책","the dog park across the road?","길 건너 반려견 공원"],
["a day at the beach","해변에서 하루 보내기","the beach on the north side?","북쪽 해변"],
["a visit to a museum","박물관 구경","the maritime museum?","해양 박물관"],
["some time to read","느긋하게 책 읽기","the second-hand bookshop?","중고 서점"],
["a game of tennis","테니스 한 게임","the new courts near the school?","학교 근처 새 테니스 코트"],
["a day pottering around at home","집에서 소소한 일 하며 하루 보내기","the weekend food stalls?","주말 음식 노점"],
["a look around the shops","가게들 구경하기","the gift shop next to the chemist?","약국 옆 선물 가게"],
["a walk after dinner","저녁 식사 후 산책","the boardwalk by the marina?","마리나 옆 데크 길"],
];

export function worksheetCards(day: string): Card[] {
  const date=weekday(day);
  if(date<1||date>5)return [];
  const delta=Math.floor((dateObj(day).getTime()-Date.UTC(2026,10,16))/86400000);
  const index=((Math.floor(delta/7)*5+date-1)%briefs.length+briefs.length)%briefs.length;
  const [topic,subject,subjectKo,question,questionKo,action,actionKo,decision,decisionKo]=briefs[index];
  const cap=(s:string)=>s[0].toUpperCase()+s.slice(1);
  const [activity,activityKo,place,placeKo]=talk[index];
  const entries: [string,string,string,string,string][]=[
    [`I’d like to start by talking about ${subject}.`,`먼저 ‘${subjectKo}’부터 이야기하고 싶습니다.`,"start by","~부터 시작하다","Let’s start by reviewing the agenda."],
    [`Could you walk me through ${question}?`,`‘${questionKo}’에 대해 차근차근 설명해 주시겠어요?`,"walk me through","순서대로 설명하다","Could you walk me through the set-up?"],
    [`Before we move on, let’s clarify ${decision}.`,`넘어가기 전에 ‘${decisionKo}’부터 명확히 하죠.`,"before we move on","다음으로 넘어가기 전에","Before we move on, does anyone have a question?"],
    [`The next step is to ${action}.`,`다음 단계는 ‘${actionKo.replace(/다$/,"는 것")}’입니다.`,"the next step is to","다음 단계는 ~이다","The next step is to agree on a date."],
    [`Could we set aside ten minutes to cover ${subject}?`,`‘${subjectKo}’에 대해 10분 정도 이야기할 수 있을까요?`,"set aside","시간을 따로 내다","I’ll set aside half an hour for the review."],
    [`I’ll follow up by email once we’ve confirmed ${decision}.`,`‘${decisionKo}’에 대한 답을 확인하는 대로 이메일 드릴게요.`,"follow up by email","이메일로 후속 연락하다","I’ll follow up by email later today."],
    [`${cap(question)} is something we should cover in the briefing.`,`브리핑에서는 ‘${questionKo}’에 대해 설명해야 합니다.`,"cover in the briefing","브리핑에서 다루다","We can cover the new process in the briefing."],
    [`I’m thinking of ${activity.startsWith("some time")?"setting aside ":"making time for "}${activity} this weekend.`,`이번 주말엔 ‘${activityKo}’ 시간을 좀 내볼까 해요.`,"make time for","~할 시간을 내다","I’m trying to make time for a walk at lunch."],
    [`Have you been to ${place}`,`‘${placeKo}’에 가보셨어요?`,"have you been to","~에 가본 적 있는지 묻다","Have you been to the market by the station?"],
    [`If the weather holds, I might make time for ${activity}.`,`날씨가 계속 괜찮으면 ‘${activityKo}’ 시간을 좀 내볼까 해요.`,"if the weather holds","날씨가 계속 괜찮으면","If the weather holds, we might eat outside."],
  ];
  return entries.map(([en,ko,phrase,meaning,example],n)=>({
    id:`worksheet-${day}-${n}`,topic:n<7?topic:"smalltalk",kind:n<7?"work":"talk",en,ko,phrase,meaning,example,
  }));
}

export const worksheetLaunch="2026-11-14";
export const retentionStart = (day:string) => addDays(day,-29);
export function recentWorksheetDays(today:string) {
  return Array.from({length:29},(_,i)=>addDays(today,-1-i)).filter(day=>day>=worksheetLaunch&&weekday(day)!==0);
}
