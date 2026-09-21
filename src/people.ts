import {companies} from './data';
import type {Contact} from './platform-types';

/** Public portfolio listings are a starting map, not a verified employee directory. */
export function seedFounderContacts():Contact[]{
 return companies.flatMap(company=>company.founders.map((name,index)=>({
  id:`founder-${company.id}-${index}`,companyId:company.id,name,email:'',
  role:'Founder · public portfolio listing',kind:'Founder' as const,
  interests:company.sector,sourceUrl:company.sourceUrl,
 })));
}

export const personIdentity=(person:Pick<Contact,'companyId'|'name'>)=>`${person.companyId}:${person.name.trim().toLowerCase().replace(/\s+/g,' ')}`;

/** Preserve saved IDs and fields, including intentional empty values and old contacts. */
export function mergePeopleContacts(contacts:Contact[]):Contact[]{
 const people=seedFounderContacts();
 const savedIds=new Set(contacts.map(contact=>contact.id));
 for(const contact of contacts){
  const exactIndex=people.findIndex(person=>person.id===contact.id);
  // Name matching only enriches an unclaimed seed. It must never replace another saved ID.
  const index=exactIndex>=0?exactIndex:people.findIndex(person=>!savedIds.has(person.id)&&personIdentity(person)===personIdentity(contact));
  if(index<0)people.push(contact);
  else people[index]={...people[index],...contact};
 }
 return people;
}

export function isPortfolioFounder(person:Contact){
 return seedFounderContacts().some(founder=>founder.companyId===person.companyId&&personIdentity(founder)===personIdentity(person));
}
