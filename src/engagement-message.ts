import type {Contact,FeedItem} from './platform-types';
export const givenName=(name:string)=>name.replace(/^(?:Dr\.?|Prof\.?|Mr\.?|Mrs\.?|Ms\.?)\s+/i,'').trim().split(/\s+/)[0];
const normalized=(name:string)=>name.trim().toLowerCase().replace(/\s+/g,' ');
export const recipientAngle=(person:Contact,item:FeedItem)=>item.companyIds.includes(person.companyId)?item.recipientAngles?.find(angle=>angle.companyId===person.companyId&&normalized(angle.personName)===normalized(person.name)):undefined;
export const resourceSubject=(person:Contact,item:FeedItem)=>recipientAngle(person,item)?.emailSubject||item.emailSubject;

/** Reuse researched copy only within its intended company audience. */
export function resourceBody(person:Contact,item:FeedItem):string{
 const greeting=`Hi ${givenName(person.name)},`;
 if(!item.companyIds.includes(person.companyId))return `${greeting}\n\nThought this from ${item.publisher} might be useful: ${item.title}.\n\n${item.summary}\n\n${item.url}\n\nHow does this compare with what you are seeing in your work? Happy to compare notes.\n\nShivam`;
 const body=(recipientAngle(person,item)?.emailBody||item.emailBody).trim().replace(/^(?:Hi|Hello) [^\n]*\n+/i,'').replace(/\n+(?:(?:Best|Thanks|Regards),?\n+)?Shivam\s*$/i,'');
 const linkedSource=[item.url,...(item.sources||[]).map(source=>source.url)].some(url=>body.includes(url));
 return `${greeting}\n\n${body||`${item.title}\n\n${item.summary}\n\n${item.url}`}${body&&!linkedSource?`\n\n${item.url}`:''}\n\nShivam`;
}
