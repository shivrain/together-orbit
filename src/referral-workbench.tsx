import {useMemo,useState} from 'react';
import {ArrowRight,ArrowUpRight,ChevronRight,Inbox,Link2,Mail,Plus,Search,X} from 'lucide-react';
import {companies} from './data';
import type {Deal,MailDraft,PlatformData,ReferralOpportunity} from './platform-types';
import './referral-workbench.css';

type Props={data:PlatformData;onOpen:(deal:Deal)=>void;onAdd:()=>void;onRequest:()=>void;onShareForm:()=>void;onOpenDraft:(draft:MailDraft)=>void;onAskOpportunity:(item:ReferralOpportunity)=>void};
type View='All referrals'|'Need introduction'|'In conversation'|'Closed';
const views:View[]=['All referrals','Need introduction','In conversation','Closed'];
const companyName=(id:string)=>id==='other'?'Other / unattributed':companies.find(c=>c.id===id)?.name||'Portfolio company';

function followUp(value:string){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
  const [year,month,day]=value.split('-').map(Number),when=new Date(year,month-1,day);
  if(when.getFullYear()!==year||when.getMonth()!==month-1||when.getDate()!==day)return null;
  const now=new Date(),today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  const label=when.toLocaleDateString('en-GB',{day:'numeric',month:'short',...(year!==now.getFullYear()?{year:'numeric' as const}:{})});
  return {label:when.getTime()===today.getTime()?'Due today':`${when<today?'Overdue ·':'Due'} ${label}`,overdue:when<today,time:when.getTime()};
}

function viewFor(deal:Deal):View{
  if(deal.stage==='Closed')return 'Closed';
  if(deal.intake==='Known to referrer'||deal.stage==='New'||deal.stage==='Intro requested')return 'Need introduction';
  return 'In conversation';
}

function nextStep(deal:Deal){
  if(deal.notes.trim())return deal.notes.trim();
  if(deal.stage==='Closed')return 'Conversation closed';
  if(deal.intake==='Known to referrer')return deal.permission==='Yes'?'Request an introduction':'Ask referrer to confirm interest';
  if(deal.stage==='New')return deal.permission==='Yes'?'Review the introduction':'Confirm permission to connect';
  if(deal.stage==='Intro requested')return 'Follow up on the introduction';
  if(deal.stage==='In conversation')return 'Arrange the next conversation';
  if(deal.stage==='Meeting scheduled')return 'Prepare for the meeting';
  return 'Follow up on the evaluation';
}

export default function ReferralWorkbench({data,onOpen,onAdd,onRequest,onShareForm,onOpenDraft,onAskOpportunity}:Props){
  const [query,setQuery]=useState(''),[companyId,setCompanyId]=useState('all'),[view,setView]=useState<View>('All referrals'),[showExamples,setShowExamples]=useState(false);
  const [section,setSection]=useState<'research'|'received'>(()=>data.deals.some(d=>d.source!=='sample')?'received':'research');
  const opportunities=(data.opportunities||[]).filter(item=>(companyId==='all'||item.companyId===companyId)&&[item.candidateName,item.startup,item.sector,item.referrerPersonName,companyName(item.companyId),item.connectionEvidence].join(' ').toLowerCase().includes(query.trim().toLowerCase()));
  const examplesAvailable=data.deals.some(d=>d.source==='sample');
  const actualDeals=data.deals.filter(d=>d.source!=='sample');
  const savedRequests=data.drafts.filter(draft=>
    (draft.dealId||draft.purpose==='referral-ask'||draft.purpose==='referral-reply')&&
    (showExamples||!data.deals.some(deal=>deal.id===draft.dealId&&deal.source==='sample'))&&
    (companyId==='all'||draft.companyId===companyId)
  ).sort((a,b)=>{
    if(Boolean(a.archivedAt)!==Boolean(b.archivedAt))return a.archivedAt?1:-1;
    return (Date.parse(b.createdAt)||0)-(Date.parse(a.createdAt)||0);
  });
  const filtered=useMemo(()=>data.deals.filter(deal=>
    (showExamples||deal.source!=='sample')&&
    (companyId==='all'||deal.companyId===companyId)&&
    (view==='All referrals'||viewFor(deal)===view)&&
    `${deal.name} ${deal.startup} ${deal.referrer} ${companyName(deal.companyId)} ${deal.owner}`.toLowerCase().includes(query.trim().toLowerCase())
  ).sort((a,b)=>{
    if((a.source==='sample')!==(b.source==='sample'))return a.source==='sample'?1:-1;
    if((a.stage==='Closed')!==(b.stage==='Closed'))return a.stage==='Closed'?1:-1;
    const aDue=followUp(a.followUp),bDue=followUp(b.followUp);
    if(aDue?.time!==bDue?.time)return (aDue?.time??Infinity)-(bDue?.time??Infinity);
    return (Date.parse(b.updatedAt)||0)-(Date.parse(a.updatedAt)||0);
  }),[data.deals,query,companyId,view,showExamples]);
  const filtersActive=Boolean(query.trim()||companyId!=='all'||view!=='All referrals');
  function clearFilters(){setQuery('');setCompanyId('all');setView('All referrals')}

  return <section className="rw" aria-labelledby="rw-title">
    <header className="rw-heading">
      <div><p className="rw-eyebrow">INTRODUCTIONS, FOLLOWED THROUGH</p><h1 id="rw-title">Referrals</h1><p>Know who was recommended, who can introduce you, and what happens next.</p></div>
      <div className="rw-heading-actions"><button type="button" className="sw-outline" onClick={onRequest}><Mail size={15}/>Ask a founder</button><button type="button" className="sw-button" onClick={onAdd}><Plus size={16}/>Add referral</button></div>
    </header>

    <div className="rw-intake-strip"><span>A name, a link and a little context are enough to get started.</span><button type="button" onClick={onShareForm}><Link2 size={14}/>Share referral form<ArrowRight size={13}/></button></div>
    <div className="rw-sections" aria-label="Referral view"><button type="button" className={section==='research'?'active':''} aria-pressed={section==='research'} onClick={()=>setSection('research')}>Founders to ask about</button><button type="button" className={section==='received'?'active':''} aria-pressed={section==='received'} onClick={()=>setSection('received')}>Referral pipeline</button></div>

    <div className="rw-tools">
      <label className="rw-search"><Search size={16} aria-hidden="true"/><input aria-label="Search referrals" placeholder="Search founder, startup or referrer" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button type="button" aria-label="Clear search" onClick={()=>setQuery('')}><X size={14}/></button>}</label>
      <label className="rw-company-filter"><span>Portfolio connection</span><select aria-label="Filter by portfolio company" value={companyId} onChange={e=>setCompanyId(e.target.value)}><option value="all">All portfolio companies</option>{[...companies].sort((a,b)=>a.name.localeCompare(b.name)).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}<option value="other">Other / unattributed</option></select></label>
    </div>
    {section==='received'&&actualDeals.length>0&&<div className="rw-pulse" aria-label="Pipeline summary">
      {[{key:'Need introduction',n:actualDeals.filter(d=>viewFor(d)==='Need introduction').length,hint:'waiting on an intro'},
        {key:'In conversation',n:actualDeals.filter(d=>viewFor(d)==='In conversation').length,hint:'live with Together'},
        {key:'Overdue',n:actualDeals.filter(d=>followUp(d.followUp)?.overdue&&d.stage!=='Closed').length,hint:'follow-up date passed'},
        {key:'No next step',n:actualDeals.filter(d=>!d.notes.trim()&&!d.followUp&&d.stage!=='Closed').length,hint:'nothing recorded'}].map(item=>
        <button type="button" key={item.key} className={`rw-pulse-item${item.n>0&&(item.key==='Overdue')?' rw-pulse-warn':''}`} onClick={()=>{if(item.key==='Need introduction'||item.key==='In conversation')setView(item.key as View)}}>
          <strong>{item.n}</strong><span>{item.key}</span><small>{item.hint}</small>
        </button>)}
    </div>}

    {section==='research'?<>
      <p className="rw-research-note">Publicly researched connections to explore. Introductions and recommendations have not been verified.</p>
      {opportunities.length?<div className="rw-opportunities">{opportunities.map(item=><article key={item.id} className="rw-opportunity">
        <div className="rw-opportunity-top"><span>{item.connectionType}{item.fitPriority&&<em className="rw-fit">{item.fitPriority.split(':')[0].trim()} fit</em>}</span><a href={/^https:\/\//.test(item.website)?item.website:undefined} target="_blank" rel="noreferrer">Website<ArrowUpRight size={12}/></a></div>
        <h2>{item.startup}</h2><p className="rw-candidate">{item.candidateName} · {item.sector}</p>
        <p className="rw-connection-person">{item.referrerPersonName===item.candidateName?'Reconnect with':'Ask'} <strong>{item.referrerPersonName}</strong><span>{companyName(item.companyId)}</span></p>
        <p className="rw-evidence">{item.connectionEvidence}</p>
        <details className="rw-research-detail"><summary>Why it is worth a conversation<ChevronRight size={13}/></summary><p>{item.whyRelevant}</p><h3>The specific ask</h3><p>{item.suggestedAsk}</p>{item.evidenceStrength&&<><h3>Evidence strength</h3><p>{item.evidenceStrength}</p></>}{item.fitPriority&&<><h3>Mandate fit</h3><p>{item.fitPriority}</p></>}<p className="rw-limitations">{item.limitations}</p></details>
        <div className="rw-opportunity-action"><button type="button" className="sw-outline" onClick={()=>onAskOpportunity(item)}>{data.drafts.some(d=>d.opportunityId===item.id&&!d.archivedAt)?'Continue draft':'Prepare ask'}<ArrowRight size={13}/></button><details><summary>Sources · {item.sources.length}</summary>{item.sources.map(source=><a key={source.url} href={/^https:\/\//.test(source.url)?source.url:undefined} target="_blank" rel="noreferrer">{source.title}<ArrowUpRight size={11}/></a>)}<small>Checked {item.checkedAt}{item.eventDate?` · Event ${item.eventDate}`:''}</small></details></div>
      </article>)}</div>:<div className="rw-filter-empty"><Search size={24}/><h2>No researched connections match</h2><p>Try another company or a broader search.</p><button type="button" className="sw-outline" onClick={clearFilters}>Clear filters</button></div>}
    </>:<>
    <div className="rw-tabs" aria-label="Filter by referral status">{views.map(item=><button type="button" key={item} className={view===item?'active':''} aria-pressed={view===item} onClick={()=>setView(item)}>{item}</button>)}</div>

    {showExamples&&<p className="rw-example-notice">Example referrals are fictional and marked below. They are here to show how the workflow works.</p>}

    {filtered.length>0?<div className="rw-table" aria-label="Referrals">
      <div className="rw-table-heading" aria-hidden="true"><span>Founder / startup</span><span>Referred through</span><span>Where it stands</span><span>Next step</span><span/></div>
      <div className="rw-rows">{filtered.map(deal=>{const due=followUp(deal.followUp),known=deal.intake==='Known to referrer';return <button className={`rw-row${deal.stage==='Closed'?' rw-closed':''}`} type="button" key={deal.id} onClick={()=>onOpen(deal)} aria-label={`Open ${deal.name||'unnamed founder'} at ${deal.startup||'unnamed startup'}, ${deal.source==='sample'?'fictional example, ':''}${known?'known to referrer':'passed to Together'}, ${deal.stage}`}>
        <span className="rw-founder"><strong>{deal.name||'Founder not recorded'}{deal.source==='sample'&&<em>Example</em>}</strong><span>{deal.startup||'Startup not recorded'}</span>{deal.reason&&<small title={deal.reason}>{deal.reason}</small>}</span>
        <span className="rw-referrer"><strong>{deal.referrer||'Referrer not recorded'}</strong><span>{companyName(deal.companyId)}</span></span>
        <span className="rw-status"><span className={`rw-status-label${known?' rw-known':''}`}>{known?'Known to referrer':'Passed to Together'}</span><span className="rw-stage">{known&&deal.stage!=='Closed'?'Introduction not received':deal.stage}</span></span>
        <span className="rw-next"><strong>{nextStep(deal)}</strong>{deal.stage!=='Closed'&&<span className={due?.overdue?'rw-overdue':''}>{due?.label||'No follow-up date'}</span>}<small>Owner · {deal.owner?.trim()||'Unassigned'}{deal.stage!=='Closed'&&deal.permission==='Ask first'?' · Ask before introducing':''}</small></span>
        <ChevronRight className="rw-row-arrow" size={16} aria-hidden="true"/>
      </button>})}</div>
    </div>:filtersActive?<div className="rw-filter-empty"><Search size={24}/><h2>No referrals match these filters</h2><p>Try another founder, company or conversation stage.</p><button type="button" className="sw-outline" onClick={clearFilters}>Clear filters</button></div>:<div className="rw-empty">
      <div className="rw-empty-icon"><Inbox size={27} strokeWidth={1.3}/></div>
      <h2>Your next introduction starts with a conversation</h2>
      <p>Ask a portfolio founder who they think Together should meet. Give them an easy way to share, then keep the introduction moving here.</p>
      <div className="rw-empty-flow" aria-label="Referral workflow"><span>Ask a founder</span><ArrowRight size={14}/><span>Share the form</span><ArrowRight size={14}/><span>Follow the introduction</span></div>
      <div className="rw-empty-actions"><button type="button" className="sw-button" onClick={onRequest}><Mail size={15}/>Draft a referral ask</button><button type="button" className="sw-outline" onClick={onShareForm}><Link2 size={15}/>Get the referral link</button></div>
      <small>{actualDeals.length===0?'No real referrals have been recorded yet.':'No referrals are visible in this view.'}</small>
    </div>}

    <footer className="rw-footer"><p>Record a lead before an introduction, then update its stage when it reaches Together.</p>{examplesAvailable&&<button type="button" onClick={()=>setShowExamples(!showExamples)}>{showExamples?'Hide examples':'See workflow examples'}</button>}</footer>
    </>}
    {savedRequests.length>0&&<details className="rw-saved"><summary><span>Saved requests &amp; replies<small>Resume a draft or review an archived message.</small></span><ChevronRight size={16}/></summary><div>{savedRequests.map(draft=><button type="button" key={draft.id} onClick={()=>onOpenDraft(draft)}><span><strong>{draft.subject||'Untitled referral message'}</strong><small>{companyName(draft.companyId)} · {data.contacts.find(p=>p.id===draft.personId&&p.companyId===draft.companyId)?.name||draft.to||'Recipient not set'}</small></span><span className="rw-saved-state">{draft.archivedAt?'Archived':'Draft'}<ChevronRight size={14}/></span></button>)}</div></details>}
  </section>;
}
