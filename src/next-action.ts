import type {Contact,PlatformData} from './platform-types';

export type NextAction = {
  kind:'referral'|'referral-ask'|'review-move'|'check-in'|'follow-up'|'draft'|'share-resource'|'map-team';
  title:string;
  reason:string;
  button:string;
  personId?:string;
  dealId?:string;
  movementId?:string;
  draftId?:string;
  feedId?:string;
};

// Reject normalized impossible dates (e.g. February 30), ambiguous formats and future
// observations. A missing date can never establish that something happened recently.
function timestamp(value:string|undefined):number|null {
  if(!value||!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value))return null;
  const day=value.slice(0,10),dayTime=Date.parse(`${day}T00:00:00Z`),time=Date.parse(value);
  return Number.isFinite(time)&&Number.isFinite(dayTime)&&new Date(dayTime).toISOString().slice(0,10)===day?time:null;
}

// Match a small vocabulary of specialized interests. Generic "AI", "technology"
// and unstructured meeting prose are deliberately not expertise signals.
const subjectSignals:[string,string[]][]=[
  ['Voice and speech',['voice','speech','transcription','audio','dictation']],
  ['Agent security',['agent security','agent identity','authentication','agent authorization','oauth','token protection','delegated access','workload identity']],
  ['Recruitment',['recruitment','recruiting','hiring','talent acquisition','technical assessments']],
  ['Healthcare',['healthcare','health care','clinical','medical','prior authorization','prior authorisation','revenue cycle']],
  ['GTM',['gtm','go to market','go-to-market','enterprise sales','sales','plg','product-led','product led','positioning']],
  ['Research operations',['market research','research operations','survey','surveys','synthetic respondents','qualitative research']],
  ['Agent reliability',['agent reliability','agent evaluations','agent evaluation','agent evals','evaluating agents','observability']],
  ['Developer tools',['developer tools','coding','software development','code generation']],
  ['Data infrastructure',['data infrastructure','data engineering','data pipelines','data warehouse','database','databases','etl']],
];
function subjects(text:string):string[]{
  const normalized=` ${text.toLowerCase().replace(/[^a-z0-9]+/g,' ')} `;
  return subjectSignals.filter(([,signals])=>signals.some(signal=>normalized.includes(` ${signal.replace(/[^a-z0-9]+/g,' ')} `))).map(([subject])=>subject);
}
function recordedSubjects(person:Contact):string[]{
  return subjects([person.interests,...(person.meetingNotes||[]).flatMap(note=>note.topics||[])].join(' '));
}

/** One transparent next step, selected from saved evidence; no inferred intent. */
export function getNextAction(data:PlatformData,companyId:string,now=new Date()):NextAction {
  const nowTime=now.getTime();
  const past=(value:string|undefined)=>{const time=timestamp(value);return time!==null&&time<=nowTime?time:null};
  const people=data.contacts.filter(person=>person.companyId===companyId);
  const personFor=(id:string|undefined)=>people.find(person=>person.id===id);
  const stable=(a:{id:string},b:{id:string})=>a.id.localeCompare(b.id);

  // Respect a deliberately scheduled next step. Closed referrals are never reopened
  // by this selector; evaluating referrals need an explicit due follow-up.
  const referral=data.deals.filter(deal=>{
    if(deal.companyId!==companyId||deal.source==='sample'||deal.stage==='Closed')return false;
    const followUp=timestamp(deal.followUp);
    if(followUp!==null&&followUp>nowTime)return false;
    return deal.stage!=='Evaluating'||past(deal.followUp)!==null;
  }).sort((a,b)=>(Number(b.unread)-Number(a.unread))||((past(a.updatedAt)??Infinity)-(past(b.updatedAt)??Infinity))||stable(a,b))[0];
  if(referral){
    const person=personFor(referral.referrerPersonId);
    const due=past(referral.followUp)!==null;
    if(referral.intake==='Known to referrer')return {
      kind:'referral',dealId:referral.id,personId:person?.id,
      title:`Review an introduction to ${referral.name}`,
      reason:`${referral.name} is recorded as known to ${referral.referrer||'this referrer'}. An introduction to Together has not been recorded.`,
      button:'Review introduction',
    };
    return {
      kind:'referral',dealId:referral.id,personId:person?.id,
      title:referral.permission==='Ask first'?`Get permission for ${referral.name}'s introduction`:`${due?'Follow up with':'Review the referral for'} ${referral.name}`,
      reason:referral.permission==='Ask first'?'This referral is marked “Ask first.” Confirm permission before making the introduction.':due?`The saved follow-up date is due. Current stage: ${referral.stage}.`:`${referral.referrer||'A portfolio contact'} shared this referral. Current stage: ${referral.stage}.`,
      button:'Open referral',
    };
  }

  const moves=data.movements.filter(move=>move.companyId===companyId&&past(move.observedAt)!==null)
    .sort((a,b)=>past(b.observedAt)!-past(a.observedAt)!||stable(a,b));
  const unreviewed=moves.find(move=>!move.confirmed);
  if(unreviewed)return {kind:'review-move',title:`Check the update about ${unreviewed.person}`,reason:'A saved move needs review against its source before you act on it.',button:'Review source',movementId:unreviewed.id,personId:personFor(unreviewed.personId)?.id};

  const changed=moves.find(move=>{
    const person=personFor(move.personId);
    return move.confirmed&&person&&(past(person.lastContactAt)??-Infinity)<past(move.observedAt)!;
  });
  if(changed){
    const person=personFor(changed.personId)!;
    return {kind:'check-in',title:`Check in with ${person.name}`,reason:'Their move has been reviewed. No contact is recorded since that observation.',button:'Draft a check-in',personId:person.id,movementId:changed.id};
  }

  const followUp=people.filter(person=>past(person.nextFollowUpAt)!==null)
    .sort((a,b)=>past(a.nextFollowUpAt)!-past(b.nextFollowUpAt)!||stable(a,b))[0];
  if(followUp)return {kind:'follow-up',title:`Follow up with ${followUp.name}`,reason:`You saved a follow-up for ${followUp.nextFollowUpAt!.slice(0,10)}.`,button:'Draft a follow-up',personId:followUp.id};

  const sampleDealIds=new Set(data.deals.filter(deal=>deal.source==='sample').map(deal=>deal.id));
  const draft=data.drafts.filter(item=>item.companyId===companyId&&!item.archivedAt&&past(item.createdAt)!==null&&(!item.dealId||!sampleDealIds.has(item.dealId)))
    .sort((a,b)=>past(b.createdAt)!-past(a.createdAt)!||stable(a,b))[0];
  if(draft)return {kind:'draft',title:'Finish your saved message',reason:draft.subject||'A saved draft is ready for you to review.',button:'Open draft',draftId:draft.id,personId:personFor(draft.personId)?.id};

  // These are explicit relationship observations, not calculated NPS or intent.
  // Start with a recorded positive, strong relationship; frequent deal flow breaks
  // ties before other relationships. Never convert missing fields into confidence.
  const ready=(person:Contact)=>person.fundSentiment==='Positive'&&person.relationshipStrength==='Strong';
  const relationships=[...people].sort((a,b)=>Number(ready(b))-Number(ready(a))
    ||Number(b.dealFlow==='Frequent')-Number(a.dealFlow==='Frequent')
    ||Number(b.fundSentiment==='Positive')-Number(a.fundSentiment==='Positive')
    ||Number(b.relationshipStrength==='Strong')-Number(a.relationshipStrength==='Strong')
    ||stable(a,b));
  const hasNegativeFeedback=people.some(person=>person.fundSentiment==='Negative');
  const askPerson=!hasNegativeFeedback?relationships.find(person=>{
    if(!ready(person))return false;
    const lastAsk=timestamp(person.referralAskAt);
    // A saved recent/future ask must not cause another request. An invalid nonempty
    // date needs correction, rather than silently being treated as never asked.
    if(person.referralAskAt&&(lastAsk===null||nowTime-lastAsk<=30*86400000))return false;
    return person.referralAwareness==='Needs reminder'||person.referralUnderstanding==='Needs context'
      ||(lastAsk!==null&&nowTime-lastAsk>30*86400000);
  }):undefined;
  if(askPerson)return {
    kind:'referral-ask',personId:askPerson.id,title:`Ask ${askPerson.name} for their top 3 founders`,button:'Prepare the ask',
    reason:askPerson.referralUnderstanding==='Needs context'
      ?'You recorded a positive view of Together and a strong relationship. Explain why introductions matter, then ask about three founders in their circle.'
      :askPerson.referralAwareness==='Needs reminder'
        ?'You recorded a positive view of Together and a strong relationship. Bring the referral ask into your next catch-up.'
        :'You recorded a positive view of Together and a strong relationship. The last recorded referral ask was over 30 days ago.',
  };

  const handled=data.drafts.filter(item=>item.companyId===companyId&&item.archivedAt&&(!item.dealId||!sampleDealIds.has(item.dealId)));
  const alreadyHandled=(resourceId:string,personId:string|undefined)=>handled.some(item=>item.resourceId===resourceId&&item.personId===personId);
  const available=data.feed.filter(item=>past(item.publishedAt)!==null);
  const topical=available.flatMap(item=>{
    const resourceSubjects=subjects([item.title,item.topic,item.summary,item.whyRelevant].join(' '));
    return relationships.flatMap((person,personOrder)=>{
      const matches=recordedSubjects(person).filter(subject=>resourceSubjects.includes(subject));
      return matches.length&&!alreadyHandled(item.id,person.id)?[{item,person,matches,personOrder}]:[];
    });
  }).sort((a,b)=>b.matches.length-a.matches.length
    ||Number(b.item.companyIds.includes(companyId))-Number(a.item.companyIds.includes(companyId))
    ||past(b.item.publishedAt)!-past(a.item.publishedAt)!
    ||a.personOrder-b.personOrder||stable(a.item,b.item))[0];
  if(topical)return {
    kind:'share-resource',title:`Share a useful read with ${topical.person.name}`,button:'Prepare a message',
    reason:`Matched to ${topical.person.name}'s recorded topics: ${topical.matches.join(', ')}. ${topical.item.summary||topical.item.title}`,
    feedId:topical.item.id,personId:topical.person.id,
  };
  const recipients=relationships.filter(person=>ready(person)||person.kind==='Founder');
  const general=available.filter(item=>item.companyIds.includes(companyId))
    .sort((a,b)=>past(b.publishedAt)!-past(a.publishedAt)!||stable(a,b))
    .flatMap(item=>(recipients.length?recipients:[undefined]).filter(person=>!alreadyHandled(item.id,person?.id)).map(person=>({item,person})))[0];
  if(general){
    const {item:resource,person}=general;
    return {kind:'share-resource',title:person?`Share a useful read with ${person.name}`:'Share a useful read',reason:resource.whyRelevant||resource.title,button:'Prepare a message',feedId:resource.id,personId:person?.id};
  }

  const person=hasNegativeFeedback?relationships.find(person=>person.fundSentiment==='Negative'):relationships[0];
  if(person){
    const reason=person.fundSentiment==='Negative'
      ?'Negative feedback is recorded. Understand what has not worked and offer help before asking for introductions.'
      :person.fundSentiment==='Mixed'
        ?'Mixed feedback is recorded. Ask where Together could be more useful before making a referral request.'
        :person.relationshipStrength==='Weak'||person.relationshipStrength==='Developing'
          ?'Build the relationship with a useful conversation. Ask what they are working through and where Together can help.'
          :ready(person)
            ?'Keep the relationship useful. Offer help or compare notes at your next catch-up.'
            :'Their view of Together or relationship strength is not established. Start with a useful check-in and learn where we can help.';
    return {kind:'check-in',personId:person.id,title:`Check in with ${person.name}`,reason,button:'Prepare a check-in'};
  }

  return {kind:'map-team',title:'Add a person you want to stay close to',reason:'Start with a team member, advisor or alumnus you know. Add their role and source.',button:'Add a person'};
}
