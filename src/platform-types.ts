export const stages=["New","Intro requested","In conversation","Meeting scheduled","Evaluating","Closed"] as const;
export type Stage=typeof stages[number];
export type MailMessage={id:string;from:string;to:string;subject:string;body:string;at:string;direction:"inbound"|"outbound"};
export type Deal={id:string;companyId:string;name:string;startup:string;link:string;reason:string;referrer:string;referrerEmail:string;category:string;stage:Stage;owner:string;permission:"Yes"|"Ask first";followUp:string;notes:string;messages:MailMessage[];updatedAt:string;unread:boolean;source:"email"|"manual"|"sample";providerThreadId?:string};
export type Contact={id:string;companyId:string;name:string;email:string;role:string;interests:string};
export type MailDraft={id:string;companyId:string;to:string;subject:string;body:string;status:"Draft"|"Saved to Gmail";providerId?:string;providerRevision?:string;createdAt:string;dealId?:string};
export type Settings={enabled:boolean;frequencyDays:2|7;mailbox:string;emailQuery:string;lastMailSync?:string;lastResearchAt?:string;schedulerRegistered:boolean};
export type MonitorResult={companyId:string;status:"Baseline saved"|"Content changed"|"No change"|"Failed";url:string;summary:string;before:string;checkedAt:string};
export type MonitorReport={id:string;startedAt:string;completedAt:string;status:"Running"|"Completed"|"Partial";results:MonitorResult[];nextIndex:number;trigger:"Scheduled"|"Manual";peopleStatus:string};
export type Movement={id:string;companyId:string;person:string;profile:string;previousRole:string;currentRole:string;previousCompany:string;currentCompany:string;type:"Departure"|"New role"|"Started company";observedAt:string;sourceUrl:string;provider:"Clay"|"Harmonic"|"Public source";evidence:string;confirmed:boolean};
export type FeedItem={id:string;title:string;publisher:string;url:string;publishedAt:string;companyIds:string[];topic:string;summary:string;whyRelevant:string;emailSubject:string;emailBody:string;checkedAt:string};
export type Notice={id:string;title:string;detail:string;reportId:string;read:boolean;createdAt:string};
export type Connections={gmail:boolean;gmailConfigured:boolean;people:boolean;peopleProvider:string;scheduler:boolean;mailbox:string};
export type PlatformData={deals:Deal[];contacts:Contact[];drafts:MailDraft[];reports:MonitorReport[];movements:Movement[];feed:FeedItem[];notices:Notice[];settings:Settings;connections:Connections};
export const defaultSettings:Settings={enabled:true,frequencyDays:2,mailbox:"shivam@together.fund",emailQuery:"label:Together-Referrals",schedulerRegistered:false};
// Anchor report due dates to 10:00 Asia/Kolkata, avoiding daily-run time jitter.
export function nextReportDue(previous:string,days:number){const localDay=Math.floor((Date.parse(previous)+330*60000)/86400000);return (localDay+days)*86400000+270*60000}
