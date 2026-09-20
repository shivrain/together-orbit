"""Focused offline checks; run with python3 -m unittest -v test_monitor_portfolio.py."""
import datetime as dt
import importlib.util
import json
from pathlib import Path
import socket
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("monitor", Path(__file__).with_name("monitor_portfolio.py"))
monitor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(monitor)


class ScannerTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(dir=Path(__file__).parent)
        self.root = Path(self.temporary.name)
        self.write("monitoring/config.json", {"enabled": True, "frequencyDays": 2})
        self.write("monitoring/companies.json", [
            {"id": "working", "name": "Working", "website": "https://example.com/"},
            {"id": "failed", "name": "Failed", "website": "https://example.org/"},
        ])

    def tearDown(self):
        self.temporary.cleanup()

    def write(self, location, value):
        destination = self.root / location
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(json.dumps(value), encoding="utf-8")

    def test_html_text_and_reordering_are_stable(self):
        text = monitor.extract_text('<html><nav>Ignore this navigation heading</nav><script>Ignore this script body too</script><article><p>A readable product introduction with an &amp; entity.</p><p>Another sufficiently long meaningful paragraph.</p><p>A readable product introduction with an &amp; entity.</p></article></html>')
        self.assertNotIn("Ignore", text)
        self.assertEqual(len(text.splitlines()), 2)
        self.assertIn("& entity", text)
        self.assertEqual(monitor.compare_text(text, "\n".join(reversed(text.splitlines())))[0], "No change")
        self.assertEqual(monitor.compare_text(None, text)[0], "Baseline saved")
        self.assertEqual(monitor.compare_text(text, text + "\nA newly published product detail.")[0], "Content changed")

    def test_private_dns_and_non_https_sources_fail(self):
        for address in ("http://example.com", "https://127.0.0.1", "https://user:pass@example.com", "https://example.com:8443", "https://localhost", "https://example.com/ a"):
            with self.assertRaises(ValueError):
                monitor.validate_url(address)
        with patch.object(socket, "getaddrinfo", return_value=[(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("127.0.0.1", 443))]):
            with self.assertRaisesRegex(ValueError, "non-public"):
                monitor.public_address("example.com")

    def test_missing_config_fails_before_network(self):
        (self.root / "monitoring/config.json").unlink()
        with patch.object(monitor, "scan_company") as scan:
            with self.assertRaisesRegex(ValueError, "Required configuration"):
                monitor.run(self.root, force=True)
            scan.assert_not_called()

    def test_due_is_anchored_to_indian_calendar_day(self):
        self.assertEqual(monitor.next_due("2026-09-20T04:30:37Z", 2).isoformat(), "2026-09-22T04:30:00+00:00")
        self.assertEqual(monitor.next_due("2026-09-20T19:27:00Z", 2).isoformat(), "2026-09-23T04:30:00+00:00")
        self.assertEqual(monitor.next_due("2026-09-20T04:31:59Z", 7).isoformat(), "2026-09-27T04:30:00+00:00")
        # A daily runner starting two seconds after 04:30 must be due even when
        # the prior run started 37 seconds after 04:30 two calendar days earlier.
        self.assertLess(monitor.next_due("2026-09-20T04:30:37Z", 2), monitor.parse_time("2026-09-22T04:30:02Z"))

    def test_not_due_skips_without_changing_files(self):
        data = {"reports": [{"id": "recent", "startedAt": monitor.timestamp()}], "notices": [], "settings": {}}
        self.write("public/data/monitoring.json", data)
        before = (self.root / "public/data/monitoring.json").read_bytes()
        with patch.object(monitor, "scan_company") as scan:
            self.assertFalse(monitor.run(self.root))
            scan.assert_not_called()
        self.assertEqual((self.root / "public/data/monitoring.json").read_bytes(), before)
        self.assertFalse((self.root / "docs/data/monitoring.json").exists())

    def test_partial_report_history_and_failed_baseline_preserved(self):
        old = {"sourceUrl": "https://example.org/", "text": "Keep the last working text", "extractorVersion": 1}
        self.write("monitoring/baselines.json", {"version": 1, "sources": {"failed": old}})
        prior_reports = [{"id": str(index), "startedAt": f"2026-08-{30-index:02d}T04:30:00Z"} for index in range(12)]
        self.write("public/data/monitoring.json", {"reports": prior_reports, "notices": [{"id": str(i)} for i in range(25)], "settings": {"mailbox": "placeholder@example.com"}})
        def fake_scan(company, previous):
            result = {"companyId": company["id"], "status": "Failed" if company["id"] == "failed" else "Baseline saved", "url": company["website"], "summary": "Source unavailable" if company["id"] == "failed" else "Checked public text", "before": "", "checkedAt": monitor.timestamp()}
            return result, None if company["id"] == "failed" else {"text": "New baseline"}
        with patch.object(monitor, "scan_company", side_effect=fake_scan):
            self.assertTrue(monitor.run(self.root, force=True))
        document = json.loads((self.root / "public/data/monitoring.json").read_text())
        self.assertEqual((self.root / "public/data/monitoring.json").read_bytes(), (self.root / "docs/data/monitoring.json").read_bytes())
        self.assertEqual(len(document["reports"]), 8)
        self.assertEqual(len(document["notices"]), 20)
        self.assertEqual(document["reports"][0]["status"], "Partial")
        self.assertEqual(document["reports"][0]["trigger"], "Manual")
        self.assertEqual(document["reports"][0]["nextIndex"], 2)
        self.assertEqual(document["settings"]["mailbox"], "placeholder@example.com")
        self.assertEqual(json.loads((self.root / "monitoring/baselines.json").read_text())["sources"]["failed"], old)

    def test_dry_run_has_no_file_writes(self):
        def fake_scan(company, previous):
            return {"companyId": company["id"], "status": "Failed", "url": company["website"], "summary": "Offline fixture", "before": "", "checkedAt": monitor.timestamp()}, None
        before = sorted(str(p.relative_to(self.root)) for p in self.root.rglob("*"))
        with patch.object(monitor, "scan_company", side_effect=fake_scan):
            self.assertFalse(monitor.run(self.root, force=True, dry_run=True))
        self.assertEqual(sorted(str(p.relative_to(self.root)) for p in self.root.rglob("*")), before)


if __name__ == "__main__":
    unittest.main()
