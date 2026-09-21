# Together Orbit

A standalone Together Fund content and referral workspace on GitHub Pages.

**Website:** https://shivrain.github.io/together-orbit/

The complete React application runs on GitHub Pages. It does not redirect to or depend on a ChatGPT-hosted app.

## Content

The library answers one question: **why would this founder be glad we wrote?** Sector news a founder already follows more closely than we do is not content — 11 such briefs were removed on September 21, 2026 and replaced with material that earns a reply. Each brief is tagged with the reason it does:

- **Together** — something the fund itself published. The most natural reason to write.
- **Portfolio peer** — a post, benchmark or war story by another portfolio founder, with an offer to connect the two.
- **Operating playbook** — dated, sourced guidance on a decision the founder is actually making: pricing, first GTM hire, segment choice, when to add sales.
- **Buyer data** — third-party survey evidence the founder can use in their own sales conversations.

22 briefs cover 30 portfolio companies with 96 recipient-specific messages. Every brief carries publication and research dates, two or three takeaways quoted from the source, an explicit engagement move (what to do with it), a discussion question, and named recipients with a reason grounded in their public role.

Choose a read and a person to see the relevant context and personal note. Prepare, edit, save or copy a draft, or open your email app. A saved or archived draft never implies an email was sent.

Source findings and our suggested applications are distinct. Public roles inform relevance; they do not establish private interests, current company problems, relationships or consent. Older references retain their original dates. Podcast notes do not imply access to paywalled transcripts.

## Referrals

**Founders to ask about** contains nine researched paths: five portfolio alumni now founding companies, a named advisor relationship, three documented founder pitches, and one explicitly adjacent consumer-AI angel connection. Each includes the relationship evidence, product context, suggested ask, source links and limitations. Research candidates are separate from actual referrals.

The alumni entries came from an exhaustive sweep of Y Combinator founder biographies across batches W22–S26 (2,959 company pages), matching prior employers against the portfolio. That sweep is exhaustive for YC-backed alumni only; alumni who founded companies outside YC remain unsearched.

**Referral pipeline** records who shared a founder, the originating portfolio company, permission, conversation stage and next action. It distinguishes a lead known to a referrer from an introduction passed to Together. A summary strip counts what needs an introduction, what is live, what is overdue and what has no next step recorded. Fictional workflow examples are hidden by default and clearly labeled.

The public referral form at `#refer` prepares a structured email to `shivam@together.fund` (or the explicitly chosen mailbox in a shared link). The founder sends it from their email app. Paste the received email into Add referral to fill its fields, review and save. There is no live inbox connection or automatic import.

## Storage and research

Personal drafts and referral records save only in the visitor’s browser, without teammate synchronization. **Export** backs up private records; **Import** merges a Together Orbit export back in, adding and updating records by id without deleting anything. Import is how private referral history reaches the workspace — that data must never enter this public repository. Older people, meeting notes and other workspace records are preserved even though the main interface now focuses on content and referrals.

Public content lives in `public/data/engagement.json`; research leads in `public/data/referral-opportunities.json`; supporting professional profiles in `public/data/network.json`. All are copied into `docs/data/` by the build. Source updates refresh without overwriting private notes or saved identities. Do not publish private emails, relationship assessments or actual referral activity in these files.

Existing GitHub website checks continue on their configured cadence. They detect website text changes, not employee departures or startup intent. Gmail, Clay and Harmonic are not connected.

## Development

Use Node.js 22.13 or newer. Run `npm ci`, then `npm run dev`. `npm run build` regenerates `docs/`; GitHub Actions deploys that standalone artifact. The build empties `docs/`, so restore `docs/.nojekyll` before committing.

Validation: `node scripts/check-local.mjs`, `node scripts/check-next-action.mjs`, `node scripts/check-network-research.mjs`, `node scripts/check-referral-workflow.mjs`, TypeScript, production build and browser checks. No credentials belong in the repository or bundle.
