from __future__ import annotations

import argparse
import re
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen


FDA_QDE_PAGE = "https://fis.fda.gov/extensions/FPD-QDE-FAERS/FPD-QDE-FAERS.html"
RAW_DIR = Path("data/raw")


@dataclass(frozen=True)
class FaersArchive:
    url: str
    filename: str
    quarter: str


class _LinkParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.links: list[tuple[str, str]] = []
        self._current_href: str | None = None
        self._current_text: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() != "a":
            return
        attributes = dict(attrs)
        self._current_href = attributes.get("href")
        self._current_text = []

    def handle_data(self, data: str) -> None:
        if self._current_href:
            self._current_text.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() != "a" or not self._current_href:
            return
        text = " ".join(part.strip() for part in self._current_text if part.strip())
        self.links.append((text, self._current_href))
        self._current_href = None
        self._current_text = []


def _fetch_text(url: str) -> str:
    request = Request(url, headers={"User-Agent": "pharmacovigilance-risk-intelligence/1.0"})
    with urlopen(request, timeout=60) as response:
        return response.read().decode("utf-8", errors="ignore")


def _infer_quarter(url: str) -> str:
    match = re.search(r"(20\d{2})\s*[_-]?\s*q([1-4])", url, flags=re.IGNORECASE)
    if not match:
        return "unknown"
    return f"{match.group(1)}Q{match.group(2)}"


def list_ascii_archives(index_url: str = FDA_QDE_PAGE) -> list[FaersArchive]:
    parser = _LinkParser()
    parser.feed(_fetch_text(index_url))

    archives: list[FaersArchive] = []
    seen_urls: set[str] = set()
    for text, href in parser.links:
        full_url = urljoin(index_url, href)
        parsed_url = urlparse(full_url)
        if "ASCII" not in text.upper() or not parsed_url.path.lower().endswith(".zip"):
            continue
        if full_url in seen_urls:
            continue
        filename = Path(parsed_url.path).name
        archives.append(FaersArchive(url=full_url, filename=filename, quarter=_infer_quarter(full_url)))
        seen_urls.add(full_url)
    return archives


def download_archive(archive: FaersArchive, raw_dir: Path = RAW_DIR, overwrite: bool = False) -> Path:
    raw_dir.mkdir(parents=True, exist_ok=True)
    output_path = raw_dir / archive.filename
    if output_path.exists() and not overwrite:
        print(f"Already downloaded: {output_path}")
        return output_path

    request = Request(archive.url, headers={"User-Agent": "pharmacovigilance-risk-intelligence/1.0"})
    with urlopen(request, timeout=300) as response, output_path.open("wb") as output_file:
        total = int(response.headers.get("Content-Length") or 0)
        downloaded = 0
        while True:
            chunk = response.read(1024 * 1024)
            if not chunk:
                break
            output_file.write(chunk)
            downloaded += len(chunk)
            if total:
                percent = downloaded / total * 100
                print(f"\rDownloading {archive.filename}: {percent:5.1f}%", end="")
        if total:
            print()
    return output_path


def download_faers_archives(
    quarter: str | None = None,
    latest: int = 1,
    raw_dir: Path = RAW_DIR,
    overwrite: bool = False,
) -> list[Path]:
    archives = list_ascii_archives()
    if quarter:
        wanted = quarter.upper().replace(" ", "")
        selected = [archive for archive in archives if archive.quarter.upper() == wanted or wanted.lower() in archive.url.lower()]
        if not selected:
            available = ", ".join(archive.quarter for archive in archives[:12])
            raise ValueError(f"No FDA ASCII archive found for {quarter}. Recent available quarters: {available}")
    else:
        selected = archives[:latest]

    return [download_archive(archive, raw_dir=raw_dir, overwrite=overwrite) for archive in selected]


def main() -> None:
    parser = argparse.ArgumentParser(description="Download FAERS/AEMS quarterly ASCII zip files from FDA.")
    parser.add_argument("--quarter", help="Specific quarter to download, for example 2025Q1.")
    parser.add_argument("--latest", type=int, default=1, help="Number of latest quarters to download when --quarter is omitted.")
    parser.add_argument("--raw-dir", type=Path, default=RAW_DIR, help="Destination folder for downloaded zip files.")
    parser.add_argument("--overwrite", action="store_true", help="Re-download files that already exist.")
    args = parser.parse_args()

    paths = download_faers_archives(
        quarter=args.quarter,
        latest=args.latest,
        raw_dir=args.raw_dir,
        overwrite=args.overwrite,
    )
    print("Downloaded FDA ASCII archives:")
    for path in paths:
        print(f"- {path}")


if __name__ == "__main__":
    main()
