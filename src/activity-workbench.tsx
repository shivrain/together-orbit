import {useMemo, useState} from 'react';
import {ArrowRight, ArrowUpRight, ExternalLink, Radio, Search, X} from 'lucide-react';
import {companies} from './data';
import type {Contact, Movement, PlatformData} from './platform-types';
import './activity-workbench.css';

type Props = {data: PlatformData; onAsk: (person: Contact, move: Movement) => void};
const companyName = (id: string) => companies.find(c => c.id === id)?.name || 'Portfolio company';
const safe = (url?: string) => url && /^https?:\/\//i.test(url) ? url : undefined;
const dateOf = (value?: string) => value && Number.isFinite(Date.parse(value))
  ? new Date(value.length === 10 ? `${value}T12:00:00` : value).toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'})
  : 'Date not recorded';
const stamp = (m: Movement) => Date.parse(m.eventDate || m.observedAt) || 0;

// Someone leaving to found something is the signal worth acting on; a job change is context.
const ORDER: Record<string, number> = {'Started company': 0, 'New role': 1, 'Departure': 2};
const FILTERS = ['All', 'Started company', 'New role'] as const;

export default function ActivityWorkbench({data, onAsk}: Props) {
  const [filter, setFilter] = useState<typeof FILTERS[number]>('All');
  const [companyId, setCompanyId] = useState('all');
  const [query, setQuery] = useState('');
  const search = query.trim().toLowerCase();

  const moves = useMemo(() => data.movements.filter(m =>
    (filter === 'All' || m.type === filter) &&
    (companyId === 'all' || m.companyId === companyId) &&
    (!search || [m.person, m.currentCompany, m.currentRole, m.previousRole, companyName(m.companyId), m.evidence].join(' ').toLowerCase().includes(search))
  ).sort((a, b) => (ORDER[a.type] ?? 3) - (ORDER[b.type] ?? 3) || stamp(b) - stamp(a)), [data.movements, filter, companyId, search]);

  const founded = data.movements.filter(m => m.type === 'Started company').length;
  const withCompanies = [...new Set(data.movements.map(m => m.companyId))];

  return <section className="aw">
    <header className="aw-heading">
      <div><p className="aw-eyebrow">WHO JUST LEFT</p><h1>Activity</h1><p>People who have left a portfolio company. The ones who left to start something are the reason this view exists.</p></div>
      <div className="aw-count"><strong>{founded}</strong><span>started a company</span></div>
    </header>

    <div className="aw-tools">
      <label className="aw-search"><Search size={16} aria-hidden="true"/><input aria-label="Search activity" placeholder="Search person, company or role" value={query} onChange={e => setQuery(e.target.value)}/>{query && <button type="button" aria-label="Clear search" onClick={() => setQuery('')}><X size={14}/></button>}</label>
      <div className="aw-filters" aria-label="Filter by movement type">{FILTERS.map(f => {
        const n = f === 'All' ? data.movements.length : data.movements.filter(m => m.type === f).length;
        return <button type="button" key={f} className={filter === f ? 'active' : ''} aria-pressed={filter === f} onClick={() => setFilter(f)}>{f === 'All' ? 'Everyone' : f === 'Started company' ? 'Started a company' : 'Joined elsewhere'}<span>{n}</span></button>;
      })}</div>
      <label className="aw-company-filter"><span>From</span><select aria-label="Filter by portfolio company" value={companyId} onChange={e => setCompanyId(e.target.value)}><option value="all">Any portfolio company</option>{withCompanies.map(id => <option key={id} value={id}>{companyName(id)}</option>)}</select></label>
    </div>

    {moves.length ? <div className="aw-list">{moves.map(m => {
      const founder = data.contacts.find(p => p.companyId === m.companyId && p.kind === 'Founder');
      return <article className="aw-card" key={m.id}>
        <div className="aw-card-top">
          <span className={`aw-type aw-type-${m.type.toLowerCase().replace(/ /g, '-')}`}>{m.type === 'Started company' ? 'Started a company' : m.type}</span>
          <span className="aw-date">{dateOf(m.eventDate || m.observedAt)}</span>
        </div>
        <h2>{m.person}</h2>
        <div className="aw-journey">
          <div><small>WAS</small><strong>{m.previousRole || 'Role not recorded'}</strong><span>{m.previousCompany || companyName(m.companyId)}</span></div>
          <ArrowRight size={16} aria-hidden="true"/>
          <div><small>NOW</small><strong>{m.currentRole || 'Role not recorded'}</strong><span>{m.currentCompany || 'Not announced'}</span></div>
        </div>
        <p className="aw-evidence">{m.evidence}</p>
        <div className="aw-card-actions">
          <span className="aw-provenance">{m.provider}{m.confirmed ? ' · reviewed' : ' · source not yet reviewed'}</span>
          <div>
            {safe(m.sourceUrl) && <a className="aw-link" href={safe(m.sourceUrl)} target="_blank" rel="noreferrer">Source<ExternalLink size={12}/></a>}
            {safe(m.profile) && safe(m.profile) !== safe(m.sourceUrl) && <a className="aw-link" href={safe(m.profile)} target="_blank" rel="noreferrer">Company<ArrowUpRight size={12}/></a>}
            {founder && <button type="button" className="sw-outline" onClick={() => onAsk(founder, m)}>Ask {founder.name.split(' ')[0]}<ArrowRight size={13}/></button>}
          </div>
        </div>
      </article>;
    })}</div> : <div className="aw-empty">
      <Radio size={26}/>
      <h2>{data.movements.length ? 'No moves match this filter.' : 'No movement recorded yet.'}</h2>
      <p>{data.movements.length ? 'Try another company or a broader search.' : 'A departure appears here with the person, where they went, the source and a date.'}</p>
      {(search || filter !== 'All' || companyId !== 'all') && <button type="button" className="sw-outline" onClick={() => {setQuery(''); setFilter('All'); setCompanyId('all');}}>Clear filters</button>}
    </div>}

    <p className="aw-footnote">Every row is a public source someone has to read before acting on it. A person leaving is not evidence that they are raising, and none of this implies consent to be contacted.</p>
  </section>;
}
