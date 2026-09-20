import type {Deal} from './platform-types';
// Explicitly illustrative workflow data. These are not real introductions or emails.
const examples=[
 ['composio','Ananya Rao','RelayStack','Agent infrastructure','Product user','In conversation','A developer using our tools is building an agent observability product. They would welcome a conversation.'],
 ['emergent','Karan Mehta','Fieldwork AI','Vertical AI','Mentorship','Meeting scheduled','A builder I have been advising is automating field-service scheduling and has agreed to an introduction.'],
 ['kula','Riya Kapoor','TeamLens','HR technology','Former teammate','New','A former teammate has launched an interview coaching product. Please ask before reaching out.'],
 ['confido','Aditya Shah','Carepath','Healthcare AI','Domain network','Evaluating','A healthcare operator in my network is building referral coordination software.'],
 ['thesys','Neha Iyer','CanvasLoop','Developer tools','College network','Intro requested','Someone from my college is working on collaborative UI prototyping. I can check whether an introduction would help.'],
 ['spendflo','Rahul Menon','ProcureKit','Procurement','Design partner','New','A young procurement company we have worked with is looking for feedback on its new product.'],
 ['scalekit','Dev Patel','AccessLayer','Security','Mentorship','In conversation','A technical founder I advise is exploring identity for autonomous agents.'],
 ['metaforms','Sara George','ResearchLane','Research operations','Founder inbound','Closed','A research founder reached out for operating advice. The initial conversation is complete.']
];
export const sampleDeals:Deal[]=examples.map((x,i)=>({id:`sample-${i}`,companyId:x[0],name:x[1],startup:x[2],link:'',reason:x[6],referrer:'Portfolio founder · sample',referrerEmail:'',category:x[4],stage:x[5] as Deal['stage'],owner:'Shivam',permission:i===2||i===4?'Ask first':'Yes',followUp:'',notes:'Illustrative workflow only. This is not an actual referral.',messages:[{id:`sample-mail-${i}`,from:'Portfolio founder (illustrative)',to:'shivam@together.fund',subject:`Introduction: ${x[1]} / ${x[2]}`,body:`Hi Shivam,\n\n${x[6]}\n\n${x[1]} is building ${x[2]} in ${x[3].toLowerCase()}. Sharing this so you can take the conversation forward.\n\n[Sample email created to demonstrate the workflow.]`,at:'2026-09-20T07:30:00Z',direction:'inbound'}],updatedAt:'2026-09-20T07:30:00Z',unread:i<3,source:'sample'}));
