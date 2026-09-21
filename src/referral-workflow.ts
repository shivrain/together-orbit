import {companies} from './data';
import {givenName} from './engagement-message';
import type {Contact,Deal} from './platform-types';

export type RequestKind='recent'|'mentorship'|'products'|'alumni';
export const requestOptions:{id:RequestKind;label:string;subject:string}[]=[
 {id:'recent',label:'Founders they have met',subject:'Who are the top 3 founders we should meet?'},
 {id:'mentorship',label:'People they mentor',subject:'Anyone you are advising that we should meet?'},
 {id:'products',label:'Products they are pitched',subject:'Any young teams whose product impressed you?'},
 {id:'alumni',label:'Former teammates & college network',subject:'Who in your circle is building something new?'},
];

export function referralRequest(person:Contact,kind:RequestKind,mailbox:string,formUrl:string){
 const question=kind==='recent'?"Who are the top three founders you've met recently that you think we should meet?"
 :kind==='mentorship'?'Is there someone you are mentoring or advising whose work you think we should know about?'
 :kind==='products'?'Have you tried, bought or been pitched a product from a young team that impressed you?'
 :'Are any former teammates or people from your college circle starting to build something of their own?';
 return `Hi ${givenName(person.name)},\n\n${question}\n\nYou do not need to judge whether it fits Together before sharing. A name, a link and why they caught your attention is enough. We will take a look and close the loop with you.\n\nIf they would welcome an introduction, connect us at ${mailbox}. You can also use this short form to prepare the introduction:\n${formUrl}\n\nShivam`;
}

/** Reply to the stage actually recorded, without implying a meeting or decision. */
export function referralReply(deal:Deal):string{
 const first=`Hi ${givenName(deal.referrer)||'there'},`;
 const message=deal.stage==='Closed'
  ?`Thanks again for sharing ${deal.name}'s work. I wanted to close the loop on ${deal.startup}.\n\n[Add the outcome and any feedback you have permission to share.]`
  :deal.permission==='Ask first'
   ?`Thanks for sharing ${deal.name}'s work on ${deal.startup}. Would you check whether they would welcome an introduction to Together?`
   :deal.intake==='Known to referrer'||['New','Intro requested'].includes(deal.stage)
    ?`Thanks for sharing ${deal.name}'s work on ${deal.startup}. Could you make a short introduction? We would love to learn more.`
    :`Thanks again for introducing ${deal.name} and ${deal.startup}. I wanted to keep you updated.\n\n[Add the latest conversation update and the next step.]`;
 return `${first}\n\n${message}\n\nShivam`;
}

/** Parse only the explicit labels produced by the public referral form. */
export function parseReferralEmail(text:string):Partial<Deal>{
 const labels=['Portfolio company','Referred by','Founder','Startup / product','Website','Context','Connection','Permission'];
 const escaped=labels.map(label=>label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');
 const expression=new RegExp(`^(${escaped}):[ \\t]*(.*?)(?=^(?:${escaped}):|(?![\\s\\S]))`,'gmsi');
 const fields:Record<string,string>={};
 for(const match of text.matchAll(expression))fields[match[1].toLowerCase()]=match[2].trim();
 if(!Object.keys(fields).length)return {reason:text.trim()};
 const company=companies.find(c=>c.name.toLowerCase()===fields['portfolio company']?.toLowerCase());
 const result:Partial<Deal>={};
 if(company)result.companyId=company.id;
 else if(fields['portfolio company']?.toLowerCase()==='not listed')result.companyId='other';
 if(fields['referred by'])result.referrer=fields['referred by'];
 if(fields.founder)result.name=fields.founder;
 if(fields['startup / product'])result.startup=fields['startup / product'];
 if(fields.website&&/^https?:\/\//i.test(fields.website))result.link=fields.website;
 if(fields.context)result.reason=fields.context;
 if(fields.connection)result.category=fields.connection;
 result.permission=/^yes(?:\b|$)/i.test(fields.permission||'')?'Yes':'Ask first';
 return result;
}

/** A changed referrer must never inherit another person's saved email or ID. */
export function matchReferrer(deal:Pick<Deal,'companyId'|'referrer'>,contacts:Contact[]):Contact|undefined{
 const matches=contacts.filter(p=>p.companyId===deal.companyId&&p.name.trim().toLowerCase()===deal.referrer.trim().toLowerCase());
 return matches.length===1?matches[0]:undefined;
}
