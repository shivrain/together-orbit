# Together Orbit

A standalone Together Fund content and referral workspace on GitHub Pages.

**Website:** https://shivrain.github.io/together-orbit/

The complete React application runs on GitHub Pages. It does not redirect to or depend on a ChatGPT-hosted app.

## Content

20 verified source briefs cover 23 portfolio companies. Each includes publication and research dates, useful takeaways, why it matters, and named recipient suggestions. The September 21, 2026 enrichment added 42 takeaways and 61 tailored messages for 45 founders and teammates. The content includes research, technical guides, articles, newsletters and publicly accessible podcast notes.

Choose a read and a person to see the relevant context and personal note. Prepare, edit, save or copy a draft, or open your email app. A saved or archived draft never implies an email was sent.

Source findings and our suggested applications are distinct. Public roles inform relevance; they do not establish private interests, current company problems, relationships or consent. Older references retain their original dates. Podcast notes do not imply access to paywalled transcripts.

## Referrals

**Founders to ask about** contains six researched paths: a portfolio alumnus, three documented founder pitches, a named advisor relationship, and one explicitly adjacent consumer-AI angel connection. Each includes the relationship evidence, product context, suggested ask, source links and limitations. Research candidates are separate from actual referrals.

**Referral pipeline** records who shared a founder, the originating portfolio company, permission, conversation stage and next action. It distinguishes a lead known to a referrer from an introduction passed to Together. Fictional workflow examples are hidden by default and clearly labeled.

The public referral form at `#refer` prepares a structured email to `shivam@together.fund` (or the explicitly chosen mailbox in a shared link). The founder sends it from their email app. Paste the received email into Add referral to fill its fields, review and save. There is no live inbox connection or automatic import.

## Storage and research

Personal drafts and referral records save only in the visitor’s browser, without teammate synchronization. Export backs up private records. Older people, meeting notes and other workspace records are preserved even though the main interface now focuses on content and referrals.

Public content lives in `public/data/engagement.json`; research leads in `public/data/referral-opportunities.json`; supporting professional profiles in `public/data/network.json`. All are copied into `docs/data/` by the build. Source updates refresh without overwriting private notes or saved identities. Do not publish private emails, relationship assessments or actual referral activity in these files.

Existing GitHub website checks continue on their configured cadence. They detect website text changes, not employee departures or startup intent. Gmail, Clay and Harmonic are not connected.

## Development

Use Node.js 22.13 or newer. Run `npm ci`, then `npm run dev`. `npm run build` regenerates `docs/`; GitHub Actions deploys that standalone artifact.

Validation: `node scripts/check-local.mjs`, `node scripts/check-next-action.mjs`, `node scripts/check-network-research.mjs`, `node scripts/check-referral-workflow.mjs`, TypeScript, production build and browser checks. No credentials belong in the repository or bundle.
