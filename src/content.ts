import { businessRows, businessScenarios } from "./business";

export const scenarios = [
  ...businessScenarios,
  { id: "dispatch", name: "주문 출고", image: "operations", en: "Order dispatch", brief: "오늘 3시 택배 픽업을 앞두고 주문이 밀렸습니다. 출고 담당자와 우선순위와 대안을 정하세요.", opening: "We still have a large number of orders to dispatch, and the courier is coming at three. What’s your plan?", probe: "When will you check progress, and who will let customers know if an order is delayed?" },
  { id: "staff", name: "인력 공백", image: "coaching", en: "Staff coverage", brief: "직원 두 명이 병가를 냈습니다. 남은 인원으로 필수 업무를 커버하고 리스크를 보고하세요.", opening: "Two team members have called in sick, and we still have a large number of orders to dispatch today. What's your plan?", probe: "How would you keep the workload manageable for the rest of the team?" },
  { id: "coaching", name: "팀 코칭", image: "coaching", en: "Team coaching", brief: "포장 단계에서 같은 실수가 반복됩니다. 팀원에게 구체적으로 피드백하고 다음 점검을 합의하세요.", opening: "I noticed a few orders went out with the wrong labels. How would you talk to the person who packed them?", probe: "How will you check whether the new process is working?" },
  { id: "budget", name: "예산·공급업체", image: "strategy", en: "Budget & suppliers", brief: "공급업체 견적이 예산을 초과했습니다. 대안을 비교하고 승인 요청을 준비하세요.", opening: "This supplier’s quote puts us over budget. What options should we look at?", probe: "Which trade-off would you bring to the person approving the spend?" },
  { id: "meeting", name: "회의·업무 조율", image: "meeting", en: "Meetings & priorities", brief: "여러 팀의 일정이 겹칩니다. 결정할 항목을 먼저 정하고 담당자와 기한을 합의하세요.", opening: "We have two teams asking for the same slot. Can you help us agree on priorities?", probe: "Who owns the next step, and when should we expect an update?" },
  { id: "customer", name: "고객 응대", image: "subscription", en: "Customer updates", brief: "주문이 지연된 고객에게 현재 상황과 다음 연락 시점을 안내하세요.", opening: "A customer says their order hasn’t arrived. What would you tell them today?", probe: "What can you commit to while you’re still waiting to hear from the courier?" },
  { id: "quality", name: "재고·품질 관리", image: "operations", en: "Stock & quality", brief: "라벨 정보와 재고 기록이 다른 제품을 발견했습니다. 해당 재고를 보류하고 확인 절차를 안내하세요.", opening: "The batch number on this carton doesn’t match our stock record. What should we do first?", probe: "What would you document before anyone releases the stock?" },
] as const;

export type Scenario = typeof scenarios[number]["id"];
export type Level = "B1" | "B2" | "C1";
export type Profile = { scenario: Scenario | "auto"; level: Level; seniority: string; role: string };
export type Card = { id: string; topic: Scenario | "smalltalk"; en: string; ko: string; phrase: string; meaning: string; example: string; kind: "work" | "talk"; source?: string };
type Row = [string, string, string, string, string, string, string];

const work: Record<Scenario, Row[]> = {
...businessRows,
dispatch: [
["We need to dispatch all orders by 3 p.m.","오후 3시까지 모든 주문을 출고해야 해요.","dispatch","상품을 발송하다","Can we dispatch the urgent orders first?","All orders need to go out by three.","We need to have every order dispatched ahead of the three o’clock cut-off."],
["Let’s prioritise the time-sensitive orders and put the rest on hold.","시간이 촉박한 주문을 먼저 처리하고 나머지는 잠시 보류합시다.","put on hold","잠시 보류하다","We can put the stocktake on hold until tomorrow.","Let’s do the urgent orders first and leave the rest for later.","Let’s prioritise time-sensitive orders and defer the remaining shipments until capacity frees up."],
["Could you confirm the pick-up window with the courier?","택배사에 픽업 가능 시간대를 확인해 주시겠어요?","pick-up window","픽업 가능 시간대","The courier confirmed a two-hour pick-up window.","Could you check what time the courier is coming?","Could you confirm the courier’s collection window so we can plan the final packing run?"],
["I’ll move one person from admin to help with packing.","사무 인력 한 명을 포장 지원에 투입할게요.","help with packing","포장 업무를 돕다","Mia can help with packing after lunch.","I’ll ask someone from admin to help pack.","I’ll temporarily reassign an admin team member to relieve the bottleneck in packing."],
["I’ll flag any orders that are likely to miss the cut-off.","마감 시간에 맞추기 어려운 주문은 미리 알릴게요.","miss the cut-off","마감 시간을 넘기다","Let me know if we might miss the courier cut-off.","I’ll tell you which orders might go out late.","I’ll flag any shipments at risk of missing the cut-off as soon as the risk becomes clear."],
["I’ll make sure everything is dispatched on time.","모든 주문이 제때 출고되도록 챙길게요.","on time","예정된 시간에","We closed the last batch on time.","I’ll make sure all the orders go out on time.","I’ll oversee the final dispatch to make sure we meet the agreed deadline."],
["If we’re still behind at two, I’ll arrange a second pick-up.","2시에도 작업이 밀려 있으면 추가 픽업을 잡을게요.","be behind","작업이 밀려 있다","We’re about twenty minutes behind.","If we are still late at two, I’ll book another pick-up.","If we’re still behind schedule at two, I’ll arrange an additional collection and update the team."],
],
staff: [
["Two team members have called in sick, so I’m arranging cover for the morning shift.","팀원 두 명이 병가를 냈으니 오전 근무를 대신할 인력을 조율하고 있어요.","arrange cover","대체 근무 인력을 마련하다","Can we arrange cover for Friday afternoon?","Two people are off sick, so I’m finding someone to cover the morning shift.","With two team members off sick, I’m arranging cover to keep the morning shift running."],
["We may need to redistribute a few responsibilities, but I'll make sure the workload stays manageable.","일부 업무를 재배분해야 할 수 있지만, 업무량이 감당할 만한 수준으로 유지되도록 할게요.","redistribute","재배분하다","Let’s redistribute the work before lunch.","We may need to share out some tasks so no one has too much to do.","I’ll redistribute responsibilities based on capacity so the additional workload remains manageable."],
["Let's focus on the time-sensitive orders and put the less urgent tasks on hold for now.","시간이 촉박한 주문에 집중하고 덜 급한 업무는 당분간 보류합시다.","for now","우선은, 당분간","Let’s keep the current roster for now.","Let’s do the urgent orders first and leave the rest for now.","Let’s focus on orders with firm deadlines and defer lower-priority tasks until cover is in place."],
["I’ll check who has capacity before I move any tasks around.","업무를 재배치하기 전에 여유가 있는 사람이 누구인지 확인할게요.","have capacity","업무를 더 맡을 여유가 있다","Do you have capacity to take one more order?","I’ll check who can take on more work first.","I’ll check each person’s capacity before reallocating any duties."],
["I’ll give everyone a clear handover before the afternoon shift starts.","오후 근무가 시작되기 전에 모두에게 인수인계를 명확히 할게요.","handover","인수인계","I’ll send you a quick handover at noon.","I’ll explain what needs doing before the next shift starts.","I’ll brief the afternoon shift on outstanding tasks, owners and deadlines during the handover."],
["If the workload becomes unmanageable, I’ll raise it with you before it affects our service levels.","업무량을 감당하기 어려워지면 서비스 수준에 영향이 가기 전에 말씀드릴게요.","raise it with","~에게 문제를 알리다","I’ll raise it with the operations lead.","I’ll tell you early if we have more work than we can handle.","I’ll escalate any capacity issue early enough to protect our service levels."],
["Once the immediate pressure has eased, I’ll review the cover plan with the team.","급한 상황이 진정되면 팀과 함께 대체 근무 계획을 검토할게요.","ease","압박이 완화되다","The pressure eased once the order backlog cleared.","When things calm down, I’ll review the plan with the team.","Once the immediate pressure has eased, I’ll review the cover arrangements and agree on any changes."],
],
coaching: [
["Could you walk me through how you checked the order?","주문을 어떻게 확인했는지 순서대로 설명해 주시겠어요?","walk me through","순서대로 설명하다","Could you walk me through the packing checklist?","Could you show me how you checked the order?","Could you walk me through your checks so we can see where the discrepancy arose?"],
["I noticed the second label came from a different batch.","두 번째 라벨이 다른 배치에서 나온 걸 확인했어요.","come from","~에서 나오다","Where did that batch number come from?","The second label was from another batch.","I noticed a discrepancy between the second label and the recorded batch number."],
["Let’s double-check the batch number before sealing each box.","상자를 밀봉하기 전에 배치 번호를 다시 확인합시다.","double-check","재확인하다","Please double-check the stock code.","Let’s check the batch number again before closing the box.","Let’s make the batch-number check a required step before each box is sealed."],
["Your handover was clear. Keep that up on the next shift.","인수인계가 명확했어요. 다음 근무 때도 그렇게 해주세요.","keep that up","잘하고 있는 것을 계속하다","Your notes were really helpful. Keep that up.","Your handover was clear. Do that again next time.","Your handover made the outstanding work easy to follow. Let’s carry that approach into the next shift."],
["Would a quick run-through make the new process easier to follow?","절차를 한 번 빠르게 같이 해보면 이해하기 쉬울까요?","a run-through","간단한 시연·리허설","Let’s do a quick run-through before we start.","Would it help to try the new process together?","Would it help if we ran through the revised process together and talked through any sticking points?"],
["Let’s agree on one change we can try this week.","이번 주에 시도해 볼 변화 한 가지를 정합시다.","agree on","~을 합의하다","Have we agreed on the next step?","Let’s choose one thing to change this week.","Let’s agree on one practical change and decide how we’ll measure its effect this week."],
["I’ll check in on Friday to see how the change is working.","금요일에 바꾼 방식이 잘 돌아가는지 알아볼게요.","check in","상황을 확인하다","I’ll check in with you after the shift.","I’ll ask on Friday how the change is going.","I’ll check in on Friday and review whether the change has reduced repeat errors."],
],
budget: [
["This quote is higher than we allowed for in the budget.","이 견적은 우리가 예산에 반영한 금액보다 높아요.","allow for","비용 등을 미리 반영하다","Have we allowed for freight costs?","This quote is over our budget.","This quote exceeds the allowance we built into the budget."],
["Could you break down the quote by unit cost and freight?","견적을 제품 단가와 운송비로 나눠 보여주시겠어요?","break down","세부 항목으로 나누다","Can you break down the labour cost?","Can you show the item price and shipping cost separately?","Could you provide an itemised breakdown that separates unit pricing from freight?"],
["I’ll ask whether there’s room to negotiate on the minimum order.","최소 주문 수량을 협의할 여지가 있는지 물어볼게요.","room to negotiate","협상 여지","There may be room to negotiate on lead times.","I’ll ask if we can order fewer units.","I’ll find out whether the supplier can be flexible on the minimum order quantity."],
["We need to balance short-term savings against reliable supply.","단기 비용 절감과 안정적인 공급 사이에서 균형을 잡아야 해요.","balance A against B","A와 B의 이해득실을 따지다","We should balance price against lead time.","We need a good price and a supplier we can rely on.","We need to weigh the immediate savings against the risk of supply interruptions."],
["Could we get a second quote before we commit?","확정하기 전에 다른 견적도 받아볼 수 있을까요?","commit","확정하다, 약속하다","Let’s review the terms before we commit.","Can we get another price before we decide?","Could we obtain a comparable quote before committing to the purchase?"],
["I’ll put the two options side by side for approval.","승인을 받을 수 있도록 두 옵션을 나란히 비교해서 정리할게요.","side by side","나란히, 직접 비교할 수 있게","Let’s put delivery times side by side.","I’ll compare the two options and send them for approval.","I’ll prepare a side-by-side comparison with a recommendation for approval."],
["We can stay within budget if we stage the order over two months.","주문을 두 달에 걸쳐 나눠 하면 예산 내에서 진행할 수 있어요.","stay within budget","예산 안에서 진행하다","Changing the delivery date may help us stay within budget.","We can meet the budget by splitting the order into two months.","Phasing the order over two months would keep spending within budget while maintaining supply."],
],
meeting: [
["Could we start with the decisions we need to make today?","오늘 결정해야 할 사항부터 논의할까요?","start with","~부터 시작하다","Let’s start with the shipment dates.","Can we talk about today’s decisions first?","Could we prioritise the items requiring a decision today before moving to general updates?"],
["That timing clashes with an existing commitment.","그 시간은 이미 확정된 일정과 겹쳐요.","clash with","~와 일정이 겹치다","Tuesday clashes with our stocktake.","We already have something booked at that time.","The proposed timing conflicts with a commitment the team has already made."],
["Would Thursday morning work for everyone?","목요일 오전은 모두 괜찮으세요?","work for","~에게 일정이 맞다","Does next Monday work for you?","Is Thursday morning okay for everyone?","Could everyone confirm whether Thursday morning would accommodate their existing commitments?"],
["Let’s park that item and come back to it after the budget update.","그 안건은 잠시 미뤘다가 예산 공유 후 다시 다루죠.","park an item","안건을 잠시 미루다","Let’s park the roster discussion until tomorrow.","Let’s discuss that after the budget update.","Let’s set that item aside and revisit it once we have the updated figures."],
["Who can take ownership of the follow-up?","후속 조치를 누가 담당할 수 있을까요?","take ownership of","~을 책임지고 맡다","Mia will take ownership of the supplier update.","Who can do the follow-up?","Who can own the follow-up and report back at the next check-in?"],
["I’ll circulate the action points by the end of the day.","오늘 업무가 끝날 때까지 실행 항목을 공유할게요.","circulate","관련자에게 돌려 공유하다","I’ll circulate the revised agenda this morning.","I’ll send everyone the task list today.","I’ll circulate the agreed actions with owners and deadlines before close of business."],
["Let’s set a time to check progress before we wrap up.","회의를 마치기 전에 진행 상황을 확인할 시간을 잡죠.","wrap up","마무리하다","We can wrap up once the dates are confirmed.","Let’s choose a time to check progress before we finish.","Before we wrap up, let’s agree on a checkpoint to make sure the actions are on track."],
],
customer: [
["Thanks for getting in touch. I’ll check the status of your order now.","연락 주셔서 감사합니다. 지금 주문 상태를 확인해 볼게요.","get in touch","연락하다","Please get in touch if the parcel hasn’t arrived.","Thanks for your message. I’ll check your order now.","Thanks for getting in touch. I’ll look into the current status of your order straight away."],
["I can see that the parcel left our warehouse yesterday.","어제 상품이 창고에서 출고된 것으로 확인됩니다.","leave the warehouse","창고에서 출고되다","Your replacement left the warehouse this morning.","The parcel went out yesterday.","Our records show the parcel left the warehouse yesterday and is now with the carrier."],
["I’m following up with the courier for a confirmed delivery time.","택배사에 확정 배송 시간을 확인하고 있어요.","follow up with","~에게 후속 확인을 하다","I’ll follow up with the warehouse after lunch.","I’m asking the courier when it will arrive.","I’ve followed up with the courier and asked for a confirmed delivery window."],
["I can understand how frustrating it is to be left waiting.","기다리기만 해야 하는 상황이 얼마나 답답한지 이해합니다.","be left waiting","상황 안내 없이 기다리게 되다","No customer should be left waiting for an update.","I understand that waiting is frustrating.","I understand how frustrating it can be to wait without a clear update."],
["I’ll get back to you by two, even if I’m still waiting for an answer.","아직 답을 기다리는 중이어도 2시까지 연락드릴게요.","get back to","~에게 다시 연락하다","I can get back to you tomorrow morning.","I’ll contact you by two with an update.","I’ll update you by two regardless of whether the courier has confirmed a delivery time."],
["If the parcel can’t be located, I’ll explain the replacement options.","상품 위치를 파악할 수 없으면 교환 발송 방법을 안내드릴게요.","be located","위치가 파악되다","The parcel was located at the depot.","If we can’t find the parcel, I’ll explain how we can replace it.","If the carrier is unable to locate the parcel, I’ll outline the available replacement options."],
["Could you confirm the delivery address while I look into this?","제가 상황을 확인하는 동안 배송 주소를 확인해 주시겠어요?","look into","자세히 알아보다","I’ll look into the missing item now.","Can you check the address while I check the order?","While I look into the issue, could you confirm the delivery address on the order?"],
],
quality: [
["Let’s set this stock aside until we’ve checked the batch number.","배치 번호를 확인할 때까지 이 재고는 따로 보관합시다.","set aside","따로 보관하다","Set aside the damaged cartons for inspection.","Let’s keep this stock separate until we check it.","Let’s hold this stock separately pending verification of the batch number."],
["The label doesn’t match what we have in the stock record.","라벨이 재고 기록과 일치하지 않아요.","match the record","기록과 일치하다","The quantity should match the record.","The label and the record are different.","The batch number on the label doesn’t correspond to the one in our stock record."],
["Could you check whether other cartons from the same delivery are affected?","같은 입고 건의 다른 상자에도 문제가 있는지 확인해 주시겠어요?","be affected","영향을 받다","Only cartons from Monday’s delivery were affected.","Can you check the other boxes from that delivery?","Could you verify whether the discrepancy extends to other cartons from the same delivery?"],
["I’ll record the batch number and take a photo of the label.","배치 번호를 기록하고 라벨을 사진으로 남길게요.","take a photo of","~을 사진으로 남기다","Please take a photo of the damaged carton.","I’ll write down the batch number and photograph the label.","I’ll document the batch number and retain a photo of the label for the investigation."],
["Please hold off on dispatching anything from this batch.","이 배치에 속한 제품은 당분간 출고하지 말아 주세요.","hold off on","~을 보류하다","Hold off on updating the record until it’s verified.","Please don’t send anything from this batch yet.","Please hold all shipments from this batch until the issue has been checked and resolved."],
["I’ll check the delivery paperwork with the supplier.","공급업체와 배송 서류를 확인할게요.","paperwork","관련 서류","The delivery paperwork is in the shared folder.","I’ll ask the supplier to check the delivery documents.","I’ll cross-check the delivery documentation with the supplier and request written confirmation."],
["We can release the stock once the checks are signed off.","확인 결과가 승인되면 재고를 출고할 수 있어요.","sign off","최종 승인하다","The team lead needs to sign off on the change.","We can send the stock once the checks are approved.","The stock can be released once the checks have been completed and formally signed off."],
]};

const small: Omit<Card, "id" | "kind" | "topic">[] = [
{en:"How was your weekend? Did you get out much?",ko:"주말 어땠어요? 밖에 좀 다녀오셨어요?",phrase:"get out",meaning:"밖에 나가다",example:"We got out for a walk on Sunday."},
{en:"I’m grabbing a coffee. Would you like one?",ko:"저 커피 사러 가는데 한 잔 드실래요?",phrase:"grab a coffee",meaning:"커피를 간단히 사거나 마시다",example:"Shall we grab a coffee after the meeting?"},
{en:"Cheers for the hand, I really appreciate it.",ko:"도와줘서 고마워요. 정말 도움이 됐어요.",phrase:"cheers for",meaning:"~해줘서 고마워요. 편한 동료 사이",example:"Cheers for covering the phone."},
{en:"Did you get a chance to enjoy the sunshine yesterday?",ko:"어제 날이 좋았는데 밖에 좀 나가셨어요?",phrase:"get a chance to",meaning:"~할 기회가 있다",example:"Did you get a chance to try that café?"},
{en:"Any plans for the long weekend?",ko:"연휴에 뭐 하실 계획 있어요?",phrase:"long weekend",meaning:"공휴일을 포함한 긴 주말",example:"We’re staying in Auckland for the long weekend."},
{en:"I’m still getting to know the area. Any favourite lunch spots?",ko:"이 동네는 아직 잘 모르는데, 자주 가는 점심집 있어요?",phrase:"get to know",meaning:"조금씩 알아가다",example:"I’m getting to know the team this week."},
{en:"How did your daughter’s game go on Saturday?",ko:"토요일에 따님 경기 어땠어요?",phrase:"how did it go",meaning:"결과나 경험을 편하게 물어보다",example:"How did the school concert go?"},
{en:"It’s really cooled down this week, hasn’t it?",ko:"이번 주 들어 꽤 쌀쌀해졌죠?",phrase:"cool down",meaning:"날씨나 온도가 내려가다",example:"It usually cools down in the evening."},
{en:"No worries. I’ll catch you after lunch.",ko:"괜찮아요. 점심 먹고 봐요.",phrase:"catch you",meaning:"나중에 뵐게요. 가벼운 인사",example:"I’ll catch you tomorrow morning."},
{en:"Did you have a good break?",ko:"쉬는 동안 잘 지내셨어요?",phrase:"have a good break",meaning:"휴가나 휴일을 잘 보내다",example:"I hope you had a good break."},
{en:"That smells great. What did you bring for lunch?",ko:"냄새 좋네요. 점심으로 뭐 가져오셨어요?",phrase:"bring for lunch",meaning:"점심으로 가져오다",example:"I brought leftover pasta for lunch."},
{en:"Have you been to the Hobsonville market?",ko:"홉슨빌 마켓에 가보셨어요?",phrase:"have you been to",meaning:"어디에 가 본 적 있는지 묻다",example:"Have you been to the waterfront on a weekend?"},
{en:"Sounds like you had a full-on weekend.",ko:"주말을 꽤 바쁘게 보내셨나 봐요.",phrase:"full-on",meaning:"일정이 빡빡하거나 강도가 높은",example:"It was a full-on morning at work."},
{en:"How’s your week shaping up?",ko:"이번 주는 어떻게 흘러가고 있어요?",phrase:"shape up",meaning:"상황이 어떤 방향으로 진행되다",example:"How’s the afternoon shaping up?"},
{en:"It was good to catch up over lunch.",ko:"점심 먹으면서 이야기 나눠서 좋았어요.",phrase:"catch up",meaning:"근황을 나누다",example:"Let’s catch up over a coffee next week."},
{en:"Want to join us for a walk at lunch?",ko:"점심시간에 같이 산책하실래요?",phrase:"join us",meaning:"우리와 함께하다",example:"Do you want to join us for coffee?"},
{en:"How are you settling into the new place?",ko:"새로 이사 간 곳에는 적응 좀 하셨어요?",phrase:"settle into",meaning:"새 환경에 익숙해지다",example:"I’m settling into the new role."},
{en:"Did the rain hold off for your walk?",ko:"산책하는 동안 비가 안 왔어요?",phrase:"hold off",meaning:"비 등이 한동안 내리지 않다",example:"I hope the rain holds off until we get home."},
{en:"Have you got anything nice planned for tonight?",ko:"오늘 저녁에 뭐 좋은 계획 있어요?",phrase:"have something planned",meaning:"예정해 둔 일이 있다",example:"We’ve got a barbecue planned for Saturday."},
{en:"That’s a good shout. I’ll give it a go.",ko:"좋은 생각인데요. 한번 해볼게요.",phrase:"give it a go",meaning:"한번 시도해 보다",example:"I’ve never tried it, but I’ll give it a go."},
{en:"Safe trip home. See you on Monday!",ko:"조심히 들어가세요. 월요일에 봐요!",phrase:"safe trip home",meaning:"귀가나 돌아가는 길이 안전하길 바라는 인사",example:"Safe trip home, and enjoy the weekend!"},
];

export const allCards: Card[] = scenarios.flatMap(s => work[s.id].map((row, n) => ({
  id: s.id + "-" + n, topic: s.id, kind: "work", en: row[0], ko: row[1], phrase: row[2], meaning: row[3], example: row[4],
  source: (s.id === "dispatch" && [0,5].includes(n)) || (s.id === "staff" && [1,2,5].includes(n)) ? "이전 영어 연습" : undefined,
})));
export const talkCards: Card[] = small.map((row, n) => ({ ...row, id: "talk-" + n, topic: "smalltalk", kind: "talk" }));
const archiveRows = [
  ["We still have a large number of orders to dispatch.","아직 출고해야 할 주문이 많이 남아 있어요.","a large number of","많은 수의","A large number of orders came in overnight."],
  ["The orders have already been dispatched.","주문은 이미 출고됐어요.","have been dispatched","이미 출고가 완료되었다","Both parcels have been dispatched."],
] as const;
export const archiveCards: Card[] = archiveRows.map((row, n) => ({
  id: "archive-" + n, topic: "dispatch", kind: "work", en: row[0], ko: row[1], phrase: row[2], meaning: row[3], example: row[4], source: "이전 영어 연습",
}));
export const cardMap = Object.fromEntries([...allCards, ...talkCards, ...archiveCards].map(c => [c.id, c]));
export const defaultProfile: Profile = {scenario:"auto",level:"B2",seniority:"Team Lead",role:"Sales & Marketing Manager"};

export function dayKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"}).format(date);
}
export const dateObj = (day: string) => new Date(day + "T12:00:00Z");
export const weekday = (day: string) => dateObj(day).getUTCDay();
export function addDays(day: string, n: number) {
  const date = dateObj(day);
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
}
const baseTime = Date.UTC(2026, 10, 9);
const cycle = (num: number, max: number) => ((num % max) + max) % max;
export function dailyCards(day: string, profile: Profile): Card[] {
  const date = weekday(day);
  if (!date || date === 6) return [];
  const elapsed = Math.floor((dateObj(day).getTime() - baseTime) / 86400000);
  const ordinal = Math.floor(elapsed / 7) * 5 + date - 1;
  const offset = profile.role === "Team Manager" ? 2 : profile.role === "Operations Coordinator" ? 4 : 0;
  const pool: Scenario[] = profile.role === "Sales & Marketing Manager"
    ? ["product","pitch","subscription","commercial","coaching"]
    : profile.role === "Commercial Director"
      ? ["pitch","commercial","budget","meeting","product"]
      : ["dispatch","staff","coaching","budget","meeting","customer","quality"];
  const topic = profile.scenario === "auto"
    ? pool[cycle(profile.role === "Sales & Marketing Manager" ? ordinal - 4 : ordinal + offset + 3,pool.length)]
    : profile.scenario;
  const line = {B1:5,B2:0,C1:6}[profile.level];
  const workCards = allCards.filter(c => c.topic === topic);
  const start = cycle(ordinal * 3, talkCards.length);
  return [...workCards.map((c,n) => ({...c, en: work[topic][n][line]})), ...[0,1,2].map(n => talkCards[(start + n) % talkCards.length])];
}
export function topicName(id: string) {
  return id === "smalltalk" ? "동료 스몰토크" : scenarios.find(s=>s.id===id)?.name ?? "가져온 문장";
}
