import {useEffect,useState} from 'react';
import {ArrowRight,ArrowUpRight,Check,Copy,Download,Mail,Send,Settings2,Upload} from 'lucide-react';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Toaster} from '@/components/ui/sonner';
import {toast} from 'sonner';
import {companies} from './data';
import {loadLocalData,readLocalData,localRequest,exportLocalData,importLocalData,resetLocalData} from './local-data';
import {stages,type Contact,type Deal,type MailDraft,type FeedItem,type PlatformData,type ReferralOpportunity} from './platform-types';
import {givenName,resourceBody,resourceSubject} from './engagement-message';
import {matchReferrer,parseReferralEmail,referralReply,referralRequest,requestOptions,type RequestKind} from './referral-workflow';
import ContentWorkbench from './content-workbench';
import ReferralWorkbench from './referral-workbench';
import ReferralIntake from './referral-intake';
import './workspace.css';
import './focused-workspace.css';

const companyName=(id:string)=>id==='other'?'Other / unattributed':companies.find(c=>c.id===id)?.name||'Choose a company';
const date=(value?:string)=>value&&Number.isFinite(Date.parse(value))?new Date(value.length===10?`${value}T12:00:00`:value).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'Date not recorded';
const newId=(prefix:string)=>`${prefix}-${crypto.randomUUID()}`;
const route=()=>location.hash==='#refer'?'refer':location.hash==='#referrals'?'referrals':'content';
const formUrl=(mailbox='shivam@together.fund')=>{const url=new URL(location.pathname,location.origin);url.hash='refer';url.searchParams.set('to',mailbox);return url.href};
const referralMailbox=()=>{const address=new URL(location.href).searchParams.get('to');return address&&/^[^\s@,;:]+@[^\s@,;:]+\.[^\s@,;:]+$/.test(address)?address:undefined};
const safeUrl=(value:string)=>/^https?:\/\//i.test(value)?value:undefined;
/** Deep links that open a prefilled compose window. The person still presses Send. */
const sendLinks=(draft:{to:string;subject:string;body:string})=>{
 const to=encodeURIComponent(draft.to),su=encodeURIComponent(draft.subject),bo=encodeURIComponent(draft.body);
 return {
  gmail:`https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${su}&body=${bo}`,
  outlook:`https://outlook.office.com/mail/deeplink/compose?to=${to}&subject=${su}&body=${bo}`,
  mailto:`mailto:${to}?subject=${su}&body=${bo}`,
 };
};
function initialState(){try{return readLocalData()}catch{return null}}

export default function Workspace(){
 const [data,setData]=useState<PlatformData|null>(initialState);
 const [page,setPage]=useState(route),[modal,setModal]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [person,setPerson]=useState<Contact|null>(null),[draft,setDraft]=useState<MailDraft|null>(null),[deal,setDeal]=useState<Deal|null>(null);
 const [requestCompany,setRequestCompany]=useState('composio'),[requestPerson,setRequestPerson]=useState(''),[requestKind,setRequestKind]=useState<RequestKind>('recent');
 const [pastedEmail,setPastedEmail]=useState('');
 useEffect(()=>{void loadLocalData().then(setData).catch(e=>setError(e.message))},[]);
 useEffect(()=>{const changed=()=>{setPage(route());setModal('')};window.addEventListener('hashchange',changed);return()=>window.removeEventListener('hashchange',changed)},[]);
 useEffect(()=>{
  const context=(document as any).modelContext;if(!context?.registerTool)return;
  const controller=new AbortController();
  Promise.resolve(context.registerTool({name:'show_sourcing_workspace',description:'Open the Content or Referrals workspace.',inputSchema:{type:'object',properties:{section:{type:'string',enum:['content','referrals']}},required:['section'],additionalProperties:false},execute:async({section}:{section:'content'|'referrals'})=>{location.hash=section;setPage(section);return {section}}},{signal:controller.signal})).catch(()=>{});
  return()=>controller.abort();
 },[]);
 function navigate(next:string){location.hash=next;setPage(next);setModal('')}
 async function save(kind:string,value:unknown){await localRequest('/api/platform',{kind,value});setData(readLocalData())}
 async function perform(fn:()=>Promise<void>){if(busy)return;setBusy(true);try{await fn()}catch(e){toast.error(e instanceof Error?e.message:'Could not save. Please retry.')}finally{setBusy(false)}}
 async function copy(value:string){try{await navigator.clipboard.writeText(value);toast.success('Copied')}catch{toast.error('Select the text and copy it manually.')}}
 function compose(p:Contact,item:FeedItem){
  setPerson(p);setDraft({id:newId('draft'),companyId:p.companyId,personId:p.id,to:p.email,subject:resourceSubject(p,item),body:resourceBody(p,item),status:'Draft',createdAt:new Date().toISOString(),resourceId:item.id,purpose:'content'});setModal('compose');
 }
 function askAboutOpportunity(item:ReferralOpportunity){
  const existing=data?.drafts.find(d=>d.opportunityId===item.id&&!d.archivedAt);if(existing){openDraft(existing);return}
  const p=matchReferrer({companyId:item.companyId,referrer:item.referrerPersonName},data!.contacts);
  if(!p){toast.error('The source contact is not mapped. Choose a founder to ask.');requestReferrals();return}
  setPerson(p);setDraft({id:newId('draft'),companyId:item.companyId,personId:p.id,opportunityId:item.id,to:p.email,subject:item.referrerPersonName===item.candidateName?`Catching up on ${item.startup}`:`Your perspective on ${item.startup}`,body:`Hi ${givenName(p.name)},\n\n${item.suggestedAsk}\n\nPublic context: ${item.sources[0]?.url||item.website}\n\nShivam`,status:'Draft',createdAt:new Date().toISOString(),purpose:'referral-ask'});setModal('compose');
 }
 function openDraft(item:MailDraft){setDraft({...item});setPerson(data?.contacts.find(p=>p.id===item.personId&&p.companyId===item.companyId)||null);setModal('compose')}
 function addReferral(){
  setPastedEmail('');setDeal({id:newId('deal'),companyId:'',name:'',startup:'',link:'',reason:'',referrer:'',referrerEmail:'',category:'Founder inbound',stage:'New',owner:'Shivam',permission:'Ask first',followUp:'',notes:'',messages:[],updatedAt:new Date().toISOString(),unread:false,source:'manual',intake:'Passed to Together'});setModal('referral');
 }
 function openReferral(item:Deal){setPastedEmail('');setDeal({...item});setModal('referral')}
 function requestReferrals(){setRequestPerson('');setRequestKind('recent');setModal('request')}
 function preparedDeal(original:Deal){
  const value={...original,name:original.name.trim(),startup:original.startup.trim(),referrer:original.referrer.trim()};
  const referrer=matchReferrer(value,data!.contacts);return {...value,referrerPersonId:referrer?.id};
 }
 function replyToReferral(item:Deal){
  const p=data?.contacts.find(p=>p.id===item.referrerPersonId)||null;setPerson(p);
  setDraft({id:newId('draft'),companyId:item.companyId,personId:p?.id,dealId:item.id,to:item.referrerEmail||p?.email||'',subject:`Re: ${item.startup}`,body:referralReply(item),status:'Draft',createdAt:new Date().toISOString(),purpose:'referral-reply'});setModal('compose');
 }
 function editReferrer(name:string){
  if(!deal)return;const p=matchReferrer({...deal,referrer:name},data!.contacts);
  const unchanged=deal.referrer.trim().toLowerCase()===name.trim().toLowerCase();
  setDeal({...deal,referrer:name,referrerPersonId:p?.id,referrerEmail:unchanged?deal.referrerEmail:p?.email||''});
 }
 if(page==='refer')return <><Toaster position="bottom-left" richColors/><ReferralIntake mailbox={referralMailbox()||'shivam@together.fund'} onBack={()=>navigate('content')}/></>;
 if(!data)return <div className="sw-loading"><h1>Content & referrals</h1><p>{error||'Loading the workspace…'}</p>{error&&<button className="sw-button" onClick={()=>{resetLocalData();location.reload()}}>Reset unreadable browser data</button>}</div>;
 const requestPeople=data.contacts.filter(p=>p.companyId===requestCompany);
 const recipient=requestPeople.find(p=>p.id===requestPerson);
 const requestTemplate=requestOptions.find(option=>option.id===requestKind)!;
 const requestBody=recipient?referralRequest(recipient,requestKind,data.settings.mailbox,formUrl(data.settings.mailbox)):'';
 const source=draft?.resourceId?data.feed.find(item=>item.id===draft.resourceId):undefined;
 const referralDraft=draft?.dealId?data.deals.find(item=>item.id===draft.dealId):undefined;
 const titles:Record<string,string>={compose:draft?.purpose==='referral-ask'?'Ask for a referral':draft?.dealId?'Keep the referrer updated':'Prepare a message',referral:deal?.startup||'Add a referral',request:'Ask for introductions',share:'A simple way to share a founder',settings:'Workspace settings'};
 return <div className="sw fw">
  <Toaster position="bottom-left" richColors/>
  <header className="sw-topbar"><a className="sw-brand" href="#content" onClick={e=>{e.preventDefault();navigate('content')}}>together<span>FUND</span></a><span className="sw-product">Portfolio sourcing</span><nav aria-label="Workspace"><button aria-current={page==='content'?'page':undefined} className={page==='content'?'active':''} onClick={()=>navigate('content')}>Content</button><button aria-current={page==='referrals'?'page':undefined} className={page==='referrals'?'active':''} onClick={()=>navigate('referrals')}>Referrals</button></nav><button className="sw-icon" aria-label="Workspace settings" onClick={()=>setModal('settings')}><Settings2 size={18}/></button></header>
  {error&&<div className="sw-error">{error}</div>}
  <main>{page==='content'?<ContentWorkbench data={data} onCompose={compose} onOpenDraft={openDraft}/>:<ReferralWorkbench data={data} onOpen={openReferral} onAdd={addReferral} onRequest={requestReferrals} onShareForm={()=>setModal('share')} onOpenDraft={openDraft} onAskOpportunity={askAboutOpportunity}/>}</main>
  <Dialog open={!!modal} onOpenChange={open=>{if(!open)setModal('')}}><DialogContent className={`sw-dialog ${modal==='compose'?'sw-compose':''}`}><DialogHeader><DialogTitle>{titles[modal]}</DialogTitle><DialogDescription>{modal==='compose'?'Review the message, then copy it or open your email app.':modal==='referral'?`${deal?.source==='sample'?'Illustrative example · ':''}Track the introduction and the next step with Together.`:modal==='request'?'Choose someone to ask and make the request specific.':modal==='share'?'Founders fill this out to prepare an email introduction to Together.':'Referral address and your saved work.'}</DialogDescription></DialogHeader>

  {modal==='compose'&&draft&&<>
   <div className="sw-composer-context"><strong>{person?.name||referralDraft?.referrer||'Recipient'}</strong><span>{companyName(draft.companyId)}</span>{referralDraft?.source==='sample'&&<em>Example</em>}</div>
   <form onSubmit={e=>{e.preventDefault();void perform(async()=>{await save('draft',draft);toast.success('Draft saved')})}}>
    <label>To<input type="email" value={draft.to} onChange={e=>setDraft({...draft,to:e.target.value})} placeholder="Add the recipient’s email"/></label>
    <label>Subject<input required value={draft.subject} onChange={e=>setDraft({...draft,subject:e.target.value})}/></label>
    <label>Message<textarea required rows={11} value={draft.body} onChange={e=>setDraft({...draft,body:e.target.value})}/></label>
    {source&&<div className="fw-source"><a href={safeUrl(source.url)} target="_blank" rel="noreferrer">{source.title}<ArrowUpRight size={13}/></a><small>{source.publisher} · {date(source.publishedAt)}</small></div>}
    <div className="sw-send-row">
     <a className="sw-button" href={sendLinks(draft).gmail} target="_blank" rel="noreferrer" onClick={()=>void perform(async()=>{await save('draft',draft);toast.success(draft.to.trim()?'Saved, and opened in Gmail':'Saved, and opened in Gmail — add the address there')})}><Send size={15}/>Send in Gmail<ArrowUpRight size={13}/></a>
     <a className="sw-outline" href={sendLinks(draft).mailto}>Email app</a>
     <a className="sw-outline" href={sendLinks(draft).outlook} target="_blank" rel="noreferrer">Outlook</a>
    </div>
    <p className="sw-footnote">{draft.to.trim()?'Opens the message already written and addressed. You press Send there — nothing leaves this browser on its own.':'No email address is saved for this person, so the message opens with the address blank. You add it and press Send — nothing leaves this browser on its own.'}</p>
    <div className="sw-actions"><button className="sw-button sw-quiet" disabled={busy||!draft.body.trim()||!draft.subject.trim()}><Check size={14}/>Save draft</button><button className="sw-outline" type="button" onClick={()=>void copy(`Subject: ${draft.subject}\n\n${draft.body}`)}><Copy size={14}/>Copy message</button></div>
   </form>
   <button className="sw-text sw-handle" disabled={busy} onClick={()=>void perform(async()=>{await save('draft',{...draft,archivedAt:draft.archivedAt?undefined:new Date().toISOString()});setModal('');toast.success(draft.archivedAt?'Draft restored':'Draft archived')})}>{draft.archivedAt?'Restore draft':'Archive draft'}</button><p className="sw-footnote">Saving or archiving a draft does not mark it sent.</p>
  </>}

  {modal==='request'&&<form onSubmit={e=>{e.preventDefault();if(!recipient)return;setPerson(recipient);setDraft({id:newId('draft'),companyId:recipient.companyId,personId:recipient.id,to:recipient.email,subject:requestTemplate.subject,body:requestBody,status:'Draft',createdAt:new Date().toISOString(),purpose:'referral-ask'});setModal('compose')}}>
   <div className="sw-form-pair"><label>Portfolio company<select value={requestCompany} onChange={e=>{setRequestCompany(e.target.value);setRequestPerson('')}}>{companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Who to ask<select required value={requestPerson} onChange={e=>setRequestPerson(e.target.value)}><option value="" disabled>Choose a founder or teammate</option>{requestPeople.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label></div>
   <label>What to ask about<select value={requestKind} onChange={e=>setRequestKind(e.target.value as RequestKind)}>{requestOptions.map(option=><option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
   {recipient?<div className="fw-request-preview"><span>Message preview</span><p>{requestBody}</p></div>:<p className="fw-help">Choose someone you know. The message asks for a name, a link and one line of context.</p>}
   <button className="sw-button" disabled={!recipient}>Personalize message<ArrowRight size={14}/></button>
  </form>}

  {modal==='share'&&<>
   <div className="fw-share-address"><Mail size={20}/><div><strong>{data.settings.mailbox}</strong><p>The referral form prepares an email to this address.</p></div></div>
   <label className="fw-field">Referral form link<input readOnly value={formUrl(data.settings.mailbox)} onFocus={e=>e.currentTarget.select()}/></label>
   <div className="sw-actions"><button className="sw-button" onClick={()=>void copy(formUrl(data.settings.mailbox))}><Copy size={14}/>Copy link</button><a className="sw-outline" href={formUrl(data.settings.mailbox)} target="_blank" rel="noreferrer">Preview the form<ArrowUpRight size={14}/></a></div>
   <p className="fw-help">They add the founder, a product link and why you should meet, then send from their email app. When it reaches your inbox, add it to Referrals to track the conversation.</p>
  </>}

  {modal==='referral'&&deal&&<form key={deal.id} onSubmit={e=>{e.preventDefault();void perform(async()=>{await save('deal',preparedDeal(deal));setModal('');toast.success('Referral saved')})}}>
   {!data.deals.some(item=>item.id===deal.id)&&<details className="fw-paste"><summary>Paste a received referral email</summary><label>Email text<textarea rows={5} value={pastedEmail} onChange={e=>setPastedEmail(e.target.value)} placeholder="Paste a referral form email, or add the details below."/></label><button type="button" className="sw-outline" disabled={!pastedEmail.trim()} onClick={()=>{const fields=parseReferralEmail(pastedEmail);setDeal({...deal,name:'',startup:'',companyId:'',referrer:'',reason:'',link:'',category:'Other',permission:'Ask first',...fields,referrerEmail:'',referrerPersonId:undefined});toast.success(fields.name?'Fields filled. Review before saving.':'Email added as context. Add the founder and company below.')}}>Fill from email</button></details>}
   <div className="sw-form-pair"><label>Founder<input required value={deal.name} onChange={e=>setDeal({...deal,name:e.target.value})} placeholder="Who should we meet?"/></label><label>Startup / product<input required value={deal.startup} onChange={e=>setDeal({...deal,startup:e.target.value})}/></label></div>
   <div className="sw-form-pair"><label>Referring portfolio company<select required value={deal.companyId} onChange={e=>setDeal({...deal,companyId:e.target.value,referrer:'',referrerEmail:'',referrerPersonId:undefined})}><option value="" disabled>Choose a company</option>{companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}<option value="other">Other / unattributed</option></select></label><label>Referred by<input required list="referrer-options" value={deal.referrer} onChange={e=>editReferrer(e.target.value)} placeholder="Founder or team member"/><datalist id="referrer-options">{data.contacts.filter(p=>p.companyId===deal.companyId).map(p=><option key={p.id} value={p.name}/>)}</datalist></label></div>
   <label>Why should we meet them?<textarea rows={3} value={deal.reason} onChange={e=>setDeal({...deal,reason:e.target.value})} placeholder="What are they building, and how does the referrer know them?"/></label>
   <div className="sw-form-pair"><label>Introduction<select value={deal.intake||'Passed to Together'} onChange={e=>setDeal({...deal,intake:e.target.value as Deal['intake']})}><option disabled={['In conversation','Meeting scheduled','Evaluating'].includes(deal.stage)}>Known to referrer</option><option>Passed to Together</option></select></label><label>Conversation stage<select value={deal.stage} onChange={e=>setDeal({...deal,stage:e.target.value as Deal['stage'],intake:['In conversation','Meeting scheduled','Evaluating'].includes(e.target.value)?'Passed to Together':deal.intake})}>{stages.map(stage=><option key={stage}>{stage}</option>)}</select></label></div>
   <div className="sw-form-pair"><label>Intro permission<select value={deal.permission} onChange={e=>setDeal({...deal,permission:e.target.value as Deal['permission']})}><option value="Ask first">Ask first</option><option value="Yes">Permission confirmed</option></select></label><label>Next follow-up<input type="date" value={deal.followUp} onChange={e=>setDeal({...deal,followUp:e.target.value})}/></label></div>
   <label>Next step / outcome<textarea rows={2} value={deal.notes} onChange={e=>setDeal({...deal,notes:e.target.value})} placeholder="Who is doing what next? Or record the outcome."/></label>
   <details className="sw-more"><summary>Link, contact and owner</summary><label>Website / product link<input type="url" value={deal.link} onChange={e=>setDeal({...deal,link:e.target.value})}/></label><div className="sw-form-pair"><label>Referrer email<input type="email" value={deal.referrerEmail} onChange={e=>setDeal({...deal,referrerEmail:e.target.value})}/></label><label>Owner<input value={deal.owner} onChange={e=>setDeal({...deal,owner:e.target.value})}/></label></div><label>How they know them<select value={deal.category} onChange={e=>setDeal({...deal,category:e.target.value})}>{[...new Set([deal.category,'Mentorship','Founder inbound','College network','Domain network','Former teammate','Product pitch','Email introduction','Other'])].filter(Boolean).map(v=><option key={v}>{v}</option>)}</select></label>{deal.messages.map(message=><div className="sw-mail" key={message.id}><strong>{message.subject}</strong><small>{message.from} · {date(message.at)}</small><p>{message.body}</p></div>)}</details>
   <div className="sw-actions"><button className="sw-button" disabled={busy}>Save referral</button><button className="sw-outline" type="button" disabled={busy} onClick={e=>{const form=e.currentTarget.form;if(!form?.reportValidity())return;void perform(async()=>{const value=preparedDeal(deal);await save('deal',value);replyToReferral(value)})}}>Save & reply to referrer</button></div>
  </form>}

  {modal==='settings'&&<>
   <form onSubmit={e=>{e.preventDefault();const fields=new FormData(e.currentTarget);void perform(async()=>{await save('settings',{mailbox:String(fields.get('mailbox'))});toast.success('Referral address saved')})}}><label>Where founders send referrals<input name="mailbox" required type="email" defaultValue={data.settings.mailbox}/></label><button className="sw-outline" disabled={busy}>Save address</button></form>
   <div className="sw-backup"><p>Drafts, referral records and relationship notes save in this browser only. Export a backup, or import a Together Orbit export from a teammate or a prepared file. Imports add and update records by id; nothing is deleted. Email import and shared team storage are not connected.</p><div className="sw-actions"><button className="sw-text" onClick={exportLocalData}><Download size={14}/>Export saved records</button><label className="sw-import"><Upload size={14}/>Import saved records<input type="file" accept="application/json,.json" disabled={busy} onChange={e=>{const file=e.target.files?.[0];e.currentTarget.value='';if(!file)return;void perform(async()=>{const summary=await importLocalData(await file.text());setData(readLocalData());toast.success(`Imported ${summary.deals} referrals, ${summary.contacts} people, ${summary.drafts} drafts and ${summary.movements} moves${summary.skipped.length?` · ${summary.skipped.length} skipped`:''}`);if(summary.skipped.length)toast.message('Skipped records',{description:summary.skipped.slice(0,3).join(' · ')})})}}/></label></div></div>
  </>}
  </DialogContent></Dialog>
 </div>;
}
