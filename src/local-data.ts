import seed from './seed.json';
import {sampleDeals} from './sample-referrals';
import type {PlatformData,Deal,Contact,MailDraft,Settings,MonitorReport,Notice} from './platform-types';
const storageKey='together-orbit-standalone-v1';
export const workflowUrl='https://github.com/shivrain/together-orbit/actions/workflows/portfolio-monitor.yml';
type Published={reports:MonitorReport[];notices:Notice[];settings:Pick<Settings,'enabled'|'frequencyDays'|'schedulerRegistered'>;generatedAt:string};
let engagement=seed.feed;
let published:Published={reports:seed.reports as MonitorReport[],notices:seed.notices,settings:{enabled:seed.settings.enabled,frequencyDays:2,schedulerRegistered:false},generatedAt:seed.reports[0]?.completedAt||''};
function saved():Partial<PlatformData>{const raw=localStorage.getItem(storageKey)||localStorage.getItem('together-orbit-public-demo-v1');if(!raw)return {};try{const d=JSON.parse(raw);if(!Array.isArray(d.deals)||!Array.isArray(d.drafts)||!Array.isArray(d.contacts))throw Error();return d}catch{throw Error('Saved browser data could not be read. Use Reset local data to restore the initial workspace.')}}
export function readLocalData():PlatformData{
 const local=saved();const base=seed as unknown as PlatformData;const settings={...base.settings,...local.settings,...published.settings};
 const readNotices=new Set((local.notices||[]).filter(n=>n.read).map(n=>n.id));
 return structuredClone({...base,deals:local.deals||[...base.deals,...sampleDeals],contacts:local.contacts||base.contacts,drafts:local.drafts||base.drafts,settings,reports:published.reports,feed:engagement,movements:base.movements,notices:published.notices.map(n=>({...n,read:readNotices.has(n.id)})),connections:{...base.connections,gmail:false,gmailConfigured:false,people:false,peopleProvider:'Not connected',scheduler:published.settings.schedulerRegistered,mailbox:settings.mailbox}});
}
export async function loadLocalData():Promise<PlatformData>{
 try{const response=await fetch(new URL('data/monitoring.json',document.baseURI),{cache:'no-cache'});if(response.ok){const value=await response.json();if(Array.isArray(value.reports)&&Array.isArray(value.notices)&&[2,7].includes(value.settings?.frequencyDays))published=value;}}
 catch{/* The bundled last published report remains available offline. */}
 try{const response=await fetch(new URL('data/engagement.json',document.baseURI),{cache:'no-cache'});if(response.ok){const value=await response.json();if(Array.isArray(value.feed))engagement=value.feed;}}catch{}
 return readLocalData();
}
export function resetLocalData(){localStorage.removeItem(storageKey);localStorage.removeItem('together-orbit-public-demo-v1')}
export function exportLocalData(){const state=readLocalData();const value={version:1,exportedAt:new Date().toISOString(),deals:state.deals,contacts:state.contacts,drafts:state.drafts};const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='together-orbit-workspace.json';a.click();URL.revokeObjectURL(url)}
export async function localRequest(path:string,body:unknown){
 if(path!=='/api/platform')throw Error('This integration is not connected. Use your email app or the GitHub scan workflow.');
 const {kind,value}=body as {kind:string;value:any};const state=readLocalData();const now=new Date().toISOString();
 const upsert=<T extends {id:string}>(items:T[],v:T)=>{const i=items.findIndex(x=>x.id===v.id);if(i<0)items.unshift(v);else items[i]={...items[i],...v};};
 if(kind==='deal'){const prior=state.deals.find(d=>d.id===value.id);const d:Deal={...prior,...value,messages:prior?.messages||[],source:prior?.source||'manual',updatedAt:now,unread:false};if(!d.companyId||!d.name||!d.startup)throw Error('Choose a portfolio company and enter a founder and startup.');upsert(state.deals,d);}
 else if(kind==='contact')upsert(state.contacts,value as Contact);
 else if(kind==='draft')upsert(state.drafts,{...value,status:'Draft'} as MailDraft);
 else if(kind==='settings')state.settings={...state.settings,mailbox:value.mailbox,emailQuery:value.emailQuery};
 else if(kind==='notice'){const n=state.notices.find(n=>n.id===value.id);if(n)n.read=true;}
 else throw Error('This action is not supported.');
 localStorage.setItem(storageKey,JSON.stringify({deals:state.deals,contacts:state.contacts,drafts:state.drafts,settings:state.settings,notices:state.notices}));return {ok:true};
}
