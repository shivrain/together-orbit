# Standalone Orbit monitoring files

Copy `monitor_portfolio.py` to `scripts/monitor_portfolio.py` and `pages.yml` to `.github/workflows/portfolio-monitor.yml` in `shivrain/together-orbit`. The workflow publishes the prebuilt `docs/` folder; it installs no JavaScript dependencies and uses no ChatGPT service.

The repository must contain:

- `monitoring/companies.json`: a nonempty array of `{ "id": "bytebeam", "name": "Bytebeam", "website": "https://www.bytebeam.io/" }` objects; IDs must be unique.
- `monitoring/config.json`: `{ "enabled": true, "frequencyDays": 2 }`. Supported cadences are 2 or 7 days. This repository file, rather than browser-local preferences, controls the schedule.
- `monitoring/baselines.json`: initially `{ "version": 1, "sources": {} }`. The scanner creates this if absent, but initializing it avoids absent-path errors when a paused workflow has nothing to commit.
- `public/data/monitoring.json`: `{ "reports": [], "notices": [], "settings": { "enabled": true, "frequencyDays": 2, "schedulerRegistered": true }, "generatedAt": "" }`, or the migrated report history in this same shape.
- `docs/data/monitoring.json`: the same published data. Initialize it alongside `public/data/monitoring.json`; the scanner updates both identically.
- `docs/index.html` plus the complete prebuilt website assets, with no redirect or dependency on the former host.

Set the repository's Pages publishing source to **GitHub Actions**. The workflow runs on relevant pushes, at 04:30 UTC daily, and manually from Actions. The next scan is due at 10:00 Asia/Kolkata (`04:30 UTC`) on the last report's local calendar date plus `frequencyDays`, so runner jitter does not delay a scan by another day. Scheduled runs scan only when due and monitoring is enabled. A manual run with **force** selected scans immediately, including when the schedule is paused. On a push, the existing site/data are deployed without running a scan.

Commands from the repository root:

```sh
python3 scripts/monitor_portfolio.py --force
python3 scripts/monitor_portfolio.py --force --dry-run
python3 scripts/monitor_portfolio.py --repo-root /path/to/repository
```

`--dry-run` performs eligible network checks but writes no files. Missing or malformed configuration, duplicate company IDs and invalid report history cause a nonzero exit without publication. Missing baseline/report files can be initialized on the first forced scan. Partial source failures are published truthfully with `Failed` outcomes; the last successful baseline for each failing source remains intact. Eight reports and twenty report notifications are retained. Notices are report records, not email notifications.

The scanner checks public HTML with three concurrent requests, HTTPS only, certificate validation, validated public IP addresses, a 1.5 MB response cap, socket timeouts and at most four redirects. Redirects may remain on the source hostname's company root (after stripping `www.`) or its subdomains. Cross-company redirects fail for manual review. Composio, Emergent and Runable use their existing curated blog/careers sources. It extracts up to 80,000 characters of readable text, ignores navigation/scripts and compares lines without treating reordering as a change. A different extractor version or source URL starts a new baseline. Baselines contain only fetched public website text and are stored in the public repository; do not add private sources or credentials.

Reports do not claim employee departures, LinkedIn coverage, new startups or people-provider integration. The browser can show the published report to every visitor and keep its own referral/draft edits locally. Mailbox access and synchronized private records require a separately authenticated service.

The workflow uses the repository's short-lived `GITHUB_TOKEN` to commit changed report files and deploys in that same run. No GitHub token is embedded in site assets. Repository protections that prohibit direct bot pushes must be adjusted by the owner before scheduled report commits can succeed; a push rejection fails the workflow instead of bypassing protection. Mark scheduling active in the UI only after the first workflow deployment succeeds.

GitHub scheduling can be delayed and public-repository schedules may be disabled after 60 days without repository activity. The website should display the last report timestamp and source failures rather than promising exact execution times.

References: [Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [scheduled workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule), [GITHUB_TOKEN event behavior](https://docs.github.com/en/enterprise-cloud%40latest/actions/concepts/security/github_token).
