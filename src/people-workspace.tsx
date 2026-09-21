import {useEffect,useState,type FormEvent} from 'react';
import {ArrowRight,ArrowUpRight,Building2,CalendarDays,Check,ChevronRight,ExternalLink,GitBranch,Mail,Plus,Search,UserRound,Users} from 'lucide-react';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {toast} from 'sonner';
import {companies} from './data';
import {isPortfolioFounder} from './people';
import type {Contact,PlatformData} from './platform-types';
import './people-workspace.css';

type Props={data:PlatformData;onSave:(kind:string,value:unknown)=>Promise<void>;onEngage:(person:Contact)=>void;onMoves:(person:Contact)=>void;onReferral:(person:Contact)=>void;selectedPersonId?:string;onSelectPerson?:(id:string)=>void};
const kinds=['Founder','Leadership','Team','Alumni'] as const;
const initials=(name:string)=>name.split(' ').filter(Boolean).slice(0,2).map(s=>s[0]).join('');
const date=(value?:string)=>value?new Date(value.length===10?`${value}T12:00:00`:value).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'Not recorded';
const safeLink=(value?:string)=>value&&/^https?:\/\//i.test(value)?value:undefined;
const today=()=>new Date().toLocaleDateString('en-CA');

export function PeopleWorkspace({data,onSave,onEngage,onMoves,onReferral,selectedPersonId,onSelectPerson}:Props){
 const [companyId,setCompanyId]=useState('composio');
 const [personId,setPersonId]=useState('founder-composio-0');
 const [query,setQuery]=useState('');
 const [editor,setEditor]=useState<Contact|null>(null);
 const [saving,setSaving]=useState(false);
 useEffect(()=>{if(!selectedPersonId)return;const selected=data.contacts.find(p=>p.id===selectedPersonId);if(selected){setCompanyId(selected.companyId);setPersonId(selected.id)}},[selectedPersonId,data.contacts]);
 const pickPerson=(id:string)=>{setPersonId(id);onSelectPerson?.(id)};
 const company=companies.find(c=>c.id===companyId)||companies[0];
 const people=data.contacts.filter(p=>p.companyId===company.id);
 const person=people.find(p=>p.id===personId)||people[0];
 const search=query.toLowerCase().trim();
 const visibleCompanies=companies.filter(c=>`${c.name} ${c.sector} ${data.contacts.filter(p=>p.companyId===c.id).map(p=>`${p.name} ${p.role}`).join(' ')}`.toLowerCase().includes(search));
 const teamMapped=people.some(p=>p.kind&&p.kind!=='Founder');
 const personDeals=person?data.deals.filter(d=>d.referrerPersonId===person.id&&d.source!=='sample'):[];
 const personDrafts=person?data.drafts.filter(d=>d.personId===person.id):[];
 const personMoves=person?data.movements.filter(m=>m.personId===person.id):[];
 const pickCompany=(id:string)=>{setCompanyId(id);const match=data.contacts.find(p=>p.companyId===id&&search&&`${p.name} ${p.role}`.toLowerCase().includes(search));pickPerson(match?.id||data.contacts.find(p=>p.companyId===id)?.id||'')};
 const newPerson=()=>setEditor({id:`person-${crypto.randomUUID()}`,companyId:company.id,name:'',email:'',role:'',interests:company.sector,kind:'Team',profile:'',sourceUrl:'',notes:'',lastContactAt:'',nextFollowUpAt:''});
 const savePerson=async(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();if(!editor||saving)return;setSaving(true);try{await onSave('contact',{...editor,name:editor.name.trim(),email:editor.email.trim()});pickPerson(editor.id);setEditor(null);toast.success('Person and relationship saved in this browser')}catch(error){toast.error(error instanceof Error?error.message:'Could not save this person')}finally{setSaving(false)}};

 return <section className="people-workspace">
  <div className="page-title"><div><p className="overline">01 / MAP THE RELATIONSHIPS</p><h1>Know who to stay close to.</h1><p>Start with each company’s founders. Add the leaders, teammates and alumni who know the next generation of builders.</p></div><button className="p-primary" onClick={newPerson}><Plus size={16}/>Add a person</button></div>
  <div className="pw-map-layout">
   <aside className="pw-company-list" aria-label="Portfolio companies">
    <div className="pw-directory-heading"><Building2 size={17}/><h2>Your portfolio</h2><span>{companies.length}</span></div>
    <label className="pw-search"><Search size={16}/><input placeholder="Find a company or person" aria-label="Search companies and people" value={query} onChange={e=>setQuery(e.target.value)}/></label>
    <div className="pw-company-scroll">{visibleCompanies.map(c=>{const companyPeople=data.contacts.filter(p=>p.companyId===c.id);const mapped=companyPeople.some(p=>p.kind&&p.kind!=='Founder');return <button key={c.id} className={`pw-company ${c.id===company.id?'active':''}`} onClick={()=>pickCompany(c.id)} aria-pressed={c.id===company.id}><span className="pw-company-avatar">{initials(c.name)}</span><span><strong>{c.name}</strong><small>{c.sector}</small><em className={mapped?'mapped':''}>{mapped?'Team map started':'Founders mapped · add team'}</em></span><ChevronRight size={14}/></button>})}{!visibleCompanies.length&&<p className="pw-no-company">No companies or people match that search.</p>}</div>
    <p className="pw-directory-note">A public founder map to build on.<br/>Add your own relationship context.</p>
   </aside>
   <div className="pw-company-workspace">
    <header className="pw-company-heading"><div className="pw-company-heading-title"><span className="pw-large-avatar">{initials(company.name)}</span><div><span className="pw-eyebrow">{company.sector}</span><h2>{company.name}</h2><p>{company.description}</p></div></div><a className="p-link" href={company.sourceUrl} target="_blank" rel="noreferrer">Portfolio source<ArrowUpRight size={14}/></a></header>
    <div className="pw-map-context"><Users size={18}/><div><strong>{teamMapped?'Build the map beyond the founding team':'Founders are the starting point'}</strong><p>Public portfolio listings seed the founders below. Add leadership, key teammates and alumni; current roles need a source check.</p></div><button className="p-link" onClick={newPerson}><Plus size={14}/>Add team</button></div>
    <div className="pw-people-heading"><h3>People & relationships</h3><span>Select someone to take the next step</span></div>
    <div className="pw-people-grid">{people.map(p=><button key={p.id} className={`pw-person-card ${person?.id===p.id?'selected':''}`} onClick={()=>pickPerson(p.id)} aria-pressed={person?.id===p.id}><span className="pw-person-avatar">{initials(p.name)}</span><span className="pw-person-card-copy"><strong>{p.name}</strong><small>{p.role||'Add their role'}</small><span className="pw-person-meta"><em>{p.kind||'Contact'}</em>{p.nextFollowUpAt&&<span><CalendarDays size={11}/>{date(p.nextFollowUpAt)}</span>}</span></span><ChevronRight size={15}/></button>)}<button className="pw-person-card pw-add-card" onClick={newPerson}><span className="pw-person-avatar"><Plus size={20}/></span><span><strong>Who else should we know?</strong><small>Leadership, key talent or alumni</small></span></button></div>
    {person&&<article className="pw-relationship-card">
     <div className="pw-relationship-top"><div><span className="pw-eyebrow">RELATIONSHIP WORKSPACE</span><h3>{person.name}</h3><p>{person.kind==='Alumni'?'Alumni relationship':person.role||'Role to be added'}{person.email&&<> · {person.email}</>}</p></div><button className="p-secondary" onClick={()=>setEditor({...person})}>Edit person & follow-up</button></div>
     <div className="pw-provenance"><span className="pw-provenance-dot"/><span>{isPortfolioFounder(person)?'Founder listed in Together’s public portfolio. Current employment is not verified.':'Manually added relationship. Check the linked source for role and company context.'}</span>{safeLink(person.sourceUrl)&&<a href={safeLink(person.sourceUrl)} target="_blank" rel="noreferrer">Source<ExternalLink size={12}/></a>}{safeLink(person.profile)&&<a href={safeLink(person.profile)} target="_blank" rel="noreferrer">Profile<ExternalLink size={12}/></a>}</div>
     <div className="pw-relationship-body"><div className="pw-relationship-context"><div><span className="pw-eyebrow">WHAT WE KNOW</span><p>{person.notes||'No relationship context recorded yet. Add what they care about, where your relationship started, and the people they tend to help.'}</p>{person.interests&&<span className="pw-interest">{person.interests}</span>}</div><div className="pw-touchpoint-dates"><div><span>Last touchpoint</span><strong>{date(person.lastContactAt)}</strong></div><div><span>Next follow-up</span><strong className={person.nextFollowUpAt&&person.nextFollowUpAt.slice(0,10)<=today()?'due':''}>{date(person.nextFollowUpAt)}</strong></div></div></div><div className="pw-next-action"><span className="pw-eyebrow">SUGGESTED NEXT STEP</span><h4>{person.lastContactAt?'Keep the relationship warm':'Start with a useful check-in'}</h4><p>Share something relevant to {company.name}, then ask about a builder they mentor or a promising product they have come across.</p><button className="p-primary" onClick={()=>onEngage(person)}><Mail size={15}/>Prepare a check-in<ArrowRight size={15}/></button></div></div>
     {(personDrafts.length>0||personMoves.length>0||personDeals.length>0)&&<div className="pw-linked-records"><span>Linked to this relationship</span>{personDrafts.length>0&&<span><Mail size={13}/>{personDrafts.length} saved {personDrafts.length===1?'draft':'drafts'}</span>}{personMoves.length>0&&<span><GitBranch size={13}/>{personMoves.length} recorded {personMoves.length===1?'move':'moves'}</span>}{personDeals.length>0&&<span><UserRound size={13}/>{personDeals.length} {personDeals.length===1?'referral':'referrals'}</span>}</div>}
     <div className="pw-relationship-actions"><span>When the relationship creates a signal</span><div><button className="p-link" onClick={()=>onMoves(person)}><GitBranch size={15}/>View their moves</button><button className="p-link" onClick={()=>onReferral(person)}><Plus size={15}/>Add their referral<ArrowRight size={14}/></button></div></div>
    </article>}
    <p className="pw-local-note">People, relationship notes and follow-ups save in this browser. Export your workspace to keep a copy.</p>
   </div>
  </div>
  <Dialog open={!!editor} onOpenChange={open=>{if(!open&&!saving)setEditor(null)}}><DialogContent className="pw-editor"><DialogHeader><DialogTitle>{data.contacts.some(p=>p.id===editor?.id)?'Edit this relationship':'Add someone to the map'}</DialogTitle><DialogDescription>{companies.find(c=>c.id===editor?.companyId)?.name} · Keep the role, source and relationship context together.</DialogDescription></DialogHeader>{editor&&<form onSubmit={savePerson}>
   <div className="pw-form-row"><label>Name<input required value={editor.name} onChange={e=>setEditor({...editor,name:e.target.value})} placeholder="Full name"/></label><label>Relationship group<Select value={editor.kind||'Team'} onValueChange={value=>setEditor({...editor,kind:value as Contact['kind']})}><SelectTrigger aria-label="Relationship group"><SelectValue/></SelectTrigger><SelectContent>{kinds.map(kind=><SelectItem key={kind} value={kind}>{kind}</SelectItem>)}</SelectContent></Select></label></div>
   <div className="pw-form-row"><label>Role<input value={editor.role} onChange={e=>setEditor({...editor,role:e.target.value})} placeholder="e.g. Engineering lead"/></label><label>Email<input type="email" value={editor.email} onChange={e=>setEditor({...editor,email:e.target.value})} placeholder="Add when known"/></label></div>
   <div className="pw-form-row"><label>Profile link<input type="url" value={editor.profile||''} onChange={e=>setEditor({...editor,profile:e.target.value})} placeholder="https://…"/></label><label>Source for role / company<input type="url" value={editor.sourceUrl||''} onChange={e=>setEditor({...editor,sourceUrl:e.target.value})} placeholder="https://…"/></label></div>
   <label>Interests / relevant topics<input value={editor.interests} onChange={e=>setEditor({...editor,interests:e.target.value})} placeholder="What would be useful to share?"/></label>
   <label>Relationship context<textarea rows={3} value={editor.notes||''} onChange={e=>setEditor({...editor,notes:e.target.value})} placeholder="How you know them, people they mentor, or products they are exploring…"/></label>
   <div className="pw-form-row"><label>Last touchpoint<input type="date" value={editor.lastContactAt?.slice(0,10)||''} onChange={e=>setEditor({...editor,lastContactAt:e.target.value})}/></label><label>Next follow-up<input type="date" value={editor.nextFollowUpAt?.slice(0,10)||''} onChange={e=>setEditor({...editor,nextFollowUpAt:e.target.value})}/></label></div>
   <p className="pw-editor-note">Add dates for real interactions. Saving a draft does not count as a sent message or touchpoint.</p><div className="pw-editor-actions"><button className="p-secondary" type="button" disabled={saving} onClick={()=>setEditor(null)}>Cancel</button><button className="p-primary" disabled={saving}><Check size={15}/>{saving?'Saving…':'Save relationship'}</button></div>
  </form>}</DialogContent></Dialog>
 </section>
}
