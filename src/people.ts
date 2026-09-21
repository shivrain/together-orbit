import {companies} from './data';
import type {Contact,ResearchedPerson} from './platform-types';

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
export function mergePeopleContacts(contacts:Contact[],research:ResearchedPerson[]=[]):Contact[]{
 const people=seedFounderContacts();
 for(const item of research){
  const index=people.findIndex(person=>personIdentity(person)===personIdentity(item));
  const prior=people[index];
  const enriched:Contact={...prior,id:prior?.id||item.id,companyId:item.companyId,name:item.name,email:'',role:item.role,kind:item.kind,interests:item.interests.join(', '),profile:item.profile,sourceUrl:item.sources[0]?.url,research:{role:item.role,profile:item.profile,kind:item.kind,summary:item.summary,interests:item.interests,networkAngles:item.networkAngles,sources:item.sources,checkedAt:item.checkedAt}};
  if(index<0)people.push(enriched);else people[index]=enriched;
 }
 const savedIds=new Set(contacts.map(contact=>contact.id));
 for(const contact of contacts){
  const exactIndex=people.findIndex(person=>person.id===contact.id);
  // Name matching only enriches an unclaimed seed. It must never replace another saved ID.
  const index=exactIndex>=0?exactIndex:people.findIndex(person=>!savedIds.has(person.id)&&personIdentity(person)===personIdentity(contact));
  if(index<0)people.push(contact);
  else {
   const current=people[index],seed=seedFounderContacts().find(p=>p.id===current.id);
   const merged={...current,...contact};
   // Research is shared provenance, not a snapshot of a private relationship.
   // Refresh it even when a browser saved the previous public version.
   if(current.research&&personIdentity(current)===personIdentity(contact)){
    merged.research=current.research;
    for(const field of ['role','interests','sourceUrl','profile','kind'] as const){
     const oldPublic=field==='role'?contact.research?.role:field==='interests'?contact.research?.interests.join(', '):field==='sourceUrl'?contact.research?.sources[0]?.url:field==='profile'?contact.research?.profile:contact.research?.kind;
     if(contact[field]===undefined||contact[field]===seed?.[field]||(oldPublic!==undefined&&contact[field]===oldPublic))(merged as any)[field]=current[field];
    }
   }
   if(personIdentity(current)!==personIdentity(contact))delete merged.research;
   people[index]=merged;
  }
 }
 return people;
}

export function isPortfolioFounder(person:Contact){
 return seedFounderContacts().some(founder=>founder.companyId===person.companyId&&personIdentity(founder)===personIdentity(person));
}
