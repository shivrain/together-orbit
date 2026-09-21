# Together Orbit

A standalone Together Fund portfolio sourcing dashboard hosted directly on GitHub Pages.

**Website:** https://shivrain.github.io/together-orbit/

The website serves its own React application, styles, public portfolio report and engagement content. It does not redirect, embed another site, or call a ChatGPT-hosted backend.

## Sourcing flow

The default screen is the people map, with a persistent three-step workflow and a separate referral outcome:

1. **Map your people:** public portfolio founder records for 35 companies, plus manually added leadership, teammates and alumni. Search by company or person, keep source links, relationship notes and follow-up dates together.
2. **Follow their moves:** record and review sourced departures, new roles and startup launches, then prepare a check-in for the same person. Automatic people tracking explicitly remains disconnected. Existing scheduled website reports sit in a secondary source-check section.
3. **Stay in touch:** choose a person and intent—share something useful, maintain the relationship, or ask about builders in their network. Ten researched resources and eight reusable templates support local email drafts. Log a real conversation separately from saving a draft.
4. **Referral inbox:** capture an introduction with its referring person/company and context; track permission, owner, conversation stage and follow-up. Eight fictional samples are hidden by default and remain labelled when shown or edited.

“Walk through an example” demonstrates the complete narrative without adding fabricated movements or contacts to operational records.

People, relationship notes, manual movements, referrals and drafts are stored only in each visitor’s browser. Export creates a local backup including all those records. They are not synchronized between teammates. Email and people-data providers are not connected; there is no automatic outreach. Public founder listings are a starter map, not verification of current employment.

## Development

Use Node.js 22.13 or newer. Run `npm ci`, then `npm run dev`. Run `npm run build` to regenerate `docs/`. GitHub Actions publishes the built files in `docs/` after relevant commits.

Public website scans run through GitHub Actions daily at 10:00 IST, with a due check for the configured two-day or weekly cadence. The first independent scan completed successfully and processed all 35 companies (32 sources checked, 3 failures recorded).

The published report is `public/data/monitoring.json`; the same data is copied to `docs/data/monitoring.json`. Website scans report source text changes and failures, not employee departures or startup intent.

The engagement feed is independently published as `public/data/engagement.json` and `docs/data/engagement.json`; editing those files does not require rebuilding the UI.

No credentials belong in this repository or browser bundle.
