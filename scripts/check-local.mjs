import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {readFileSync} from 'node:fs';
const network=JSON.parse(readFileSync('public/data/network.json','utf8'));
const engagement=JSON.parse(readFileSync('public/data/engagement.json','utf8'));

const storage=new Map();
globalThis.localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)};
const server=await createServer({configFile:'vite.config.ts',server:{middlewareMode:true,hmr:false,ws:false},optimizeDeps:{noDiscovery:true,include:[]},appType:'custom'});
try{
 const {readLocalData,localRequest,resetLocalData,exportLocalData}=await server.ssrLoadModule('/src/local-data.ts');
 const {companies}=await server.ssrLoadModule('/src/data.ts');
 const {mergePeopleContacts}=await server.ssrLoadModule('/src/people.ts');
 let state=readLocalData();
 assert.equal(state.deals.length,8);
 assert.equal(state.feed.length,engagement.feed.length);
 assert.equal(state.reports[0].results.length,35);
 assert.equal(state.reports[0].status,'Partial');
 assert.equal(state.connections.gmail,false);
 assert.equal(state.connections.people,false);
 const founderCount=companies.reduce((count,company)=>count+company.founders.length,0);
 const publicCount=mergePeopleContacts([],network.people).length;
 const initialMoves=structuredClone(state.movements);
 assert.equal(state.contacts.length,publicCount);
 assert.equal(new Set(state.contacts.map(contact=>contact.id)).size,publicCount);
 assert.ok(state.contacts.every(contact=>contact.sourceUrl&&!contact.email&&!contact.lastContactAt));
 // Already-saved colliding names must retain both exact IDs and their distinct data.
 const soham=state.contacts.find(contact=>contact.id==='founder-composio-0');
 const karan=state.contacts.find(contact=>contact.id==='founder-composio-1');
 const collisionMap=mergePeopleContacts([{...soham,email:'first@example.com'},{...karan,name:soham.name,email:'second@example.com'}]);
 assert.equal(collisionMap.length,founderCount);
 assert.equal(new Set(collisionMap.map(contact=>contact.id)).size,founderCount);
 assert.equal(collisionMap.find(contact=>contact.id===soham.id).email,'first@example.com');
 assert.equal(collisionMap.find(contact=>contact.id===karan.id).email,'second@example.com');
 const reservedMap=mergePeopleContacts([{...soham,id:'legacy-soham',email:'legacy@example.com'},{...soham,email:'seed@example.com'}]);
 assert.equal(reservedMap.find(contact=>contact.id==='legacy-soham').email,'legacy@example.com');
 assert.equal(reservedMap.find(contact=>contact.id===soham.id).email,'seed@example.com');
 const first=state.deals[0];
 await localRequest('/api/platform',{kind:'deal',value:{...first,stage:'Evaluating',notes:'local verification'}});
 state=readLocalData();
 assert.equal(state.deals[0].stage,'Evaluating');
 assert.equal(state.deals[0].source,'sample');
 assert.deepEqual(state.deals[0].messages,first.messages);

 // Migrate a workspace saved before the people map existed. Keep IDs and edited fields.
 const existing=JSON.parse(storage.get('together-orbit-standalone-v1'));
 existing.contacts=[
  {id:'existing-soham',companyId:'composio',name:'Soham Ganatra',email:'known@example.com',role:'Existing saved role',interests:'Previously saved interests'},
  {id:'existing-team',companyId:'composio',name:'Test teammate',email:'team@example.com',role:'Engineering',interests:'Agent reliability'},
 ];
 delete existing.movements;
 storage.set('together-orbit-standalone-v1',JSON.stringify(existing));
 state=readLocalData();
 assert.equal(state.contacts.length,publicCount+1);
 assert.equal(state.contacts.filter(contact=>contact.companyId==='composio'&&contact.name==='Soham Ganatra').length,1);
 const founder=state.contacts.find(contact=>contact.id==='existing-soham');
 assert.equal(founder.email,'known@example.com');
 assert.equal(founder.role,'Existing saved role');
 assert.equal(founder.kind,'Founder');
 assert.ok(founder.sourceUrl.startsWith('https://'));
 assert.equal(founder.research?.summary,network.people.find(p=>p.companyId==='composio'&&p.name==='Soham Ganatra')?.summary);
 assert.ok(state.contacts.some(contact=>contact.id==='existing-team'));
 assert.equal(state.deals[0].notes,'local verification');
 assert.deepEqual(state.movements,initialMoves);

 await localRequest('/api/platform',{kind:'contact',value:{...founder,notes:'Met through a portfolio workshop',lastContactAt:'2026-09-20',nextFollowUpAt:'2026-10-20'}});
 await localRequest('/api/platform',{kind:'draft',value:{id:'draft-check',subject:'A useful resource',body:'For review',status:'Draft',companyId:'composio',createdAt:new Date().toISOString(),to:founder.email,personId:founder.id}});
 assert.equal(readLocalData().contacts.find(contact=>contact.id===founder.id).lastContactAt,'2026-09-20');
 const movement={id:'movement-check',companyId:'composio',personId:'existing-team',person:'Test teammate',profile:'',previousRole:'Engineering',currentRole:'Founder',previousCompany:'Composio',currentCompany:'Example company',type:'Started company',observedAt:'2026-09-20',sourceUrl:'https://example.com/announcement',provider:'Public source',evidence:'Test evidence for an announced company',confirmed:false};
 await localRequest('/api/platform',{kind:'movement',value:movement});
 await localRequest('/api/platform',{kind:'movement',value:{...movement,confirmed:true}});
 await localRequest('/api/platform',{kind:'deal',value:{...first,referrerPersonId:founder.id,notes:'Relationship-linked referral'}});
 state=readLocalData();
 assert.equal(state.movements.length,initialMoves.length+1);
 assert.equal(state.movements.find(m=>m.id===movement.id).confirmed,true);
 assert.equal(state.movements.find(m=>m.id===movement.id).personId,'existing-team');
 assert.equal(state.contacts.find(contact=>contact.id===founder.id).notes,'Met through a portfolio workshop');
 assert.equal(state.contacts.find(contact=>contact.id===founder.id).nextFollowUpAt,'2026-10-20');
 assert.equal(state.drafts[0].personId,founder.id);
 assert.equal(state.deals[0].referrerPersonId,founder.id);
 assert.equal(readLocalData().contacts.length,publicCount+1);
 // Duplicate Add and colliding rename fail atomically; relationship IDs and links survive.
 const beforeCollision=readLocalData();
 const beforeCollisionStorage=storage.get('together-orbit-standalone-v1');
 await assert.rejects(()=>localRequest('/api/platform',{kind:'contact',value:{...founder,id:'duplicate-soham',name:' SOHAM   ganatra ',email:'overwrite@example.com'}}),/already mapped.*Edit the existing/);
 await assert.rejects(()=>localRequest('/api/platform',{kind:'contact',value:{...karan,name:' Soham  GANATRA ',notes:'Must not overwrite either relationship'}}),/already mapped.*Edit the existing/);
 assert.equal(storage.get('together-orbit-standalone-v1'),beforeCollisionStorage);
 assert.deepEqual(readLocalData(),beforeCollision);
 assert.equal(readLocalData().contacts.find(contact=>contact.id===founder.id).email,'known@example.com');
 assert.equal(readLocalData().contacts.find(contact=>contact.id===karan.id).name,'Karan Vaidya');
 assert.equal(readLocalData().drafts[0].personId,founder.id);
 assert.equal(readLocalData().deals[0].referrerPersonId,founder.id);
 assert.equal(readLocalData().movements.find(m=>m.id===movement.id).personId,'existing-team');

 // Clearing a relationship removes the saved link; editing a sample keeps its provenance.
 await localRequest('/api/platform',{kind:'deal',value:{...readLocalData().deals[0],referrerPersonId:undefined}});
 assert.equal(readLocalData().deals[0].referrerPersonId,undefined);
 assert.equal(JSON.parse(storage.get('together-orbit-standalone-v1')).deals[0].referrerPersonId,undefined);
 assert.equal(readLocalData().deals[0].source,'sample');
 // Updating an observation retains its deliberately chosen source metadata.
 await localRequest('/api/platform',{kind:'movement',value:{...readLocalData().movements.find(m=>m.id===movement.id),previousCompany:'Earlier employer chosen by reviewer',provider:'Harmonic'}});
 await localRequest('/api/platform',{kind:'movement',value:{id:movement.id,companyId:movement.companyId,person:movement.person,sourceUrl:movement.sourceUrl,evidence:'Revised evidence after review',confirmed:false}});
 assert.equal(readLocalData().movements.find(m=>m.id===movement.id).previousCompany,'Earlier employer chosen by reviewer');
 assert.equal(readLocalData().movements.find(m=>m.id===movement.id).provider,'Harmonic');
 assert.equal(readLocalData().movements.find(m=>m.id===movement.id).personId,'existing-team');
 await assert.rejects(()=>localRequest('/api/mail',{action:'sync'}),/not connected/);
 await assert.rejects(()=>localRequest('/api/platform',{kind:'movement',value:{id:'missing-source',companyId:'composio',person:'Test person'}}),/source link/);

 // Exports retain the links needed to reconstruct a relationship and its outcome.
 let exportedBlob;
 const originalCreate=URL.createObjectURL,originalRevoke=URL.revokeObjectURL;
 URL.createObjectURL=blob=>{exportedBlob=blob;return 'blob:test'};
 URL.revokeObjectURL=()=>{};
 globalThis.document={createElement:()=>({click(){}})};
 exportLocalData();
 const exported=JSON.parse(await exportedBlob.text());
 assert.equal(exported.version,2);
 assert.equal(exported.movements.find(m=>m.id===movement.id).id,movement.id);
 assert.equal(exported.contacts.find(contact=>contact.id===founder.id).email,'known@example.com');
 assert.equal(exported.drafts[0].personId,founder.id);
 URL.createObjectURL=originalCreate;URL.revokeObjectURL=originalRevoke;
 resetLocalData();
 assert.equal(readLocalData().drafts.length,0);
 assert.equal(readLocalData().movements.length,initialMoves.length);
 assert.equal(readLocalData().contacts.length,publicCount);
 assert.equal(readLocalData().reports[0].results.length,35);
 // Import merges an export back without duplicating public people or deleting records.
 const {importLocalData}=await server.ssrLoadModule('/src/local-data.ts');
 const chetan=readLocalData().contacts.find(c=>c.companyId==='confido'&&c.name==='Chetan Reddy');
 const importFile={version:2,exportedAt:new Date().toISOString(),deals:[{id:'import-deal',companyId:'confido',name:'Imported Founder',startup:'Imported Co',link:'',reason:'Mentioned in a founder catch-up',referrer:'Chetan Reddy',referrerEmail:'',referrerPersonId:chetan.id,category:'Founder inbound',stage:'New',owner:'Shivam',permission:'Ask first',followUp:'',notes:'',messages:[{id:'import-mail',from:'Chetan Reddy',to:'shivam@together.fund',subject:'Intro',body:'Hi',at:'2026-08-27T10:00:00Z',direction:'inbound'}],updatedAt:'2026-08-27T12:00:00Z',unread:false,source:'manual',intake:'Passed to Together'},{id:'',companyId:'confido',name:'No id',startup:'Skip me'}],contacts:[{...chetan,lastContactAt:'2026-08-27',notes:'Monthly catch-up'}],drafts:[],movements:[],settings:{mailbox:'shivam@together.fund'}};
 const summary=await importLocalData(JSON.stringify(importFile));
 assert.equal(summary.deals,1);assert.equal(summary.contacts,1);assert.equal(summary.skipped.length,1);
 const afterImport=readLocalData();
 assert.equal(afterImport.contacts.length,publicCount,'Import must not duplicate a public person');
 assert.equal(afterImport.contacts.find(c=>c.id===chetan.id).lastContactAt,'2026-08-27');
 const importedDeal=afterImport.deals.find(d=>d.id==='import-deal');
 assert.equal(importedDeal.messages.length,1);assert.equal(importedDeal.updatedAt,'2026-08-27T12:00:00Z');assert.equal(importedDeal.source,'manual');assert.equal(importedDeal.referrerPersonId,chetan.id);
 await importLocalData(JSON.stringify(importFile));
 assert.equal(readLocalData().deals.filter(d=>d.id==='import-deal').length,1,'Re-importing must not duplicate');
 await assert.rejects(()=>importLocalData('not json'),/valid JSON/);
 await assert.rejects(()=>importLocalData('{"version":9}'),/export file/);
 resetLocalData();
 console.log('Passed: original content, public founder map, legacy-contact migration, collision-safe IDs, duplicate rejection without data loss, relationship links, sample provenance, unchanged draft touchpoint dates, movement metadata, browser persistence, complete export, and honest disconnected integrations.');
}finally{await server.close()}
