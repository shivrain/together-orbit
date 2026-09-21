import {useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,Check,ChevronDown,Copy,Mail} from 'lucide-react';
import {companies} from './data';
import './referral-intake.css';

export type ReferralIntakeValues={
  companyId:string;
  referrer:string;
  founder:string;
  startup:string;
  context:string;
  website?:string;
  connection?:string;
  permission?:'Ask first'|'Yes';
};

const oneLine=(value:string)=>value.trim().replace(/[\r\n]+/g,' ');

/** Prepare a message only. Delivery happens in the referrer's email app. */
export function buildReferralEmail(values:ReferralIntakeValues,mailbox:string){
  const to=oneLine(mailbox);
  const subject=`Founder referral: ${oneLine(values.startup)}`;
  const portfolio=companies.find(company=>company.id===values.companyId)?.name||'Not listed';
  const body=[
    `Portfolio company: ${portfolio}`,
    `Referred by: ${oneLine(values.referrer)}`,
    `Founder: ${oneLine(values.founder)}`,
    `Startup / product: ${oneLine(values.startup)}`,
    `Website: ${values.website?.trim()||'Not provided'}`,
    `Context: ${values.context.trim()}`,
    `Connection: ${values.connection?.trim()||'Not specified'}`,
    `Permission: ${values.permission==='Yes'?'Yes — they are happy to be introduced':'Ask first — please check before making an introduction'}`,
  ].join('\n');
  return {to,subject,body,mailto:`mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`};
}

const connections=['Mentorship','Sector advice','College connection','Former teammate','Product pitch','Other'];
const sortedCompanies=[...companies].sort((a,b)=>a.name.localeCompare(b.name));

export default function ReferralIntake({mailbox,onBack}:{mailbox:string;onBack:()=>void}){
  const [values,setValues]=useState<ReferralIntakeValues>({companyId:'',referrer:'',founder:'',startup:'',context:'',website:'',connection:'',permission:'Ask first'});
  const [reviewing,setReviewing]=useState(false);
  const [copyStatus,setCopyStatus]=useState<'idle'|'copied'|'failed'>('idle');
  const [copying,setCopying]=useState(false);
  const heading=useRef<HTMLHeadingElement>(null);
  const preview=useRef<HTMLTextAreaElement>(null);
  const email=buildReferralEmail(values,mailbox);
  function update<K extends keyof ReferralIntakeValues>(key:K,value:ReferralIntakeValues[K]){
    setValues(previous=>({...previous,[key]:value}));
    setCopyStatus('idle');
  }
  function showReview(value:boolean){
    setReviewing(value);
    setCopyStatus('idle');
    requestAnimationFrame(()=>{heading.current?.focus();heading.current?.scrollIntoView({block:'start',behavior:'smooth'})});
  }
  async function copyEmail(){
    if(copying)return;
    setCopying(true);
    try{
      await navigator.clipboard.writeText(`To: ${email.to}\nSubject: ${email.subject}\n\n${email.body}`);
      setCopyStatus('copied');
    }catch{
      preview.current?.focus();
      preview.current?.select();
      setCopyStatus('failed');
    }finally{setCopying(false)}
  }
  return <div className="ri">
    <header className="ri-header">
      <button className="ri-brand" onClick={onBack} aria-label="Together Fund workspace">together<span>FUND</span></button>
      <span className="ri-header-label">A founder introduction goes a long way.</span>
      <button className="ri-back" onClick={onBack}><ArrowLeft size={14}/>Workspace</button>
    </header>
    <main className="ri-main">
      <div className="ri-intro">
        <p className="ri-eyebrow">FROM YOUR NETWORK, TOGETHER</p>
        <h1 ref={heading} tabIndex={-1}>{reviewing?'Review your introduction.':'Met someone we should meet?'}</h1>
        <p>{reviewing?'Check the note, then send it from your email app.':'A founder you mentor. A former teammate building something. A product that made you pause. A few lines are enough.'}</p>
      </div>
      {reviewing?<section className="ri-card ri-review" aria-label="Referral email preview">
        <div className="ri-preview-header"><span className="ri-mail-icon"><Mail size={20}/></span><div><h2>Ready for your email app</h2><p>Prepared for {email.to}</p></div><span className="ri-step">2 / 2</span></div>
        <dl className="ri-email-meta"><div><dt>To</dt><dd>{email.to}</dd></div><div><dt>Subject</dt><dd>{email.subject}</dd></div></dl>
        <label className="ri-preview-label" htmlFor="referral-email-preview">Message</label>
        <textarea ref={preview} id="referral-email-preview" className="ri-email-preview" value={email.body} readOnly rows={12}/>
        <div className="ri-send-note"><Mail size={16}/><p>Open your email app and press Send there. Together can log the referral once your email arrives.</p></div>
        <div className="ri-actions"><a className="ri-primary" href={email.mailto}>Open email app<ArrowRight size={15}/></a><button className="ri-secondary" onClick={()=>void copyEmail()} disabled={copying}>{copyStatus==='copied'?<Check size={15}/>:<Copy size={15}/>}Copy email</button></div>
        <p className="ri-copy-status" role="status">{copyStatus==='copied'?'Copied. Paste the note into your email app to send it.':copyStatus==='failed'?'Copy is unavailable here. The message is selected so you can copy it manually.':'Nothing has been sent or added to Together’s referral records yet.'}</p>
        <button className="ri-edit" onClick={()=>showReview(false)}><ArrowLeft size={13}/>Edit the details</button>
      </section>:<form className="ri-card" onSubmit={event=>{event.preventDefault();showReview(true)}}>
        <div className="ri-form-heading"><h2>Make an introduction</h2><span className="ri-step">1 / 2</span></div>
        <div className="ri-row">
          <label htmlFor="referral-referrer">Your name<input id="referral-referrer" name="referrer" autoComplete="name" required maxLength={100} value={values.referrer} onChange={e=>update('referrer',e.target.value)} placeholder="First and last name" pattern=".*\S.*"/></label>
          <label htmlFor="referral-company">Your portfolio company<select id="referral-company" name="companyId" required value={values.companyId} onChange={e=>update('companyId',e.target.value)}><option value="" disabled>Select your company</option>{sortedCompanies.map(company=><option key={company.id} value={company.id}>{company.name}</option>)}<option value="other">Not listed / other</option></select></label>
        </div>
        <label htmlFor="referral-founder">Who should we meet?<input id="referral-founder" name="founder" required maxLength={100} value={values.founder} onChange={e=>update('founder',e.target.value)} placeholder="Founder or builder’s name" pattern=".*\S.*"/></label>
        <label htmlFor="referral-startup">What are they building?<input id="referral-startup" name="startup" required maxLength={160} value={values.startup} onChange={e=>update('startup',e.target.value)} placeholder="Startup, product, or the idea they’re exploring" pattern=".*\S.*"/></label>
        <label htmlFor="referral-context">What caught your attention?<textarea id="referral-context" name="context" required maxLength={1500} rows={3} value={values.context} onChange={e=>update('context',e.target.value)} placeholder="How you know them and why you think we should talk." onInvalid={e=>{if(!e.currentTarget.value.trim())e.currentTarget.setCustomValidity('Add a little context about why we should meet.')}} onInput={e=>e.currentTarget.setCustomValidity(e.currentTarget.value.trim()?'':'Add a little context about why we should meet.')}/></label>
        <details className="ri-optional"><summary>Have a link or more context?<span>Optional</span><ChevronDown size={14}/></summary><div className="ri-optional-content">
          <label htmlFor="referral-website">Website or public profile<input id="referral-website" name="website" type="url" pattern="https?://.*" maxLength={500} value={values.website} onChange={e=>update('website',e.target.value)} placeholder="https://"/></label>
          <label htmlFor="referral-connection">How did you connect?<select id="referral-connection" name="connection" value={values.connection} onChange={e=>update('connection',e.target.value)}><option value="">Choose if helpful</option>{connections.map(connection=><option key={connection}>{connection}</option>)}</select></label>
          <fieldset className="ri-permission"><legend>Are they happy to be introduced?</legend><label><input type="radio" name="permission" value="Ask first" checked={values.permission==='Ask first'} onChange={()=>update('permission','Ask first')}/><span>Ask first<small>Check with them before an introduction.</small></span></label><label><input type="radio" name="permission" value="Yes" checked={values.permission==='Yes'} onChange={()=>update('permission','Yes')}/><span>Yes<small>They’re happy to meet Together.</small></span></label></fieldset>
        </div></details>
        <div className="ri-form-footer"><p>{values.permission==='Yes'?'Marked as happy to be introduced.':'We’ll flag this as “Ask first” unless you confirm their permission above.'}</p><button className="ri-primary" type="submit">Review email<ArrowRight size={15}/></button></div>
      </form>}
      <p className="ri-footer">Your note is prepared here and sent through your own email app. Questions? <a href={`mailto:${encodeURIComponent(mailbox)}`}>{mailbox}</a></p>
    </main>
  </div>;
}
