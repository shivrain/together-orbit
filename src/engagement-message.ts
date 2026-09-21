import type {Contact,FeedItem} from './platform-types';
export const givenName=(name:string)=>name.replace(/^(?:Dr\.?|Prof\.?|Mr\.?|Mrs\.?|Ms\.?)\s+/i,'').trim().split(/\s+/)[0];

/** Reuse researched copy only within its intended company audience. */
export function resourceBody(person:Contact,item:FeedItem):string{
 const greeting=`Hi ${givenName(person.name)},`;
 if(!item.companyIds.includes(person.companyId))return `${greeting}\n\nThought this from ${item.publisher} might be useful: ${item.title}.\n\n${item.summary}\n\n${item.url}\n\nHow does this compare with what you are seeing in your work? Happy to compare notes.\n\nShivam`;
 const body=item.emailBody.trim().replace(/^(?:Hi|Hello) [^\n]*\n+/i,'').replace(/\n+(?:(?:Best|Thanks|Regards),?\n+)?Shivam\s*$/i,'');
 return `${greeting}\n\n${body||`${item.title}\n\n${item.summary}\n\n${item.url}`}${body&&!body.includes(item.url)?`\n\n${item.url}`:''}\n\nShivam`;
}
