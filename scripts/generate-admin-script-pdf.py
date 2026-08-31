"""Generate PDF from VegPro admin demo script markdown via HTML + Chrome/Edge headless."""
from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MD_PATH = ROOT / "docs" / "DEMO-SCRIPT-Admin-VegPro.md"
HTML_PATH = ROOT / "docs" / "DEMO-SCRIPT-Admin-VegPro.html"
PDF_PATH = ROOT / "docs" / "DEMO-SCRIPT-Admin-VegPro.pdf"

CSS = """
@page { margin: 1.8cm; }
body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10.5pt; line-height: 1.45; color: #1a1a1a; max-width: 100%; }
h1 { color: #166534; font-size: 20pt; border-bottom: 2px solid #166534; padding-bottom: 8px; page-break-after: avoid; }
h2 { color: #14532d; font-size: 13pt; margin-top: 22px; page-break-after: avoid; }
h3 { color: #15803d; font-size: 11pt; margin-top: 16px; page-break-after: avoid; }
table { border-collapse: collapse; width: 100%; margin: 10px 0; font-size: 9pt; page-break-inside: avoid; }
th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; vertical-align: top; }
th { background: #f0fdf4; }
hr { border: none; border-top: 1px solid #ddd; margin: 18px 0; }
ul, ol { margin: 6px 0; padding-left: 22px; }
li { margin: 3px 0; }
blockquote { margin: 10px 0; padding: 10px 14px; border-left: 4px solid #166534; background: #f0fdf4; font-style: italic; }
p { margin: 8px 0; }
strong { color: #14532d; }
"""


def inline(s: str) -> str:
    s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"`([^`]+)`", r"<code>\1</code>", s)
    return s


def md_to_html(md: str) -> str:
    lines = md.splitlines()
    parts: list[str] = []
    i = 0

    while i < len(lines):
        line = lines[i]

        if line.strip().startswith("|"):
            rows = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                if not re.match(r"^\|[\s\-:|]+\|$", lines[i].strip()):
                    cells = [inline(c.strip()) for c in lines[i].strip().strip("|").split("|")]
                    rows.append(cells)
                i += 1
            parts.append("<table>")
            for ri, row in enumerate(rows):
                parts.append("<tr>")
                for cell in row:
                    tag = "th" if ri == 0 else "td"
                    parts.append(f"<{tag}>{cell}</{tag}>")
                parts.append("</tr>")
            parts.append("</table>")
            continue

        if line.strip() == "---":
            parts.append("<hr>")
            i += 1
            continue
        if line.startswith("# "):
            parts.append(f"<h1>{inline(line[2:])}</h1>")
            i += 1
            continue
        if line.startswith("## "):
            parts.append(f"<h2>{inline(line[3:])}</h2>")
            i += 1
            continue
        if line.startswith("### "):
            parts.append(f"<h3>{inline(line[4:])}</h3>")
            i += 1
            continue
        if line.startswith("> "):
            parts.append("<blockquote>")
            while i < len(lines) and lines[i].startswith("> "):
                text = lines[i][2:]
                if text.strip():
                    parts.append(f"<p>{inline(text)}</p>")
                i += 1
            parts.append("</blockquote>")
            continue
        if line.startswith("- "):
            parts.append("<ul>")
            while i < len(lines) and lines[i].startswith("- "):
                parts.append(f"<li>{inline(lines[i][2:])}</li>")
                i += 1
            parts.append("</ul>")
            continue
        if re.match(r"^\d+\.\s", line):
            parts.append("<ol>")
            while i < len(lines) and re.match(r"^\d+\.\s", lines[i]):
                parts.append(f"<li>{inline(re.sub(r'^\d+\.\s', '', lines[i]))}</li>")
                i += 1
            parts.append("</ol>")
            continue
        if not line.strip():
            i += 1
            continue

        parts.append(f"<p>{inline(line)}</p>")
        i += 1

    return (
        f"<!DOCTYPE html><html><head><meta charset='utf-8'>"
        f"<style>{CSS}</style></head><body>{''.join(parts)}</body></html>"
    )


def find_browser() -> str | None:
    for p in [
        Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe"),
        Path(r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"),
        Path(r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"),
    ]:
        if p.exists():
            return str(p)
    return None


def main() -> None:
    HTML_PATH.write_text(md_to_html(MD_PATH.read_text(encoding="utf-8")), encoding="utf-8")
    browser = find_browser()
    if not browser:
        print(f"Open in browser and Print to PDF: {HTML_PATH}")
        sys.exit(1)

    subprocess.run(
        [
            browser,
            "--headless=new",
            "--disable-gpu",
            f"--print-to-pdf={PDF_PATH}",
            HTML_PATH.as_uri(),
        ],
        check=True,
        timeout=60,
    )
    print(f"Created: {PDF_PATH}")


if __name__ == "__main__":
    main()
