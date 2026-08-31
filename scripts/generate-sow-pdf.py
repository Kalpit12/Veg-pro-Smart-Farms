"""Generate PDF from SOW markdown via HTML + Chrome/Edge headless."""
from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MD_PATH = ROOT / "docs" / "SOW-VegPro-Kenya-Ltd.md"
HTML_PATH = ROOT / "docs" / "SOW-VegPro-Kenya-Ltd.html"
PDF_PATH = ROOT / "docs" / "SOW-VegPro-Kenya-Ltd.pdf"

CSS = """
@page { margin: 2cm; }
body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #1a1a1a; }
h1 { color: #166534; font-size: 22pt; border-bottom: 2px solid #166534; padding-bottom: 8px; }
h2 { color: #14532d; font-size: 14pt; margin-top: 24px; }
table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 10pt; }
th, td { border: 1px solid #ccc; padding: 8px; text-align: left; vertical-align: top; }
th { background: #f0fdf4; }
hr { border: none; border-top: 1px solid #ddd; margin: 20px 0; }
ul { margin: 8px 0; padding-left: 22px; }
"""


def inline(s: str) -> str:
    return re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)


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
        if line.startswith("- "):
            parts.append("<ul>")
            while i < len(lines) and lines[i].startswith("- "):
                parts.append(f"<li>{inline(lines[i][2:])}</li>")
                i += 1
            parts.append("</ul>")
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
