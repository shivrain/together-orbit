# Together Orbit

A standalone Together Fund portfolio sourcing dashboard hosted directly on GitHub Pages.

**Website:** https://shivrain.github.io/together-orbit/

The website serves its own React application, styles, public portfolio report and engagement content. It does not redirect, embed another site, or call a ChatGPT-hosted backend.

## Workflows

- Referral inbox: eight clearly marked sample introductions, editable stages and notes, manual referrals, and email-based referral sharing.
- Portfolio monitoring: dated source reports for all 35 portfolio companies, report history, notifications, CSV export, and a GitHub scan workflow.
- Founder engagement: ten researched resources with source links, reusable templates, recipients, local drafts, copy, and open-in-email actions.

Referrals, recipients and drafts are stored only in each visitor's browser. Export creates a local backup. They are not synchronized between teammates. Email and people-data providers are not connected.

## Development

Use Node.js 22.13 or newer. Run `npm ci`, then `npm run dev`. Run `npm run build` to regenerate `docs/`. GitHub Actions publishes the built files in `docs/` after relevant commits.

Public website scans run through GitHub Actions daily at 10:00 IST, with a due check for the configured two-day or weekly cadence. The first independent scan completed successfully and processed all 35 companies (32 sources checked, 3 failures recorded).

The published report is `public/data/monitoring.json`; the same data is copied to `docs/data/monitoring.json`. Website scans report source text changes and failures, not employee departures or startup intent.

The engagement feed is independently published as `public/data/engagement.json` and `docs/data/engagement.json`; editing those files does not require rebuilding the UI.

No credentials belong in this repository or browser bundle.
