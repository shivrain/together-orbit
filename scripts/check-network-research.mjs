import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createServer} from 'vite';

const network=JSON.parse(readFileSync('public/data/network.json','utf8'));
const feed=JSON.parse(readFileSync('public/data/engagement.json','utf8')).feed;
const server=await createServer({configFile:'vite.config.ts',server:{middlewareMode:true,hmr:false,ws:false},optimizeDeps:{noDiscovery:true,include:[]},appType:'custom'});
try{
 const {companies}=await server.ssrLoadModule('/src/data.ts');
 const {mergePeopleContacts}=await server.ssrLoadModule('/src/people.ts');
 const {getNextAction}=await server.ssrLoadModule('/src/next-action.ts');
 const {resourceBody}=await server.ssrLoadModule('/src/engagement-message.ts');
 const companyIds=new Set(companies.map(c=>c.id));
 const day=value=>assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&Date.parse(value)<=Date.now(),`Invalid research date: ${value}`);
 const url=value=>assert.match(value,/^https:\/\//);
 assert.equal(network.schemaVersion,1);
 assert.ok(network.people.length>=30,'Public people research must be populated');
 assert.equal(new Set(network.people.map(p=>p.id)).size,network.people.length);
 assert.equal(new Set(network.people.map(p=>`${p.companyId}:${p.name.toLowerCase()}`)).size,network.people.length);
 for(const p of network.people){
  assert.ok(companyIds.has(p.companyId)&&p.name&&p.role&&p.summary&&p.interests.length&&p.sources.length);
  day(p.checkedAt);
  for(const s of p.sources){url(s.url);assert.ok(s.title&&s.evidence);if(s.publishedAt)day(s.publishedAt)}
  for(const privateField of ['email','notes','fundSentiment','relationshipStrength','referralAwareness','referralUnderstanding','dealFlow','lastContactAt','meetingNotes'])assert.equal(p[privateField],undefined,`Do not publish private or inferred ${privateField}`);
 }
 for(const move of network.movements){
  assert.ok(companyIds.has(move.companyId));url(move.sourceUrl);day(move.observedAt);
  assert.ok(move.eventDate,'Public moves must distinguish the event from the research date');day(move.eventDate);
  assert.ok(network.people.some(p=>p.id===move.personId&&p.companyId===move.companyId&&p.name===move.person));
  assert.equal(move.provider,'Public source');assert.equal(move.confirmed,false,'Human source review remains pending');
  assert.ok(move.evidence);
 }
 assert.equal(new Set(feed.map(f=>f.id)).size,feed.length);
 assert.equal(new Set(feed.map(f=>f.url)).size,feed.length);
 for(const item of feed){
  url(item.url);day(item.checkedAt);if(item.publishedAt)day(item.publishedAt);
  assert.ok(item.companyIds.length&&item.companyIds.every(id=>companyIds.has(id)));
  assert.ok(item.summary&&item.whyRelevant&&item.emailSubject&&item.emailBody);
  assert.ok(item.emailBody.includes(item.url),'Draft should include its verified source');
 }
 const publicPeople=mergePeopleContacts([],network.people);
 const original=publicPeople.find(p=>p.research);
 assert.ok(original);
 const oldPublic={...original,id:'legacy-contact-id',email:'private@example.com',notes:'Private meeting context',relationshipStrength:'Strong',meetingNotes:[{id:'note-1',date:'2026-09-01',body:'Private discussion',topics:['Voice AI'],askedForReferrals:true}]};
 const fresh=structuredClone(network.people);
 const updated=fresh.find(p=>p.companyId===original.companyId&&p.name===original.name);
 updated.role='New sourced role';updated.summary='Updated public context';updated.interests=['Agent security'];
 const merged=mergePeopleContacts([oldPublic],fresh).find(p=>p.id===oldPublic.id);
 assert.equal(merged.email,oldPublic.email);assert.equal(merged.notes,oldPublic.notes);
 assert.equal(merged.relationshipStrength,'Strong');assert.deepEqual(merged.meetingNotes,oldPublic.meetingNotes);
 assert.equal(merged.role,'New sourced role');assert.equal(merged.research.summary,'Updated public context');
 assert.equal(mergePeopleContacts([{...oldPublic,role:'User chosen role',interests:'User chosen topics',sourceUrl:''}],fresh).find(p=>p.id===oldPublic.id).role,'User chosen role');
 assert.equal(mergePeopleContacts([{...oldPublic,role:'',interests:'',sourceUrl:''}],fresh).find(p=>p.id===oldPublic.id).role,'');
 const oldWithProfile={...oldPublic,profile:'https://example.com/old-profile',research:{...oldPublic.research,profile:'https://example.com/old-profile'}};
 updated.profile='https://example.com/corrected-profile';
 assert.equal(mergePeopleContacts([oldWithProfile],fresh).find(p=>p.id===oldPublic.id).profile,updated.profile);
 assert.equal(mergePeopleContacts([{...oldWithProfile,profile:'https://example.com/private-override'}],fresh).find(p=>p.id===oldPublic.id).profile,'https://example.com/private-override');
 const template={...feed[0],companyIds:['emergent'],emailBody:'Hi Mukund,\n\nA specific observation for Emergent.\n\n'+feed[0].url};
 assert.ok(resourceBody({...original,name:'Madhav Jha',companyId:'emergent'},template).startsWith('Hi Madhav,'));
 const crossCompany=resourceBody({...original,name:'Chetan Reddy',companyId:'confido'},template);
 assert.ok(crossCompany.startsWith('Hi Chetan,'));assert.ok(!crossCompany.includes('Emergent'));assert.ok(crossCompany.includes(template.url));
 assert.ok(resourceBody({...original,name:'Dr. Raihan Faroqui'},template).startsWith('Hi Raihan,'));
 const baseline={deals:[],drafts:[],reports:[],notices:[],settings:{},connections:{},contacts:publicPeople,feed,movements:[]};
 if(network.movements.length){
  const m={...network.movements[0],historical:true};
  assert.notEqual(getNextAction({...baseline,movements:[m]},m.companyId).kind,'review-move');
  const storage=new Map();
  globalThis.localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)};
  globalThis.document={baseURI:'https://example.com/together-orbit/'};
  let refreshed=structuredClone(network);
  globalThis.fetch=async input=>String(input).endsWith('network.json')?{ok:true,json:async()=>refreshed}:{ok:false};
  const {readLocalData,loadLocalData,localRequest}=await server.ssrLoadModule('/src/local-data.ts');
  await localRequest('/api/platform',{kind:'settings',value:{mailbox:'private@example.com'}});
  assert.equal(JSON.parse(storage.get('together-orbit-standalone-v1')).movements.length,0,'Unrelated save must not freeze public movements');
  refreshed.movements[0].evidence='Corrected public evidence';
  await loadLocalData();
  let move=readLocalData().movements.find(item=>item.id===m.id);
  assert.equal(move.evidence,'Corrected public evidence');
  await localRequest('/api/platform',{kind:'movement',value:{...move,confirmed:true}});
  assert.equal(readLocalData().movements.find(item=>item.id===m.id).confirmed,true);
  refreshed=structuredClone(refreshed);refreshed.movements[0].evidence='A second source correction';
  await loadLocalData();
  move=readLocalData().movements.find(item=>item.id===m.id);
  assert.equal(move.evidence,'A second source correction');assert.equal(move.confirmed,false,'Changed evidence needs a new source review');
  await localRequest('/api/platform',{kind:'movement',value:{...move,evidence:'User annotation',confirmed:true}});
  await loadLocalData();
  assert.equal(readLocalData().movements.find(item=>item.id===m.id).evidence,'User annotation');
  assert.equal(readLocalData().movements.find(item=>item.id===m.id).confirmed,true);
 }
 console.log(`Passed: ${network.people.length} public profiles, ${network.movements.length} dated movement signals, ${feed.length} sourced engagement items; public refresh preserves private IDs, edits and history.`);
}finally{await server.close()}
