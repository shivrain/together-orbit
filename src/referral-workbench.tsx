import {useMemo,useState} from 'react';
import {ArrowRight,ArrowUpRight,ChevronRight,Link2,Mail,Search,X} from 'lucide-react';
import {companies} from './data';
import type {MailDraft,PlatformData,ReferralOpportunity} from './platform-types';
import './referral-workbench.css';

type Props={data:PlatformData;onRequest:()=>void;onShareForm:()=>void;onOpenDraft:(draft:MailDraft)=>void;onAskOpportunity:(item:ReferralOpportunity)=>void};
const companyName=(id:string)=>id==='other'?'Other / unattributed':companies.find(c=>c.id===id)?.name||'Portfolio company';
const safe=(url?:string)=>url&&/^https:\/\//.test(url)?url:undefined;

export default function ReferralWorkbench({data,onRequest,onShareForm,onOpenDraft,onAskOpportunity}:Props){
  const [query,setQuery]=useState(''),[companyId,setCompanyId]=useState('all');
  const all=data.opportunities||[];
  const researched=all.filter(item=>!item.illustrative);
  const referrals=all.filter(item=>item.illustrative);

  const match=(item:ReferralOpportunity)=>
    (companyId==='all'||item.companyId===companyId)&&
    [item.candidateName,item.startup,item.sector,item.referrerPersonName,companyName(item.companyId),item.connectionEvidence,item.matchBasis]
      .filter(Boolean).join(' ').toLowerCase().includes(query.trim().toLowerCase());

  const shownResearched=useMemo(()=>researched.filter(match),[researched,query,companyId]);
  const shownReferrals=useMemo(()=>referrals.filter(match),[referrals,query,companyId]);
  const filtersActive=Boolean(query.trim()||companyId!=='all');
  const savedRequests=data.drafts.filter(draft=>
    (draft.purpose==='referral-ask'||draft.purpose==='referral-reply')&&(companyId==='all'||draft.companyId===companyId)
  ).sort((a,b)=>{
    if(Boolean(a.archivedAt)!==Boolean(b.archivedAt))return a.archivedAt?1:-1;
    return (Date.parse(b.createdAt)||0)-(Date.parse(a.createdAt)||0);
  });

  return <section className="rw" aria-labelledby="rw-title">
    <header className="rw-heading">
      <div><p className="rw-eyebrow">FOUNDERS TO ASK ABOUT</p><h1 id="rw-title">Leads</h1><p>Someone in the portfolio is already one step away from a founder we should meet. These are the routes worth asking about.</p></div>
      <div className="rw-heading-actions"><button type="button" className="sw-outline" onClick={onShareForm}><Link2 size={15}/>Share referral form</button><button type="button" className="sw-button" onClick={onRequest}><Mail size={16}/>Ask a founder</button></div>
    </header>

    <div className="rw-tools">
      <label className="rw-search"><Search size={16} aria-hidden="true"/><input aria-label="Search leads" placeholder="Search founder, startup or portfolio company" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button type="button" aria-label="Clear search" onClick={()=>setQuery('')}><X size={14}/></button>}</label>
      <label className="rw-company-filter"><span>Portfolio connection</span><select aria-label="Filter by portfolio company" value={companyId} onChange={e=>setCompanyId(e.target.value)}><option value="all">All portfolio companies</option>{[...companies].sort((a,b)=>a.name.localeCompare(b.name)).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    </div>

    {shownReferrals.length>0&&<section className="rw-referral-lead">
      <h2 className="rw-group-title">Referrals<span>{shownReferrals.length}</span></h2>
      <div className="rw-referral-grid">{shownReferrals.map(item=><article key={item.id} className="rw-referral">
        <h3>{item.startup}</h3>
        <p className="rw-referral-sector">{item.candidateName} · {item.sector}</p>
        <p className="rw-referral-by">Referred by <strong>{companyName(item.companyId)}</strong></p>
        <p className="rw-referral-basis">{item.matchBasis}</p>
      </article>)}</div>
    </section>}


    <h2 className="rw-group-title">Researched routes<span>{shownResearched.length}</span></h2>
    <p className="rw-research-note">Documented connections into founders we have not met. No introduction has been requested and none is implied.</p>
    {shownResearched.length?<div className="rw-opportunities">{shownResearched.map(item=><article key={item.id} className="rw-opportunity">
      <div className="rw-opportunity-top"><span>{item.connectionType}{item.fitPriority&&<em className="rw-fit">{item.fitPriority.split(':')[0].trim()} fit</em>}</span>{safe(item.website)&&<a href={safe(item.website)} target="_blank" rel="noreferrer">Website<ArrowUpRight size={12}/></a>}</div>
      <h3>{item.startup}</h3><p className="rw-candidate">{item.candidateName} · {item.sector}</p>
      <p className="rw-connection-person">{item.referrerPersonName===item.candidateName?'Reconnect with':'Ask'} <strong>{item.referrerPersonName}</strong><span>{companyName(item.companyId)}</span></p>
      <p className="rw-evidence">{item.connectionEvidence}</p>
      <details className="rw-research-detail"><summary>Why it is worth a conversation<ChevronRight size={13}/></summary><p>{item.whyRelevant}</p><h4>The specific ask</h4><p>{item.suggestedAsk}</p>{item.evidenceStrength&&<><h4>Evidence strength</h4><p>{item.evidenceStrength}</p></>}{item.fitPriority&&<><h4>Mandate fit</h4><p>{item.fitPriority}</p></>}<p className="rw-limitations">{item.limitations}</p></details>
      <div className="rw-opportunity-action"><button type="button" className="sw-outline" onClick={()=>onAskOpportunity(item)}>{data.drafts.some(d=>d.opportunityId===item.id&&!d.archivedAt)?'Continue draft':'Prepare ask'}<ArrowRight size={13}/></button><details><summary>Sources · {item.sources.length}</summary>{item.sources.map(source=><a key={source.url} href={safe(source.url)} target="_blank" rel="noreferrer">{source.title}<ArrowUpRight size={11}/></a>)}<small>Checked {item.checkedAt}{item.eventDate?` · Event ${item.eventDate}`:''}</small></details></div>
    </article>)}</div>:<div className="rw-filter-empty"><Search size={24}/><h3>No evidence-backed routes match</h3><p>Try another company or a broader search.</p>{filtersActive&&<button type="button" className="sw-outline" onClick={()=>{setQuery('');setCompanyId('all')}}>Clear filters</button>}</div>}

    <div className="rw-intake-strip"><span>A name, a link and a little context are enough to get started.</span><button type="button" onClick={onShareForm}><Link2 size={14}/>Share referral form<ArrowRight size={13}/></button></div>

    {savedRequests.length>0&&<details className="rw-saved"><summary><span>Saved requests &amp; replies<small>Resume a draft or review an archived message.</small></span><ChevronRight size={16}/></summary><div>{savedRequests.map(draft=><button type="button" key={draft.id} onClick={()=>onOpenDraft(draft)}><span><strong>{draft.subject||'Untitled referral message'}</strong><small>{companyName(draft.companyId)} · {data.contacts.find(p=>p.id===draft.personId&&p.companyId===draft.companyId)?.name||draft.to||'Recipient not set'}</small></span><span className="rw-saved-state">{draft.archivedAt?'Archived':'Draft'}<ChevronRight size={14}/></span></button>)}</div></details>}
  </section>;
}
