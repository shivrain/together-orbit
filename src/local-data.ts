import seed from './seed.json';
import bundledNetwork from '../public/data/network.json';
import bundledEngagement from '../public/data/engagement.json';
import bundledOpportunities from '../public/data/referral-opportunities.json';
import {sampleDeals} from './sample-referrals';
import {mergePeopleContacts,personIdentity} from './people';
import {companies} from './data';
import type {PlatformData,Deal,Contact,MailDraft,Settings,MonitorReport,Notice,Movement,MeetingNote,NetworkResearch,FeedItem,ReferralOpportunity} from './platform-types';
const storageKey='together-orbit-standalone-v1';
export const workflowUrl='https://github.com/shivrain/together-orbit/actions/workflows/portfolio-monitor.yml';
type Published={reports:MonitorReport[];notices:Notice[];settings:Pick<Settings,'enabled'|'frequencyDays'|'schedulerRegistered'>;generatedAt:string};
let engagement=bundledEngagement.feed as FeedItem[];
let opportunities=bundledOpportunities.opportunities as ReferralOpportunity[];
let network=bundledNetwork as NetworkResearch;
type MovementEdit={changes:Partial<Movement>;sourceAtReview?:string};
type SavedData=Partial<PlatformData>&{publicMovementEdits?:Record<string,MovementEdit>};
const movementSource=(m:Movement)=>JSON.stringify([m.sourceUrl,m.evidence,m.eventDate,m.previousCompany,m.previousRole,m.currentCompany,m.currentRole]);
let published:Published={reports:seed.reports as MonitorReport[],notices:seed.notices,settings:{enabled:seed.settings.enabled,frequencyDays:2,schedulerRegistered:false},generatedAt:seed.reports[0]?.completedAt||''};
function saved():SavedData{const raw=localStorage.getItem(storageKey)||localStorage.getItem('together-orbit-public-demo-v1');if(!raw)return {};try{const d=JSON.parse(raw);if(!Array.isArray(d.deals)||!Array.isArray(d.drafts)||!Array.isArray(d.contacts)||(d.movements!==undefined&&!Array.isArray(d.movements)))throw Error();return d}catch{throw Error('Saved browser data could not be read. Use Reset local data to restore the initial workspace.')}}
function validDate(value:unknown):value is string{
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value))return false;
 const day=value.slice(0,10),dayTime=Date.parse(`${day}T00:00:00Z`);
 return Number.isFinite(Date.parse(value))&&Number.isFinite(dayTime)&&new Date(dayTime).toISOString().slice(0,10)===day;
}
function latestDate(dates:(string|undefined)[]):string|undefined{return dates.filter(validDate).sort((a,b)=>Date.parse(b)-Date.parse(a))[0]}
export function readLocalData():PlatformData{
 const local=saved();const base=seed as unknown as PlatformData;const settings={...base.settings,...local.settings,...published.settings};
 const readNotices=new Set((local.notices||[]).filter(n=>n.read).map(n=>n.id));
 const contacts=mergePeopleContacts(local.contacts||base.contacts,network.people);
 const refreshedMoves=network.movements.map(m=>{
  const edit=local.publicMovementEdits?.[m.id],merged={...m,...edit?.changes};
  if(merged.confirmed&&edit?.sourceAtReview!==movementSource(merged))merged.confirmed=false;
  return merged;
 });
 const movements=[...new Map([...base.movements,...refreshedMoves,...(local.movements||[])].map(m=>[m.id,m])).values()].map(m=>{
  // Public IDs may have been merged into a user's earlier contact ID.
  const source=network.people.find(p=>p.id===m.personId);
  const person=source&&contacts.find(p=>personIdentity(p)===personIdentity(source));
  return person?{...m,personId:person.id}:m;
 });
 return structuredClone({...base,deals:(local.deals||[...base.deals,...sampleDeals]).map(deal=>({...deal,intake:deal.intake??'Passed to Together'})),contacts,drafts:local.drafts||base.drafts,settings,reports:published.reports,feed:engagement,opportunities,movements,notices:published.notices.map(n=>({...n,read:readNotices.has(n.id)})),connections:{...base.connections,gmail:false,gmailConfigured:false,people:false,peopleProvider:'Not connected',scheduler:published.settings.schedulerRegistered,mailbox:settings.mailbox}});
}
export async function loadLocalData():Promise<PlatformData>{
 try{const response=await fetch(new URL('data/monitoring.json',document.baseURI),{cache:'no-cache'});if(response.ok){const value=await response.json();if(Array.isArray(value.reports)&&Array.isArray(value.notices)&&[2,7].includes(value.settings?.frequencyDays))published=value;}}
 catch{/* The bundled last published report remains available offline. */}
 try{const response=await fetch(new URL('data/engagement.json',document.baseURI),{cache:'no-cache'});if(response.ok){const value=await response.json();if(Array.isArray(value.feed))engagement=value.feed;}}catch{}
 try{const response=await fetch(new URL('data/network.json',document.baseURI),{cache:'no-cache'});if(response.ok){const value=await response.json();if(value.schemaVersion===1&&Array.isArray(value.people)&&Array.isArray(value.movements))network=value;}}catch{}
 try{const response=await fetch(new URL('data/referral-opportunities.json',document.baseURI),{cache:'no-cache'});if(response.ok){const value=await response.json();if(value.schemaVersion===1&&Array.isArray(value.opportunities))opportunities=value.opportunities;}}catch{}
 return readLocalData();
}
export function resetLocalData(){localStorage.removeItem(storageKey);localStorage.removeItem('together-orbit-public-demo-v1')}
export type ImportSummary={deals:number;contacts:number;drafts:number;movements:number;skipped:string[];mailbox?:string};
/** Merge a workspace export into this browser. Records upsert by id; nothing is deleted. Invalid records are skipped and reported. */
export async function importLocalData(text:string):Promise<ImportSummary>{
 let value:any;try{value=JSON.parse(text)}catch{throw Error('This file is not valid JSON.')}
 const lists=['deals','contacts','drafts','movements'] as const;
 if(!value||typeof value!=='object'||![1,2].includes(value.version)||!lists.every(key=>value[key]===undefined||Array.isArray(value[key]))||!lists.some(key=>Array.isArray(value[key])))throw Error('Choose a Together Orbit export file (version 2).');
 const summary:ImportSummary={deals:0,contacts:0,drafts:0,movements:0,skipped:[]};
 const run=async(kind:'contact'|'deal'|'draft'|'movement',items:any[],count:keyof Omit<ImportSummary,'skipped'|'mailbox'>)=>{
  for(const item of items){
   if(!item||typeof item!=='object'||typeof item.id!=='string'||!item.id.trim()){summary.skipped.push(`${kind}: missing id`);continue}
   try{await localRequest('/api/platform',{kind,value:item});summary[count]++}catch(error){summary.skipped.push(`${kind} ${item.id}: ${error instanceof Error?error.message:'invalid record'}`)}
  }
 };
 await run('contact',value.contacts||[],'contacts');
 await run('deal',value.deals||[],'deals');
 await run('draft',value.drafts||[],'drafts');
 await run('movement',value.movements||[],'movements');
 if(typeof value.settings?.mailbox==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.settings.mailbox)){await localRequest('/api/platform',{kind:'settings',value:{mailbox:value.settings.mailbox}});summary.mailbox=value.settings.mailbox}
 return summary;
}
export function exportLocalData(){const state=readLocalData();const value={version:2,exportedAt:new Date().toISOString(),deals:state.deals,contacts:state.contacts,drafts:state.drafts,movements:state.movements,settings:state.settings};const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='together-orbit-workspace.json';a.click();URL.revokeObjectURL(url)}
export async function localRequest(path:string,body:unknown){
 if(path!=='/api/platform')throw Error('This integration is not connected. Use your email app or the GitHub scan workflow.');
 const {kind,value}=body as {kind:string;value:any};const state=readLocalData();const now=new Date().toISOString();
 const upsert=<T extends {id:string}>(items:T[],v:T)=>{const i=items.findIndex(x=>x.id===v.id);if(i<0)items.unshift(v);else items[i]={...items[i],...v};};
 if(kind==='deal'){const prior=state.deals.find(d=>d.id===value.id);const d:Deal={...prior,...value,intake:value.intake??prior?.intake??'Passed to Together',messages:prior?.messages||(Array.isArray(value.messages)?value.messages:[]),source:prior?.source||(value.source==='email'?'email':'manual'),updatedAt:!prior&&validDate(value.updatedAt)?value.updatedAt:now,unread:false};if(!d.companyId||!d.name||!d.startup)throw Error('Choose a portfolio company and enter a founder and startup.');if(!['Known to referrer','Passed to Together'].includes(d.intake!))throw Error('Choose whether the founder is known to the referrer or passed to Together.');if(d.intake==='Known to referrer'&&['In conversation','Meeting scheduled','Evaluating'].includes(d.stage))throw Error('Mark this referral as Passed to Together first before advancing the Together conversation stage.');upsert(state.deals,d);}
 else if(kind==='contact'){if(!value.id||!value.companyId||!value.name?.trim())throw Error('Choose a portfolio company and enter a person’s name.');if(state.contacts.some(person=>person.id!==value.id&&personIdentity(person)===personIdentity(value)))throw Error('This person is already mapped at this company. Edit the existing relationship instead.');upsert(state.contacts,value as Contact);}
 else if(kind==='meeting-note'){
  const person=state.contacts.find(person=>person.id===value.personId),note=value.note;
  if(!person)throw Error('Choose a mapped person for this meeting.');
  if(!note||typeof note.id!=='string'||!note.id.trim()||typeof note.body!=='string'||!note.body.trim())throw Error('Add meeting notes before saving.');
  if(!validDate(note.date)||Date.parse(note.date)>Date.parse(now))throw Error('Choose a valid meeting date that is not in the future.');
  if(!Array.isArray(note.topics)||!note.topics.every((topic:unknown)=>typeof topic==='string')||typeof note.askedForReferrals!=='boolean')throw Error('Choose meeting topics and record whether referrals were requested.');
  if(value.nextFollowUpAt!==undefined&&value.nextFollowUpAt!==''&&!validDate(value.nextFollowUpAt))throw Error('Choose a valid follow-up date.');
  const topics:string[]=[];
  for(const raw of note.topics as string[]){const topic=raw.trim();if(topic&&!topics.some(existing=>existing.toLowerCase()===topic.toLowerCase()))topics.push(topic)}
  const entry:MeetingNote={id:note.id.trim(),date:note.date,body:note.body.trim(),topics,askedForReferrals:note.askedForReferrals};
  const history=[...(person.meetingNotes||[])];upsert(history,entry);
  person.meetingNotes=history.sort((a,b)=>Date.parse(b.date)-Date.parse(a.date)||a.id.localeCompare(b.id));
  person.lastContactAt=latestDate([person.lastContactAt,...history.map(note=>note.date)]);
  person.referralAskAt=latestDate([person.referralAskAt,...history.filter(note=>note.askedForReferrals).map(note=>note.date)]);
  if(value.nextFollowUpAt!==undefined)person.nextFollowUpAt=value.nextFollowUpAt;
 }
 else if(kind==='movement'){if(!value.id||!value.companyId||!value.person?.trim()||!value.sourceUrl?.trim()||!value.evidence?.trim())throw Error('Add a person, source link and evidence for this move.');upsert(state.movements,value as Movement);}
 else if(kind==='draft')upsert(state.drafts,{...value,status:'Draft'} as MailDraft);
 else if(kind==='settings'){
  if(typeof value.mailbox==='string')state.settings.mailbox=value.mailbox;
  if(typeof value.emailQuery==='string')state.settings.emailQuery=value.emailQuery;
  if(Object.prototype.hasOwnProperty.call(value,'focusCompanyIds')){
   if(!Array.isArray(value.focusCompanyIds))throw Error('Choose portfolio companies for the focus list.');
   const validIds=new Set(companies.map(company=>company.id));
   state.settings.focusCompanyIds=[...new Set<string>(value.focusCompanyIds.filter((id:unknown):id is string=>typeof id==='string'&&validIds.has(id)))];
  }
 }
 else if(kind==='notice'){const n=state.notices.find(n=>n.id===value.id);if(n)n.read=true;}
 else throw Error('This action is not supported.');
 const publicIds=new Set(network.movements.map(m=>m.id));
 const publicMovementEdits:Record<string,MovementEdit>={};
 for(const original of network.movements){
  const current=state.movements.find(m=>m.id===original.id);if(!current)continue;
  const source=network.people.find(p=>p.id===original.personId),person=source&&state.contacts.find(p=>personIdentity(p)===personIdentity(source));
  const baseline=person?{...original,personId:person.id}:original;
  const changes=Object.fromEntries(Object.entries(current).filter(([key,value])=>JSON.stringify(value)!==JSON.stringify(baseline[key as keyof Movement]))) as Partial<Movement>;
  if(Object.keys(changes).length)publicMovementEdits[current.id]={changes,sourceAtReview:current.confirmed?movementSource(current):undefined};
 }
 localStorage.setItem(storageKey,JSON.stringify({deals:state.deals,contacts:state.contacts,drafts:state.drafts,movements:state.movements.filter(m=>!publicIds.has(m.id)),publicMovementEdits,settings:state.settings,notices:state.notices}));return {ok:true};
}
