# Together Orbit

A standalone Together Fund content and referral workspace on GitHub Pages.

**Website:** https://shivrain.github.io/together-orbit/

The complete React application runs on GitHub Pages. It does not redirect to or depend on a ChatGPT-hosted app.

## Content

The library answers one question: **why would this founder be glad we wrote?** Company announcements, podcasts, opinion newsletters and press releases were removed — a founder does not need their investor to forward them the news. What remains is research.

- **Research breakthrough (110)** — recent papers from arXiv, harvested through the public arXiv API across 38 topic areas mapped to what each portfolio company builds: agent tool use, agent memory, retrieval grounding, speech recognition, document extraction, clinical NLP, PII detection, prompt-injection defence, chip-design ML, recommender systems, evolutionary search and more. Every title, abstract, author list, date and URL comes from the API; takeaways are quoted verbatim from the abstract and labelled as such. Framing and questions are ours.
- **Industry research (7)** — original datasets: RevenueHero's million-submission funnel benchmarks, ChartMogul segment persistence across 1,043 companies, Sumble GTM hiring across 22,988 job posts, DORA, LinkedIn.
- **Buyer data (5)** — third-party surveys a founder can quote in their own sales calls: MGMA, Battery, Deloitte CFO Signals, FinOps, APTA.

122 briefs cover 34 portfolio companies with 251 recipient-specific messages. Each carries publication and research dates, takeaways, an engagement move, a discussion question, and named recipients with a reason grounded in their public role. Recipients rotate across a company's mapped people rather than always addressing the CEO.

Choose a read and a person, then **Send in Gmail** opens a compose window already written and addressed — you press Send there. Outlook and your desktop email app are alongside it, and drafts save locally. Nothing is sent automatically, and a saved or archived draft never implies an email was sent.

Source findings and our suggested applications are distinct. Quoting an abstract is not the same as having read the paper, and the briefs say so. Public roles inform relevance; they do not establish private interests, current company problems, relationships or consent.

## Leads

**Founders to ask about.** Someone in the portfolio is already one step away from a founder worth meeting; these are the routes worth asking about.

- **Evidence-backed routes (9)** — each names a documented connection: an advisory listing, a disclosed angel investment, a recorded pitch session, or a former employee now founding. Five came from an exhaustive sweep of Y Combinator founder biographies across batches W22–S26 (2,959 company pages), matching prior employers against the portfolio. That sweep is exhaustive for YC-backed alumni only.
- **Referrals (30)** — illustrative records that populate the view until verified referral data replaces them. The startups are real companies from Together's own recorded dealflow; the portfolio company on each is matched by sector overlap and has not made an introduction. They render exactly like real referrals, so the qualification lives in the record: `illustrative: true`, a `sample-` id, and a `limitations` line the validator refuses to let them drop, along with any source or website.

The public referral form at `#refer` prepares a structured email to `shivam@together.fund` (or the mailbox named in a shared link). The founder sends it from their own email app. There is no live inbox connection.

The referral pipeline — the stage-tracked table of introductions received — was removed. `Deal`, `localRequest('deal')`, export and import still hold that data, so restoring the view is a small change.

## Activity

Who just left a portfolio company, and what they are building now. People who left **to start something** sort first; people who moved to another company are context.

Each row shows the person, the role they held, where they are now, the evidence quoted from a public page, the event date and a link to the source. Nothing is marked reviewed until a human opens the source. "Ask <founder>" drafts a note to the portfolio founder asking what that person was like to work with.

A departure is not evidence that someone is raising money, and none of this implies consent to be contacted.

## Storage and research

Personal drafts and referral records save only in the visitor’s browser, without teammate synchronization. **Export** backs up private records; **Import** merges a Together Orbit export back in, adding and updating records by id without deleting anything. Import is how private referral history reaches the workspace — that data must never enter this public repository. Older people, meeting notes and other workspace records are preserved even though the main interface now focuses on content and referrals.

Public content lives in `public/data/engagement.json`; research leads in `public/data/referral-opportunities.json`; supporting professional profiles in `public/data/network.json`. All are copied into `docs/data/` by the build. Source updates refresh without overwriting private notes or saved identities. Do not publish private emails, relationship assessments or actual referral activity in these files.

Existing GitHub website checks continue on their configured cadence. They detect website text changes, not employee departures or startup intent. Gmail, Clay and Harmonic are not connected.

## Development

Use Node.js 22.13 or newer. Run `npm ci`, then `npm run dev`. `npm run build` regenerates `docs/`; GitHub Actions deploys that standalone artifact. The build empties `docs/`, so restore `docs/.nojekyll` before committing.

Validation: `node scripts/check-local.mjs`, `node scripts/check-next-action.mjs`, `node scripts/check-network-research.mjs`, `node scripts/check-referral-workflow.mjs`, TypeScript, production build and browser checks. No credentials belong in the repository or bundle.
