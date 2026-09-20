#!/usr/bin/env python3
"""Publish evidence-backed public website reports for the standalone Orbit site.

Python standard library only. Run from the repository root, or pass --repo-root.
No mailbox, LinkedIn, private-source, or people-change access is performed.
"""
from __future__ import annotations

import argparse
import concurrent.futures
import datetime as dt
import hashlib
import http.client
import ipaddress
import json
import os
from pathlib import Path
import re
import socket
import ssl
import sys
import tempfile
import time
from html.parser import HTMLParser
from urllib.parse import urljoin, urlsplit, urlunsplit
import uuid

MAX_BYTES = 1_500_000
MAX_TEXT = 80_000
EXTRACTOR_VERSION = 1
INDIA_TIME = dt.timezone(dt.timedelta(hours=5, minutes=30), name="Asia/Kolkata")
SOURCE_OVERRIDES = {
    "composio": "https://composio.dev/blog",
    "emergent": "https://emergent.sh/blog",
    "runable": "https://runable.com/careers",
}


def timestamp():
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def parse_time(value):
    result = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
    if result.tzinfo is None:
        raise ValueError("Report dates must include a timezone")
    return result


def next_due(previous, days):
    """Anchor to 10:00 IST so runner jitter cannot defer a due scan by a day."""
    local = parse_time(previous).astimezone(INDIA_TIME)
    local_due = local.replace(hour=10, minute=0, second=0, microsecond=0) + dt.timedelta(days=days)
    return local_due.astimezone(dt.timezone.utc)


def read_json(path, default=None, required=False):
    if not path.exists():
        if required:
            raise ValueError(f"Required configuration file is missing: {path}")
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (ValueError, OSError) as error:
        raise ValueError(f"Could not read {path}: {error}") from error


def validate_url(value):
    if not isinstance(value, str) or any(c.isspace() for c in value) or "\\" in value:
        raise ValueError("Source must be a valid HTTPS URL without whitespace")
    parts = urlsplit(value)
    if parts.scheme != "https" or not parts.hostname or parts.username or parts.password:
        raise ValueError("Only public HTTPS URLs without credentials are supported")
    try:
        if parts.port not in (None, 443):
            raise ValueError("Only the standard HTTPS port is supported")
        host = parts.hostname.rstrip(".").encode("idna").decode("ascii").lower()
    except (ValueError, UnicodeError) as error:
        raise ValueError("Source has an invalid host or port") from error
    if not re.fullmatch(r"[a-z0-9.-]+", host) or "." not in host:
        raise ValueError("Source must use a public DNS hostname")
    try:
        ipaddress.ip_address(host)
    except ValueError:
        pass
    else:
        raise ValueError("IP-literal source URLs are not supported")
    return urlunsplit(("https", host, parts.path or "/", parts.query, "")), host


def public_address(host):
    addresses = socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)
    candidates = []
    for family, _, _, _, address in addresses:
        parsed = ipaddress.ip_address(address[0])
        if not parsed.is_global:
            raise ValueError("Source resolves to a non-public network address")
        candidates.append((family, address[0]))
    if not candidates:
        raise ValueError("Source hostname did not resolve")
    candidates.sort(key=lambda item: item[0] != socket.AF_INET)
    return candidates[0][1]


class PinnedHTTPSConnection(http.client.HTTPSConnection):
    """Connect to the validated public IP while verifying the original hostname."""
    def __init__(self, host, address):
        super().__init__(host, timeout=10, context=ssl.create_default_context())
        self.address = address

    def connect(self):
        sock = socket.create_connection((self.address, 443), timeout=self.timeout)
        try:
            self.sock = self._context.wrap_socket(sock, server_hostname=self.host)
        except Exception:
            sock.close()
            raise


def fetch_page(source):
    current, root = validate_url(source)
    root = root.removeprefix("www.")
    started = time.monotonic()
    for _ in range(5):
        current, host = validate_url(current)
        if host != root and not host.endswith("." + root):
            raise ValueError("Website redirected outside its company domain; review the source manually")
        if time.monotonic() - started > 40:
            raise TimeoutError("Website exceeded the 40-second total request limit")
        connection = PinnedHTTPSConnection(host, public_address(host))
        parts = urlsplit(current)
        path = parts.path + ("?" + parts.query if parts.query else "")
        try:
            connection.request("GET", path, headers={
                "Accept": "text/html,application/xhtml+xml",
                "Accept-Encoding": "identity",
                "User-Agent": "TogetherOrbitWebsiteMonitor/1.0 (public company website checks)",
            })
            response = connection.getresponse()
            if response.status in (301, 302, 303, 307, 308):
                location = response.getheader("Location")
                if not location:
                    raise ValueError("Website returned an incomplete redirect")
                current = urljoin(current, location)
                continue
            if not 200 <= response.status < 300:
                raise ValueError(f"Website returned HTTP {response.status}; no baseline was replaced")
            content_type = response.getheader("Content-Type", "")
            if not re.search(r"text/html|application/xhtml\+xml", content_type, re.I):
                raise ValueError("Source did not return an HTML web page")
            if response.getheader("Content-Encoding", "identity").lower() not in ("", "identity"):
                raise ValueError("Source ignored the uncompressed-response request")
            chunks, total = [], 0
            while True:
                if time.monotonic() - started > 40:
                    raise TimeoutError("Website exceeded the 40-second total request limit")
                chunk = response.read(min(65_536, MAX_BYTES + 1 - total))
                if not chunk:
                    break
                total += len(chunk)
                if total > MAX_BYTES:
                    raise ValueError("Page exceeded the 1.5 MB scan limit; review the source manually")
                chunks.append(chunk)
            charset_match = re.search(r"charset\s*=\s*[\"']?([\w.-]+)", content_type, re.I)
            charset = charset_match.group(1) if charset_match else "utf-8"
            try:
                html = b"".join(chunks).decode(charset, errors="replace")
            except LookupError:
                html = b"".join(chunks).decode("utf-8", errors="replace")
            return current, html
        finally:
            connection.close()
    raise ValueError("Website exceeded the four-redirect limit")


class PageText(HTMLParser):
    ignored_tags = {"script", "style", "noscript", "svg", "nav", "header", "footer"}
    block_tags = {"p", "div", "h1", "h2", "h3", "h4", "h5", "h6", "li", "section", "article", "br"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ignored = []
        self.parts = []

    def handle_starttag(self, tag, attrs):
        if tag in self.ignored_tags:
            self.ignored.append(tag)
        elif not self.ignored and tag in self.block_tags:
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag in self.ignored:
            index = len(self.ignored) - 1 - self.ignored[::-1].index(tag)
            self.ignored = self.ignored[:index]
        elif not self.ignored and tag in self.block_tags:
            self.parts.append("\n")

    def handle_data(self, data):
        if not self.ignored:
            self.parts.append(data)


def extract_text(html):
    parser = PageText()
    parser.feed(html)
    parser.close()
    seen, lines = set(), []
    for line in "".join(parser.parts).splitlines():
        line = re.sub(r"\s+", " ", line).strip()
        if len(line) < 18 or line.lower() in {"accept all", "reject all", "cookie preferences", "privacy policy", "terms of service"}:
            continue
        if line not in seen:
            seen.add(line)
            lines.append(line)
    return "\n".join(lines)[:MAX_TEXT]


def compare_text(before, after):
    if before is None:
        return "Baseline saved", "", after[:700]
    previous, current = set(before.splitlines()), set(after.splitlines())
    removed = "\n".join(line for line in before.splitlines() if line not in current)
    added = "\n".join(line for line in after.splitlines() if line not in previous)
    if not removed and not added:
        return "No change", "", "Readable page text matches the previous check; line ordering is ignored."
    return "Content changed", (removed or "No previous text removed.")[:1200], (added or "Text was removed; no new text was added.")[:1200]


def scan_company(company, previous):
    source = SOURCE_OVERRIDES.get(company["id"], company["website"])
    checked_at = timestamp()
    try:
        url, html = fetch_page(source)
        text = extract_text(html)
        if len(text) < 100:
            raise ValueError("No readable public page text; the source may require JavaScript or sign-in")
        old_text = None
        if previous and previous.get("sourceUrl") == source and previous.get("extractorVersion") == EXTRACTOR_VERSION:
            old_text = previous.get("text")
        status, before, summary = compare_text(old_text, text)
        result = {"companyId": company["id"], "status": status, "url": url, "summary": summary, "before": before, "checkedAt": checked_at}
        baseline = {"sourceUrl": source, "url": url, "text": text, "checkedAt": checked_at,
                    "extractorVersion": EXTRACTOR_VERSION, "sha256": hashlib.sha256(text.encode()).hexdigest()}
        return result, baseline
    except Exception as error:
        detail = str(error).strip() or error.__class__.__name__
        return {"companyId": company["id"], "status": "Failed", "url": source,
                "summary": detail[:600], "before": "", "checkedAt": checked_at}, None


def atomic_json_files(files):
    staged = []
    try:
        for path, value in files:
            path.parent.mkdir(parents=True, exist_ok=True)
            with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, prefix=".orbit-", delete=False) as handle:
                json.dump(value, handle, ensure_ascii=False, indent=2)
                handle.write("\n")
                staged.append((Path(handle.name), path))
        for temporary, destination in staged:
            os.replace(temporary, destination)
    finally:
        for temporary, _ in staged:
            temporary.unlink(missing_ok=True)


def validate_inputs(root):
    config = read_json(root / "monitoring/config.json", required=True)
    if not isinstance(config, dict) or type(config.get("enabled")) is not bool or type(config.get("frequencyDays")) is not int or config["frequencyDays"] not in (2, 7):
        raise ValueError("monitoring/config.json must contain enabled: boolean and frequencyDays: 2 or 7")
    companies = read_json(root / "monitoring/companies.json", required=True)
    if not isinstance(companies, list) or not 1 <= len(companies) <= 100:
        raise ValueError("monitoring/companies.json must be an array of 1–100 public companies")
    ids = set()
    for company in companies:
        if not isinstance(company, dict) or not all(isinstance(company.get(key), str) and company[key].strip() for key in ("id", "name", "website")):
            raise ValueError("Every company needs nonempty id, name and website strings")
        if company["id"] in ids:
            raise ValueError("Company IDs must be unique")
        ids.add(company["id"])
        validate_url(company["website"])
    baselines = read_json(root / "monitoring/baselines.json", {"version": 1, "sources": {}})
    if not isinstance(baselines, dict) or baselines.get("version") != 1 or not isinstance(baselines.get("sources"), dict):
        raise ValueError("monitoring/baselines.json must contain version: 1 and sources: {}")
    document = read_json(root / "public/data/monitoring.json", {"reports": [], "notices": [], "settings": {}, "generatedAt": ""})
    if not isinstance(document, dict) or not isinstance(document.get("reports"), list) or not isinstance(document.get("notices"), list) or not isinstance(document.get("settings", {}), dict):
        raise ValueError("Published monitoring data must contain reports and notices arrays, and settings object")
    for report in document["reports"]:
        if not isinstance(report, dict) or not isinstance(report.get("id"), str) or not isinstance(report.get("startedAt"), str):
            raise ValueError("Existing reports must contain id and startedAt; refusing to discard history")
        parse_time(report["startedAt"])
    return config, companies, baselines, document


def run(root, force=False, dry_run=False):
    config, companies, baselines, document = validate_inputs(root)
    reports = sorted(document["reports"], key=lambda item: parse_time(item["startedAt"]), reverse=True)
    last = reports[0] if reports else None
    if not force:
        if not config["enabled"]:
            print("Monitoring is paused in monitoring/config.json; no files changed.")
            return False
        if last:
            due = next_due(last["startedAt"], config["frequencyDays"])
            if dt.datetime.now(dt.timezone.utc) < due:
                print(f"Not due until {due.isoformat()}; no files changed.")
                return False
    started_at = timestamp()
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        tasks = [pool.submit(scan_company, company, baselines["sources"].get(company["id"])) for company in companies]
        observations = [task.result() for task in tasks]
    results = [result for result, _ in observations]
    for company, (_, baseline) in zip(companies, observations):
        if baseline is not None:
            baselines["sources"][company["id"]] = baseline
    completed_at = timestamp()
    failed = sum(result["status"] == "Failed" for result in results)
    changed = sum(result["status"] == "Content changed" for result in results)
    report_id = "report-" + str(uuid.uuid4())
    report = {"id": report_id, "startedAt": started_at, "completedAt": completed_at,
              "status": "Partial" if failed else "Completed", "results": results, "nextIndex": len(companies),
              "trigger": "Manual" if force else "Scheduled",
              "peopleStatus": "Public website text only. Employee departures, new roles and new companies require a connected people-data provider and separate evidence."}
    notice = {"id": "notice-" + report_id,
              "title": f"{changed} portfolio website changes to review" if changed else "Portfolio report ready",
              "detail": f"{len(results) - failed}/{len(results)} company websites checked. {failed} sources unavailable. Public website changes do not establish employee moves.",
              "reportId": report_id, "read": False, "createdAt": completed_at}
    document.update({"reports": [report] + reports[:7], "notices": [notice] + document["notices"][:19],
                     "settings": {**document.get("settings", {}), "enabled": config["enabled"], "frequencyDays": config["frequencyDays"], "schedulerRegistered": True},
                     "generatedAt": completed_at})
    if not dry_run:
        atomic_json_files([
            (root / "monitoring/baselines.json", baselines),
            (root / "public/data/monitoring.json", document),
            (root / "docs/data/monitoring.json", document),
        ])
    print(f"{'Dry run — no files written. ' if dry_run else ''}{report['status']}: {len(results) - failed}/{len(results)} websites checked, {changed} changed, {failed} failed.")
    for result in results:
        print(f"{result['companyId']}: {result['status']}" + (f" — {result['summary']}" if result["status"] == "Failed" else ""))
    return not dry_run


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", type=Path, default=Path.cwd(), help="Repository containing monitoring/, public/ and docs/")
    parser.add_argument("--force", action="store_true", help="Run now even if paused or before the next due date")
    parser.add_argument("--dry-run", action="store_true", help="Perform due scans but do not write any files; combine with --force for an immediate check")
    args = parser.parse_args()
    try:
        run(args.repo_root.resolve(), force=args.force, dry_run=args.dry_run)
    except Exception as error:
        print(f"Monitoring failed before publication: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
