import {useEffect, useMemo, useState} from 'react';
import {ArrowRight, ArrowUpRight, BookOpen, ChevronLeft, FileText, Search, X} from 'lucide-react';
import {companies} from './data';
import {contentKinds, type Contact, type ContentKind, type FeedItem, type MailDraft, type PlatformData} from './platform-types';
import {recipientAngle} from './engagement-message';
import './content-workbench.css';

type Props = {
  data: PlatformData;
  onCompose: (person: Contact, item: FeedItem) => void;
  onOpenDraft: (draft: MailDraft) => void;
};

const nameOf = (id: string) => companies.find(company => company.id === id)?.name || 'Portfolio company';
const dateOf = (value: string) => Number.isFinite(Date.parse(value))
  ? new Date(value.length === 10 ? `${value}T12:00:00` : value).toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'})
  : 'Date not listed';
const sourceLink = (value: string) => /^https?:\/\//i.test(value) ? value : undefined;
const timestamp = (value: string) => Number.isFinite(Date.parse(value)) ? Date.parse(value) : 0;
const byRecipient = (a: Contact, b: Contact) => Number(b.kind === 'Founder') - Number(a.kind === 'Founder') || a.name.localeCompare(b.name);

export default function ContentWorkbench({data, onCompose, onOpenDraft}: Props) {
  const [view, setView] = useState<'reads' | 'drafts'>('reads');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [articleId, setArticleId] = useState('');
  const [recipientCompany, setRecipientCompany] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [showHandled, setShowHandled] = useState(false);
  const [kindFilter, setKindFilter] = useState<ContentKind | 'all'>('all');
  const [mobileDetail, setMobileDetail] = useState(false);
  const search = query.trim().toLowerCase();

  const items = useMemo(() => data.feed.filter(item =>
    (companyFilter === 'all' || item.companyIds.includes(companyFilter)) &&
    (kindFilter === 'all' || item.kind === kindFilter) &&
    (!search || [item.title, item.publisher, item.topic, item.summary, item.url, ...(item.takeaways||[]), ...(item.sources||[]).map(source=>`${source.title} ${source.url}`), ...(item.recipientAngles||[]).map(angle=>`${angle.personName} ${angle.angle}`), ...item.companyIds.map(nameOf)].join(' ').toLowerCase().includes(search))
  ).sort((a, b) => timestamp(b.publishedAt) - timestamp(a.publishedAt)), [data.feed, companyFilter, kindFilter, search]);
  const article = items.find(item => item.id === articleId) || items[0];
  const engagementDrafts = useMemo(() => data.drafts.filter(draft => !draft.dealId && draft.purpose !== 'referral-ask' && draft.purpose !== 'referral-reply'), [data.drafts]);
  const openDraftCount = engagementDrafts.filter(draft => !draft.archivedAt).length;
  const drafts = engagementDrafts.filter(draft =>
    (showHandled ? Boolean(draft.archivedAt) : !draft.archivedAt) &&
    (companyFilter === 'all' || draft.companyId === companyFilter) &&
    (!search || [draft.subject, draft.to, nameOf(draft.companyId), data.contacts.find(person => person.id === draft.personId)?.name || ''].join(' ').toLowerCase().includes(search))
  ).sort((a, b) => timestamp(b.createdAt) - timestamp(a.createdAt));

  const relevantCompanies = useMemo(() => companies.filter(company =>
    article?.companyIds.includes(company.id) &&
    (companyFilter === 'all' || company.id === companyFilter) &&
    data.contacts.some(person => person.companyId === company.id)
  ), [article, companyFilter, data.contacts]);
  const activeCompany = relevantCompanies.find(company => company.id === recipientCompany) || relevantCompanies[0];
  const recipients = useMemo(() => data.contacts.filter(person => person.companyId === activeCompany?.id).sort((a,b)=>Number(Boolean(article&&recipientAngle(b,article)))-Number(Boolean(article&&recipientAngle(a,article)))||byRecipient(a,b)), [data.contacts, activeCompany, article]);
  const recipient = recipients.find(person => person.id === recipientId) || recipients[0];
  const angle=recipient&&article?recipientAngle(recipient,article):undefined;
  const matchingDraft = article && recipient ? engagementDrafts.find(draft =>
    !draft.archivedAt && draft.resourceId === article.id && draft.personId === recipient.id && draft.companyId === recipient.companyId
  ) : undefined;

  useEffect(() => {
    setArticleId(article?.id || '');
  }, [article?.id]);

  function selectArticle(item: FeedItem) {
    setArticleId(item.id);
    setRecipientCompany(companyFilter === 'all' ? '' : companyFilter);
    setRecipientId('');
    setMobileDetail(true);
  }

  function changeCompany(value: string) {
    setCompanyFilter(value);
    setRecipientCompany(value === 'all' ? '' : value);
    setRecipientId('');
    setMobileDetail(false);
  }

  return <section className="cw">
    <header className="cw-heading">
      <div><p className="cw-eyebrow">STAY IN THE CONVERSATION</p><h1>Content worth sharing.</h1><p>A useful insight. The right founder. A reason to reconnect.</p></div>
      <div className="cw-view-switch" aria-label="Content view">
        <button type="button" className={view === 'reads' ? 'active' : ''} aria-pressed={view === 'reads'} onClick={() => setView('reads')}><BookOpen size={14}/>Useful reads</button>
        <button type="button" className={view === 'drafts' ? 'active' : ''} aria-pressed={view === 'drafts'} onClick={() => setView('drafts')}><FileText size={14}/>Saved drafts{openDraftCount > 0 && <span>{openDraftCount}</span>}</button>
      </div>
    </header>

    <div className="cw-toolbar">
      <label className="cw-search"><Search size={16}/><input aria-label={view === 'reads' ? 'Search useful reads' : 'Search saved drafts'} placeholder={view === 'reads' ? 'Find a topic, insight or source…' : 'Find a draft…'} value={query} onChange={event => setQuery(event.target.value)}/>{query && <button type="button" aria-label="Clear search" onClick={() => setQuery('')}><X size={14}/></button>}</label>
      <label className="cw-company-filter"><span>For</span><select aria-label="Filter by portfolio company" value={companyFilter} onChange={event => changeCompany(event.target.value)}><option value="all">All portfolio companies</option>{companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
      {view === 'drafts' && <button className="cw-history-toggle" type="button" onClick={() => setShowHandled(!showHandled)}>{showHandled ? 'Show active drafts' : 'View archived'}</button>}
    </div>

    {view === 'reads' && <div className="cw-kinds" aria-label="Filter by why it earns a reply">
      <button type="button" className={kindFilter === 'all' ? 'active' : ''} aria-pressed={kindFilter === 'all'} onClick={() => setKindFilter('all')}>Everything<span>{data.feed.length}</span></button>
      {contentKinds.map(kind => {const n = data.feed.filter(item => item.kind === kind).length; return n ? <button type="button" key={kind} className={kindFilter === kind ? 'active' : ''} aria-pressed={kindFilter === kind} onClick={() => setKindFilter(kind)}>{kind}<span>{n}</span></button> : null;})}
    </div>}

    {view === 'reads' ? (article ? <div className={`cw-workbench ${mobileDetail ? 'cw-show-detail' : ''}`}>
      <aside className="cw-read-list" aria-label="Useful reads">
        <div className="cw-list-label"><span>{items.length} {items.length === 1 ? 'useful read' : 'useful reads'}</span><span>Newest first</span></div>
        {items.map(item => {const angles=(item.recipientAngles||[]).length;const sent=engagementDrafts.some(draft=>draft.resourceId===item.id);return <button type="button" key={item.id} className={`cw-read ${article.id === item.id ? 'active' : ''}`} aria-pressed={article.id === item.id} onClick={() => selectArticle(item)}>
          <span className="cw-read-meta">{item.publisher}<span>{dateOf(item.publishedAt)}</span></span>
          <strong>{item.title}</strong>
          <span className="cw-read-topic">{item.topic}</span>
          {item.kind && <span className={`cw-kind-tag cw-kind-${item.kind.toLowerCase().replace(/ /g, '-')}`}>{item.kind}</span>}
          <span className="cw-read-foot"><span className="cw-read-companies">{item.companyIds.map(nameOf).slice(0, 3).join(' · ')}{item.companyIds.length > 3 ? ` +${item.companyIds.length - 3}` : ''}</span>{angles>0&&<em className="cw-read-count">{angles} {angles===1?'person':'people'}</em>}{sent&&<em className="cw-read-done">Drafted</em>}</span>
        </button>})}
      </aside>

      <article className="cw-detail" key={article.id}>
        <button className="cw-back" type="button" onClick={() => setMobileDetail(false)}><ChevronLeft size={14}/>All useful reads</button>
        <div className="cw-detail-meta"><span>{article.topic}</span><a href={sourceLink(article.url)} target="_blank" rel="noreferrer">Read source<ArrowUpRight size={13}/></a></div>
        <h2>{article.title}</h2>
        <p className="cw-byline">{article.publisher}{article.format&&<span>{article.format}</span>}<span>Published {dateOf(article.publishedAt)}</span>{article.kind&&<span className={`cw-kind-tag cw-kind-${article.kind.toLowerCase().replace(/ /g, '-')}`}>{article.kind}</span>}</p>
        <section className="cw-insight"><h3>The useful idea</h3><p>{article.summary}</p></section>
        {!!article.takeaways?.length&&<section className="cw-takeaways"><h3>What to take from it</h3><ul>{article.takeaways.map(takeaway=><li key={takeaway}>{takeaway}</li>)}</ul></section>}
        <section className="cw-relevance"><h3>Why share it</h3><p>{article.whyRelevant}</p></section>
        {article.discussionQuestion&&<section className="cw-question"><h3>A question worth asking</h3><p>{article.discussionQuestion}</p></section>}

        <section className="cw-share">
          <div className="cw-share-title"><span className="cw-step">↗</span><div><h3>Turn this into a conversation</h3><p>{article.engagementMove || 'Choose who it would be useful for.'}</p></div></div>
          {recipient && activeCompany ? <>
            <div className="cw-recipient-fields">
              <label>Company<select value={activeCompany.id} onChange={event => {setRecipientCompany(event.target.value); setRecipientId('');}}>{relevantCompanies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
              <label>Person<select value={recipient.id} onChange={event => setRecipientId(event.target.value)}>{recipients.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
            </div>
            <p className="cw-recipient-role">{recipient.name} · {recipient.role}</p>
            {angle?<div className="cw-person-angle"><h4>Why {recipient.name.split(' ')[0]}</h4><p>{angle.whyThisPerson}</p><h4>The conversation to open</h4><p>{angle.angle}</p><details><summary>Preview the personal note</summary><p>{angle.emailBody}</p></details></div>:<div className="cw-person-angle"><h4>No researched note for {recipient.name.split(' ')[0]} yet</h4><p>The message will start from the brief’s general note. Add your own observation before sending, or choose a person with a researched angle.</p></div>}
            <div className="cw-share-action"><button type="button" className="cw-primary" onClick={() => matchingDraft ? onOpenDraft(matchingDraft) : onCompose(recipient, article)}>{matchingDraft ? 'Continue draft' : 'Prepare message'}<ArrowRight size={15}/></button><span>A personal note you can review and edit.</span></div>
          </> : <p className="cw-no-recipient">No saved contact is mapped to this read yet. You can still use the source in a conversation.</p>}
        </section>
        {!!article.sources?.length&&<details className="cw-sources"><summary>Research sources</summary>{article.sources.map(source=><a key={source.url} href={sourceLink(source.url)} target="_blank" rel="noreferrer">{source.title}<ArrowUpRight size={12}/></a>)}{recipient?.research?.sources?.map(source=><a key={source.url} href={sourceLink(source.url)} target="_blank" rel="noreferrer">Recipient context · {source.title}<ArrowUpRight size={12}/></a>)}</details>}
        <p className="cw-source-note">Source checked {dateOf(article.checkedAt)} · Suggested relevance for your next conversation.</p>
      </article>
    </div> : <div className="cw-empty"><BookOpen size={25}/><h2>{data.feed.length ? 'No reads match this selection.' : 'Useful reads will appear here.'}</h2><p>{data.feed.length ? 'Try another company or a broader topic.' : 'A read will include its source, the useful idea and a message you can tailor.'}</p>{(query || companyFilter !== 'all' || kindFilter !== 'all') && <button type="button" className="cw-secondary" onClick={() => {setQuery(''); setKindFilter('all'); changeCompany('all');}}>Clear filters</button>}</div>) : <section className="cw-drafts" aria-label="Saved content drafts">
      <div className="cw-drafts-label"><h2>{showHandled ? 'Archived drafts' : 'Ready when you are'}</h2><p>{showHandled ? 'Archived notes stay here for reference.' : 'Saved in this browser. Open a draft to edit or copy it.'}</p></div>
      {drafts.length ? drafts.map(draft => {
        const person = data.contacts.find(contact => contact.id === draft.personId && contact.companyId === draft.companyId);
        return <button type="button" className="cw-draft" key={draft.id} onClick={() => onOpenDraft(draft)}><span className="cw-draft-icon"><FileText size={18}/></span><span className="cw-draft-main"><strong>{draft.subject || 'Untitled message'}</strong><small>{person?.name || draft.to || 'Recipient not added'} · {nameOf(draft.companyId)}</small></span><span className="cw-draft-date">{dateOf(draft.createdAt)}<small>{draft.archivedAt ? 'Archived' : 'Draft'}</small></span><ArrowRight size={15}/></button>;
      }) : <div className="cw-empty"><FileText size={25}/><h2>{showHandled ? 'No archived drafts here.' : 'Start with something useful.'}</h2><p>{query || companyFilter !== 'all' ? 'No drafts match these filters.' : 'Choose a read, choose a founder and prepare a personal message.'}</p><button type="button" className="cw-secondary" onClick={() => setView('reads')}>Browse useful reads<ArrowRight size={14}/></button></div>}
    </section>}
  </section>;
}
