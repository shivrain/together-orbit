import assert from 'node:assert/strict';
import {createServer} from 'vite';

const server=await createServer({configFile:'vite.config.ts',server:{middlewareMode:true,hmr:false,ws:false},optimizeDeps:{noDiscovery:true,include:[]},appType:'custom'});
try{
  const {getNextAction}=await server.ssrLoadModule('/src/next-action.ts');
  const now=new Date('2026-09-21T12:00:00Z');
  const founder={id:'founder',companyId:'test',name:'A Founder',kind:'Founder',email:'',role:'Founder',interests:''};
  const teammate={id:'team',companyId:'test',name:'A Teammate',kind:'Alumni',email:'',role:'Engineer',interests:''};
  const feed={id:'article',companyIds:['test'],title:'Relevant research',whyRelevant:'Useful research for this company.',publishedAt:'2026-09-20'};
  const draft={id:'draft',companyId:'test',createdAt:'2026-09-20T10:00:00Z',subject:'A saved message',personId:'team'};
  const move={id:'move',companyId:'test',personId:'team',person:'A Teammate',observedAt:'2026-09-19',confirmed:false};
  const deal={id:'deal',companyId:'test',name:'A Builder',referrer:'A Founder',referrerPersonId:'founder',source:'manual',stage:'New',permission:'Yes',updatedAt:'2026-09-20',followUp:'',unread:false};
  const base=()=>({contacts:[{...founder},{...teammate}],deals:[],drafts:[],movements:[],feed:[],reports:[],notices:[],settings:{},connections:{}});
  const choose=data=>getNextAction(data,'test',now);

  assert.equal(choose({...base(),contacts:[]}).kind,'map-team');
  assert.equal(choose(base()).kind,'check-in');
  let data={...base(),feed:[feed]};
  assert.equal(choose(data).kind,'share-resource');
  assert.equal(choose(data).personId,'founder');
  data.drafts=[draft];
  assert.equal(choose(data).kind,'draft');
  assert.equal(choose(data).personId,'team');
  data.contacts[1].nextFollowUpAt='2026-09-20';
  assert.equal(choose(data).kind,'follow-up');
  assert.equal(choose(data).personId,'team');
  data.movements=[{...move,confirmed:true}];
  assert.equal(choose(data).kind,'check-in');
  assert.equal(choose(data).personId,'team');
  data.movements[0].confirmed=false;
  assert.equal(choose(data).kind,'review-move');
  data.deals=[deal];
  assert.equal(choose(data).kind,'referral');
  assert.equal(choose(data).personId,'founder');

  // Example rows and nonactionable closed/evaluating/scheduled referrals never crowd out real work.
  for(const patch of [{source:'sample'},{stage:'Closed'},{stage:'Evaluating'},{followUp:'2026-10-01'}]){
    assert.equal(choose({...base(),deals:[{...deal,...patch}],feed:[feed]}).kind,'share-resource');
  }
  assert.equal(choose({...base(),deals:[{...deal,stage:'Evaluating',followUp:'2026-09-20'}]}).kind,'referral');
  assert.match(choose({...base(),deals:[{...deal,permission:'Ask first'}]}).title,/Get permission/);
  // Replies created from illustrative referrals stay outside real next-action suggestions.
  const sampleState={...base(),deals:[{...deal,source:'sample'}],drafts:[{...draft,dealId:deal.id}],feed:[feed]};
  assert.equal(choose(sampleState).kind,'share-resource');
  assert.equal(choose({...sampleState,drafts:[...sampleState.drafts,{...draft,id:'real-draft',createdAt:'2026-09-19'}]}).draftId,'real-draft');

  // An observed move is not a reason to contact an unrelated founder. Explicit links are company-scoped.
  for(const personId of [undefined,'missing','elsewhere']){
    const contacts=[...base().contacts,{...teammate,id:'elsewhere',companyId:'other'}];
    const state={...base(),contacts,movements:[{...move,personId,confirmed:true}],feed:[feed]};
    assert.equal(choose(state).kind,'share-resource');
    assert.equal(choose({...state,movements:[{...move,personId,confirmed:false}]}).personId,undefined);
    assert.equal(choose({...state,movements:[],drafts:[{...draft,personId}]}).personId,undefined);
    assert.equal(choose({...state,deals:[{...deal,referrerPersonId:personId}]}).personId,undefined);
  }

  // Contact after a reviewed observation resolves its check-in, but saving a draft does not.
  data={...base(),movements:[{...move,confirmed:true}],drafts:[draft]};
  assert.equal(choose(data).kind,'check-in');
  data.contacts[1].lastContactAt='2026-09-20';
  assert.equal(choose(data).kind,'draft');
  data.contacts[1].lastContactAt='2026-10-01';
  assert.equal(choose(data).kind,'check-in');

  // Future dates, missing dates and normalized impossible dates do not become recent events.
  for(const date of ['2027-01-01','not-a-date','2026-02-30','','09/20/2026']){
    assert.equal(choose({...base(),movements:[{...move,observedAt:date}]}).kind,'check-in');
    assert.equal(choose({...base(),drafts:[{...draft,createdAt:date}]}).kind,'check-in');
    assert.equal(choose({...base(),feed:[{...feed,publishedAt:date}]}).kind,'check-in');
    assert.equal(choose({...base(),contacts:[{...teammate,nextFollowUpAt:date}]}).kind,'check-in');
  }

  // Pick the latest evidence/draft/resource, and the oldest explicit due follow-up; ties remain stable.
  assert.equal(choose({...base(),movements:[move,{...move,id:'newer',observedAt:'2026-09-20'}]}).movementId,'newer');
  assert.equal(choose({...base(),drafts:[draft,{...draft,id:'newer',createdAt:'2026-09-21T09:00:00Z'}]}).draftId,'newer');
  assert.equal(choose({...base(),feed:[feed,{...feed,id:'newer',publishedAt:'2026-09-21'}]}).feedId,'newer');
  assert.equal(choose({...base(),contacts:[{...founder,nextFollowUpAt:'2026-09-20'},{...teammate,nextFollowUpAt:'2026-09-18'}]}).personId,'team');
  const tied=[{...draft,id:'b'},{...draft,id:'a'}];
  assert.equal(choose({...base(),drafts:tied}).draftId,'a');
  assert.equal(choose({...base(),drafts:[...tied].reverse()}).draftId,'a');
  // Handled drafts stop winning; a handled resource is suppressed only for its recipient.
  const handledDraft={...draft,personId:'founder',resourceId:feed.id,archivedAt:'2026-09-21T10:00:00Z'};
  assert.equal(choose({...base(),drafts:[handledDraft]}).kind,'check-in');
  assert.equal(choose({...base(),drafts:[handledDraft],feed:[feed]}).kind,'check-in');
  assert.equal(choose({...base(),drafts:[handledDraft,{...draft,id:'unfinished',createdAt:'2026-09-19'}]}).draftId,'unfinished');
  assert.equal(choose({...base(),drafts:[{...handledDraft,personId:'team'}],feed:[feed]}).personId,'founder');
  assert.equal(choose({...base(),contacts:[founder,{...founder,id:'other-founder'}],drafts:[handledDraft],feed:[feed]}).personId,'other-founder');
  assert.equal(choose({...base(),drafts:[handledDraft],feed:[feed,{...feed,id:'older-unhandled',publishedAt:'2026-09-19'}]}).feedId,'older-unhandled');

  // Neither another company's records nor selection itself changes this company's saved data.
  data={...base(),deals:[{...deal,companyId:'other'}],movements:[{...move,companyId:'other'}],drafts:[{...draft,companyId:'other'}],feed:[{...feed,companyIds:['other']}]};
  const before=structuredClone(data);
  assert.equal(choose(data).kind,'check-in');
  assert.deepEqual(data,before);

  // Ask only where recorded sentiment and relationship justify it. No inferred NPS.
  const ready={...founder,fundSentiment:'Positive',relationshipStrength:'Strong',referralAwareness:'Needs reminder',referralUnderstanding:'Clear',dealFlow:'Frequent'};
  assert.equal(choose({...base(),contacts:[ready]}).kind,'referral-ask');
  assert.match(choose({...base(),contacts:[ready]}).title,/top 3 founders/);
  for(const patch of [
    {fundSentiment:'Negative'},{fundSentiment:'Mixed'},{fundSentiment:'Unknown'},
    {fundSentiment:undefined},{relationshipStrength:'Weak'},
    {relationshipStrength:'Developing'},{relationshipStrength:'Unknown'},
    {relationshipStrength:undefined},{referralAskAt:'2026-10-01'},
    {referralAskAt:'2026-09-01'},{referralAskAt:'not-a-date'},
  ]){
    assert.equal(choose({...base(),contacts:[{...ready,...patch}]}).kind,'check-in');
  }
  const aware={...ready,referralAwareness:'Clear'};
  assert.equal(choose({...base(),contacts:[aware]}).kind,'check-in');
  assert.equal(choose({...base(),contacts:[{...aware,referralAskAt:'2026-08-01'}]}).kind,'referral-ask');
  assert.equal(choose({...base(),contacts:[{...aware,referralUnderstanding:'Needs context'}]}).kind,'referral-ask');
  assert.equal(choose({...base(),contacts:[ready,{...teammate,fundSentiment:'Negative'}]}).kind,'check-in');
  assert.equal(choose({...base(),contacts:[ready,{...teammate,fundSentiment:'Negative'}]}).personId,'team');
  assert.equal(choose({...base(),contacts:[{...ready,id:'occasional',dealFlow:'Occasional'},{...ready,id:'frequent'}]}).personId,'frequent');
  assert.equal(choose({...base(),contacts:[{...ready,id:'strong',dealFlow:'Occasional'},{...teammate,id:'unknown',dealFlow:'Frequent'}]}).personId,'strong');
  const known=choose({...base(),deals:[{...deal,intake:'Known to referrer'}]});
  assert.equal(known.kind,'referral');
  assert.equal(known.button,'Review introduction');
  assert.match(known.reason,/introduction to Together has not been recorded/);
  assert.doesNotMatch(known.reason,/shared this referral/);
  assert.equal(choose({...base(),contacts:[ready],deals:[deal]}).kind,'referral');
  assert.equal(choose({...base(),contacts:[{...ready,fundSentiment:'Negative'}],feed:[feed]}).kind,'share-resource');

  // Cross-portfolio research must match explicit expertise/topics, not AI or note prose.
  const voiceResource={...feed,id:'voice-source',companyIds:['elsewhere'],title:'New speech transcription research',summary:'A source about streaming audio and transcription.',topic:'Voice models'};
  const taggedPerson={...teammate,interests:'Voice and speech interfaces'};
  const matched=choose({...base(),contacts:[taggedPerson],feed:[voiceResource]});
  assert.equal(matched.kind,'share-resource');
  assert.equal(matched.personId,'team');
  assert.equal(matched.feedId,'voice-source');
  assert.match(matched.reason,/expertise and topics: Voice and speech/);
  assert.doesNotMatch(matched.reason,/strong relationship|positive view/);
  const explicitMeeting={id:'meeting',date:'2026-09-19',body:'Unstructured discussion',topics:['Voice'],askedForReferrals:false};
  assert.equal(choose({...base(),contacts:[{...teammate,meetingNotes:[explicitMeeting]}],feed:[voiceResource]}).feedId,'voice-source');
  assert.equal(choose({...base(),contacts:[{...teammate,interests:'AI technology',meetingNotes:[{...explicitMeeting,body:'Discussed voice and speech research',topics:[]}]}],feed:[voiceResource]}).kind,'check-in');
  assert.equal(choose({...base(),contacts:[taggedPerson],feed:[voiceResource,{...voiceResource,id:'company-source',companyIds:['test'],publishedAt:'2026-09-19'}]}).feedId,'company-source');
  assert.equal(choose({...base(),contacts:[{...teammate,interests:'Prior authorization in healthcare'}],feed:[{...voiceResource,title:'OAuth for agent authorization',summary:'Authentication and agent identity',topic:'Agent security'}]}).kind,'check-in');
  assert.equal(choose({...base(),contacts:[taggedPerson],feed:[voiceResource],drafts:[{...handledDraft,personId:'team',resourceId:voiceResource.id}]}).kind,'check-in');
  assert.equal(choose({...base(),contacts:[taggedPerson],feed:[voiceResource],drafts:[{...handledDraft,personId:'founder',resourceId:voiceResource.id}]}).feedId,voiceResource.id);

  // New fields survive legacy records and partial writes. Updating focus must not clear mailbox settings.
  const storage=new Map();
  globalThis.localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)};
  const {readLocalData,localRequest}=await server.ssrLoadModule('/src/local-data.ts');
  let saved=readLocalData();
  assert.equal(saved.deals[0].intake,'Passed to Together');
  assert.equal(saved.contacts[0].fundSentiment,undefined);
  const originalContact=saved.contacts[0];
  await localRequest('/api/platform',{kind:'contact',value:{...originalContact,fundSentiment:'Positive',relationshipStrength:'Strong',referralAwareness:'Needs reminder',referralUnderstanding:'Needs context',dealFlow:'Frequent',referralAskAt:'2026-08-01',relationshipOwner:'Shivam',networkDbUrl:'https://example.com/network'}});
  await localRequest('/api/platform',{kind:'contact',value:{id:originalContact.id,companyId:originalContact.companyId,name:originalContact.name,notes:'Updated without losing relationship context'}});
  await localRequest('/api/platform',{kind:'settings',value:{mailbox:'owner@example.com',emailQuery:'label:Referrals'}});
  await localRequest('/api/platform',{kind:'settings',value:{focusCompanyIds:['composio','bad-company','composio','emergent',null]}});
  saved=readLocalData();
  assert.equal(saved.settings.mailbox,'owner@example.com');
  assert.equal(saved.settings.emailQuery,'label:Referrals');
  assert.deepEqual(saved.settings.focusCompanyIds,['composio','emergent']);
  const updated=saved.contacts.find(person=>person.id===originalContact.id);
  for(const [key,value] of Object.entries({fundSentiment:'Positive',relationshipStrength:'Strong',referralAwareness:'Needs reminder',referralUnderstanding:'Needs context',dealFlow:'Frequent',referralAskAt:'2026-08-01',relationshipOwner:'Shivam',networkDbUrl:'https://example.com/network'}))assert.equal(updated[key],value);
  await localRequest('/api/platform',{kind:'settings',value:{emailQuery:'label:Updated'}});
  assert.deepEqual(readLocalData().settings.focusCompanyIds,['composio','emergent']);
  assert.equal(readLocalData().settings.mailbox,'owner@example.com');
  const originalDeal=saved.deals[0];
  await localRequest('/api/platform',{kind:'deal',value:{...originalDeal,intake:'Known to referrer',stage:'New'}});
  await localRequest('/api/platform',{kind:'deal',value:{id:originalDeal.id,notes:'Retain intake state'}});
  assert.equal(readLocalData().deals[0].intake,'Known to referrer');
  const beforeInvalid=storage.get('together-orbit-standalone-v1');
  await assert.rejects(()=>localRequest('/api/platform',{kind:'settings',value:{mailbox:'should-not-persist@example.com',focusCompanyIds:'composio'}}),/Choose portfolio companies/);
  assert.equal(storage.get('together-orbit-standalone-v1'),beforeInvalid);
  for(const stage of ['In conversation','Meeting scheduled','Evaluating']){
    await assert.rejects(()=>localRequest('/api/platform',{kind:'deal',value:{id:originalDeal.id,stage,notes:'Must not partially save'}}),/Passed to Together first/);
    assert.equal(storage.get('together-orbit-standalone-v1'),beforeInvalid);
  }
  await localRequest('/api/platform',{kind:'deal',value:{id:originalDeal.id,intake:'Passed to Together',stage:'In conversation'}});
  const beforeReverse=storage.get('together-orbit-standalone-v1');
  await assert.rejects(()=>localRequest('/api/platform',{kind:'deal',value:{id:originalDeal.id,intake:'Known to referrer'}}),/Passed to Together first/);
  assert.equal(storage.get('together-orbit-standalone-v1'),beforeReverse);
  // Legacy intake defaults to Passed to Together and does not block valid conversation updates.
  const legacy=JSON.parse(beforeReverse);
  delete legacy.deals.find(item=>item.id===originalDeal.id).intake;
  storage.set('together-orbit-standalone-v1',JSON.stringify(legacy));
  await localRequest('/api/platform',{kind:'deal',value:{id:originalDeal.id,stage:'Evaluating'}});
  assert.equal(readLocalData().deals.find(item=>item.id===originalDeal.id).intake,'Passed to Together');
  assert.equal(readLocalData().deals.find(item=>item.id===originalDeal.id).stage,'Evaluating');

  // Meetings are native, private browser records. Retries upsert one note and old meetings never rewind dates.
  await localRequest('/api/platform',{kind:'contact',value:{id:originalContact.id,companyId:originalContact.companyId,name:originalContact.name,lastContactAt:'2026-08-20',referralAskAt:'2026-08-01',notes:'Keep this existing relationship note.'}});
  const originalInterests=readLocalData().contacts.find(person=>person.id===originalContact.id).interests;
  const meeting={id:'meeting-one',date:'2026-09-20',body:'Customer workflows and a useful introduction',topics:[' Voice ','voice','Agent security',''],askedForReferrals:true};
  const saveMeeting=note=>localRequest('/api/platform',{kind:'meeting-note',value:{personId:originalContact.id,note,nextFollowUpAt:'2026-10-20'}});
  await saveMeeting(meeting);
  await saveMeeting({...meeting,body:'Updated meeting details'});
  let person=readLocalData().contacts.find(person=>person.id===originalContact.id);
  assert.equal(person.meetingNotes.length,1);
  assert.equal(person.meetingNotes[0].body,'Updated meeting details');
  assert.deepEqual(person.meetingNotes[0].topics,['Voice','Agent security']);
  assert.equal(person.lastContactAt,'2026-09-20');
  assert.equal(person.referralAskAt,'2026-09-20');
  assert.equal(person.nextFollowUpAt,'2026-10-20');
  assert.equal(person.notes,'Keep this existing relationship note.');
  assert.equal(person.interests,originalInterests);
  assert.equal(person.fundSentiment,'Positive');
  await localRequest('/api/platform',{kind:'meeting-note',value:{personId:person.id,note:{...meeting,id:'meeting-old',date:'2026-07-01',body:'Earlier meeting'},nextFollowUpAt:undefined}});
  person=readLocalData().contacts.find(contact=>contact.id===person.id);
  assert.equal(person.meetingNotes.length,2);
  assert.equal(person.meetingNotes[0].id,'meeting-one');
  assert.equal(person.lastContactAt,'2026-09-20');
  assert.equal(person.referralAskAt,'2026-09-20');
  assert.equal(person.nextFollowUpAt,'2026-10-20');
  await localRequest('/api/platform',{kind:'meeting-note',value:{personId:person.id,note:{...meeting,id:'no-ask',date:'2026-09-20T10:00:00Z',body:'Helpful conversation without a referral request',askedForReferrals:false}}});
  person=readLocalData().contacts.find(contact=>contact.id===person.id);
  assert.equal(person.lastContactAt,'2026-09-20T10:00:00Z');
  assert.equal(person.referralAskAt,'2026-09-20');
  const beforeDraft=structuredClone(person);
  await localRequest('/api/platform',{kind:'draft',value:{...draft,id:'meeting-draft',companyId:person.companyId,personId:person.id,to:'',body:'Request referrals later',resourceId:'resource-for-meeting'}});
  assert.deepEqual(readLocalData().contacts.find(contact=>contact.id===person.id),beforeDraft);
  assert.deepEqual(JSON.parse(storage.get('together-orbit-standalone-v1')).contacts.find(contact=>contact.id===person.id),JSON.parse(JSON.stringify(beforeDraft)));
  await localRequest('/api/platform',{kind:'draft',value:{id:'meeting-draft',archivedAt:'2026-09-21T10:00:00Z'}});
  const archived=readLocalData().drafts.find(item=>item.id==='meeting-draft');
  assert.equal(archived.archivedAt,'2026-09-21T10:00:00Z');
  assert.equal(archived.resourceId,'resource-for-meeting');
  assert.equal(archived.personId,person.id);
  assert.equal(archived.body,'Request referrals later');
  assert.deepEqual(readLocalData().contacts.find(contact=>contact.id===person.id),beforeDraft);
  const beforeInvalidMeeting=storage.get('together-orbit-standalone-v1');
  for(const patch of [{date:'2099-01-01'},{date:'2026-02-30'},{date:'not-a-date'},{body:'   '},{topics:'voice'},{askedForReferrals:'yes'}])await assert.rejects(()=>saveMeeting({...meeting,...patch}));
  await assert.rejects(()=>localRequest('/api/platform',{kind:'meeting-note',value:{personId:'missing',note:meeting}}),/mapped person/);
  assert.equal(storage.get('together-orbit-standalone-v1'),beforeInvalidMeeting);
  console.log('Passed: single-action priority, honest intake, qualified top-three asks, relationship safeguards, valid dates, explicit expertise matching, company isolation, settings persistence, native meeting history, idempotent saves, monotonic contact/ask dates, preserved legacy notes, and drafts without fictional interactions.');
}finally{await server.close()}
