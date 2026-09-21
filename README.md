# Together Orbit

A standalone Together Fund portfolio sourcing dashboard hosted directly on GitHub Pages.

**Website:** https://shivrain.github.io/together-orbit/

The website serves its own React application, styles, public portfolio report and engagement content. It does not redirect, embed another site, or call a ChatGPT-hosted backend.

## A single relationship workspace

Choose a company and see one suggested next step, followed by its people. There are two main views: Network and Referrals. Sources, editors, meeting history and connection details open only when needed.

The built-in relationship database holds people, owners, explicit expertise/interests, meeting notes, follow-up dates, referral awareness, fund sentiment, relationship strength, and whether a founder understands why introductions matter. None of those assessments are invented from a public profile or extracted from meeting prose. Users can keep a private focus list of core referring companies; the full public portfolio stays available.

The next-step selector uses recorded evidence: pending introductions, movements requiring source review, reviewed role changes, follow-ups, unfinished drafts, relevant resources, and relationship-qualified requests for the top three founders someone has met. Explicit topic tags can match research across portfolio sectors. Unknown/weak relationships receive a helpful check-in or resource; generic referral asks require recorded positive sentiment and a strong relationship. Handled drafts do not occupy the queue or repeat the same resource/person suggestion.

Introductions distinguish **Known to referrer** from **Passed to Together**. The same record carries the source person/company, reason for contact, permission and Together conversation stage. Examples stay explicitly labelled and do not drive real next actions.

Meeting notes live on the person, with date, topic tags and whether the top-three-founder question was actually asked. Saving or handling a draft never counts as a conversation or sent email. This has no dependency on NetworkDB or its Replit app.

People, notes, assessments, focus choices, manual movements, introductions and drafts are stored only in each visitor's browser. Export backs up those records. They are not synchronized between teammates. Public founder listings are a starter map, not verification of current employment. Gmail and people-data providers are not connected; no automatic outreach is represented as live.

## Development

Use Node.js 22.13 or newer. Run `npm ci`, then `npm run dev`. Run `npm run build` to regenerate `docs/`. GitHub Actions publishes the built files in `docs/` after relevant commits.

Public website scans run through GitHub Actions daily at 10:00 IST, with a due check for the configured two-day or weekly cadence. The first independent scan completed successfully and processed all 35 companies (32 sources checked, 3 failures recorded).

The published report is `public/data/monitoring.json`; the same data is copied to `docs/data/monitoring.json`. Website scans report source text changes and failures, not employee departures or startup intent.

The engagement feed is independently published as `public/data/engagement.json` and `docs/data/engagement.json`; editing those files does not require rebuilding the UI.

No credentials belong in this repository or browser bundle.
