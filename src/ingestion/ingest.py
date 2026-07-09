"""Unified ingestion CLI for the project.

This file consolidates the FAERS ASCII download/extract/load logic and the
openFDA extractor into a single entrypoint for simplicity.

Usage:
  python -m src.ingestion.ingest --source openfda
  python -m src.ingestion.ingest --source ascii --download --latest 1
"""
from __future__ import annotations

import argparse
import json
import os
import re
import socket
import time
from dataclasses import dataclass
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path
from typing import Optional
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit, urljoin, urlparse
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from zipfile import ZipFile

import pandas as pd
import yaml


# ----- Download FAERS ASCII archives -------------------------------------------------
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


# ----- Load FAERS staging tables -----------------------------------------------------
RAW_DIR = Path("data/raw")
STAGING_DIR = Path("data/processed/staging")

TABLE_ALIASES = {
    "demo": "DEMO",
    "drug": "DRUG",
    "reac": "REAC",
    "outc": "OUTC",
}


def _detect_separator(path: Path) -> str:
    if path.suffix.lower() == ".csv":
        return ","
    with path.open("r", encoding="utf-8", errors="ignore") as handle:
        sample = handle.readline()
    separators = ["$", "|", "\t", ","]
    return max(separators, key=sample.count)


def extract_faers_archives(raw_dir: Path = RAW_DIR) -> list[Path]:
    raw_dir.mkdir(parents=True, exist_ok=True)
    extracted: list[Path] = []
    for archive in raw_dir.glob("*.zip"):
        output_dir = raw_dir / archive.stem
        output_dir.mkdir(parents=True, exist_ok=True)
        with ZipFile(archive) as zip_file:
            zip_file.extractall(output_dir)
        extracted.append(output_dir)
    return extracted


def _read_table(path: Path) -> pd.DataFrame:
    separator = _detect_separator(path)
    frame = pd.read_csv(path, sep=separator, dtype=str, low_memory=False)
    frame.columns = [column.strip().lower() for column in frame.columns]
    return frame.dropna(how="all").drop_duplicates()


def _find_raw_files(raw_dir: Path) -> dict[str, Path]:
    files: dict[str, Path] = {}
    for path in raw_dir.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in {".csv", ".txt", ".tsv"}:
            continue
        upper_name = path.name.upper()
        for table_key, token in TABLE_ALIASES.items():
            if token in upper_name and table_key not in files:
                files[table_key] = path
    return files


def load_faers_tables(raw_dir: Path = RAW_DIR, staging_dir: Path = STAGING_DIR) -> dict[str, pd.DataFrame]:
    raw_dir.mkdir(parents=True, exist_ok=True)
    staging_dir.mkdir(parents=True, exist_ok=True)

    extract_faers_archives(raw_dir)
    raw_files = _find_raw_files(raw_dir)
    tables: dict[str, pd.DataFrame] = {}
    for table_name, path in raw_files.items():
        table = _read_table(path)
        tables[table_name] = table
        table.to_csv(staging_dir / f"{table_name}.csv", index=False)
    return tables


# ----- openFDA extractor & helper functions -----------------------------------------
OPENFDA_EVENT_URL = "https://api.fda.gov/drug/event.json"
SCOPE_PATH = Path("config/analysis_scope.yaml")
RAW_OUTPUT_PATH = Path("data/raw/openfda_drug_event_reports.jsonl")
VALIDATION_RAW_OUTPUT_PATH = Path("data/raw/openfda_validation_drug_event_reports.jsonl")
ALL_RAW_OUTPUT_PATH = Path("data/raw/openfda_all_drug_event_reports.jsonl")
MASTER_OUTPUT_PATH = Path("data/processed/master_safety_dataset.csv")
VALIDATION_MASTER_OUTPUT_PATH = Path("data/processed/validation_drug_master_safety_dataset.csv")
ALL_MASTER_OUTPUT_PATH = Path("data/processed/all_drug_master_safety_dataset.csv")
OPENFDA_MAX_SKIP = 10000
RETRY_STATUS_CODES = {429, 500, 502, 503, 504}


def load_scope(path: Path = SCOPE_PATH) -> dict:
    with path.open("r", encoding="utf-8") as handle:
        return yaml.safe_load(handle)


def _redact_api_key(url: str) -> str:
    parts = urlsplit(url)
    query = urlencode(
        [
            (key, "***" if key == "api_key" else value)
            for key, value in parse_qsl(parts.query, keep_blank_values=True)
        ]
    )
    return urlunsplit((parts.scheme, parts.netloc, parts.path, query, parts.fragment))


def _request_json(params: dict[str, str | int], retries: int = 4) -> dict:
    api_key = os.getenv("OPENFDA_API_KEY")
    if api_key:
        params["api_key"] = api_key
    url = f"{OPENFDA_EVENT_URL}?{urlencode(params)}"
    redacted_url = _redact_api_key(url)
    request = Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 faers-signal-analytics/1.0",
        },
    )

    for attempt in range(retries + 1):
        try:
            with urlopen(request, timeout=120) as response:
                return json.loads(response.read().decode("utf-8"))
        except HTTPError as error:
            body = error.read().decode("utf-8", errors="ignore")
            if error.code == 404:
                return {"results": []}
            if error.code in RETRY_STATUS_CODES and attempt < retries:
                wait_seconds = 2 ** attempt
                print(f"openFDA HTTP {error.code}; retrying in {wait_seconds}s...")
                time.sleep(wait_seconds)
                continue
            if error.code == 403:
                raise RuntimeError(
                    "openFDA returned HTTP 403 Forbidden. This usually means the request was blocked "
                    "or the public unauthenticated API limit was hit. Get a free API key from "
                    "https://open.fda.gov/apis/authentication/ and set it in PowerShell with:\n"
                    "$env:OPENFDA_API_KEY='your_key_here'\n"
                    f"Failed URL: {redacted_url}\n"
                    f"openFDA response: {body[:500]}"
                ) from error
            raise RuntimeError(
                f"openFDA request failed with HTTP {error.code}. URL: {redacted_url}. Response: {body[:500]}"
            ) from error
        except (URLError, ConnectionResetError, TimeoutError, socket.timeout) as error:
            if attempt < retries:
                wait_seconds = 2 ** attempt
                print(f"openFDA connection error; retrying in {wait_seconds}s...")
                time.sleep(wait_seconds)
                continue
            raise RuntimeError(f"Could not connect to openFDA. Check your internet connection. URL: {redacted_url}") from error


def _reaction_filter(reactions: list[str]) -> str:
    terms = [f'patient.reaction.reactionmeddrapt:"{reaction}"' for reaction in reactions]
    return "(" + " OR ".join(terms) + ")"


def _build_search(
    drug: str | None,
    start_date: str,
    end_date: str,
    serious_only: bool,
    reactions: list[str] | None = None,
) -> str:
    filters = [f"receivedate:[{start_date} TO {end_date}]"]
    if drug:
        filters.append(f'patient.drug.medicinalproduct.exact:"{drug.upper()}"')
    if serious_only:
        filters.append("serious:1")
    if reactions:
        filters.append(_reaction_filter(reactions))
    return " AND ".join(filters)


def _date_windows(start_date: str, end_date: str, window_years: int) -> list[tuple[str, str]]:
    start_year = datetime.strptime(start_date, "%Y%m%d").year
    end_year = datetime.strptime(end_date, "%Y%m%d").year
    windows: list[tuple[str, str]] = []
    for year in range(start_year, end_year + 1, window_years):
        window_start = max(int(start_date), int(f"{year}0101"))
        window_end_year = min(year + window_years - 1, end_year)
        window_end = min(int(end_date), int(f"{window_end_year}1231"))
        windows.append((str(window_start), str(window_end)))
    return windows


def _flatten_scope_values(value: object) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        return [value]
    if isinstance(value, dict):
        flattened: list[str] = []
        for nested in value.values():
            flattened.extend(_flatten_scope_values(nested))
        return flattened
    if isinstance(value, list):
        flattened: list[str] = []
        for item in value:
            flattened.extend(_flatten_scope_values(item))
        return flattened
    return [str(value)]


def _normalize_scope_list(values: object) -> set[str]:
    return {_normalize_text(value) for value in _flatten_scope_values(values)}


def _get_scope_reactions(scope: dict) -> list[str]:
    reactions = scope.get("priority_reactions")
    if reactions is None:
        return []
    return _flatten_scope_values(reactions)


def fetch_reports_for_drug(
    drug: str | None,
    start_date: str,
    end_date: str,
    serious_only: bool = True,
    max_records: int | None = None,
    page_size: int = 100,
    query_window_years: int = 1,
    reactions: list[str] | None = None,
) -> list[dict]:
    reports: list[dict] = []
    for window_start, window_end in _date_windows(start_date, end_date, query_window_years):
        print(f"  date window {window_start}-{window_end}")
        skip = 0
        while True:
            if skip >= OPENFDA_MAX_SKIP:
                print(f"    reached openFDA skip limit ({OPENFDA_MAX_SKIP}) for {drug} in window {window_start}-{window_end}")
                break
            remaining = None if max_records is None else max_records - len(reports)
            if remaining is not None and remaining <= 0:
                return reports
            params = {
                "search": _build_search(drug, window_start, window_end, serious_only, reactions),
                "limit": page_size if remaining is None else min(page_size, remaining),
                "skip": skip,
            }
            try:
                payload = _request_json(params)
            except RuntimeError as error:
                print(f"    request failed for {drug} in window {window_start}-{window_end}: {error}")
                break
            batch = payload.get("results", [])
            if not batch:
                break
            reports.extend(batch)
            if len(batch) < page_size:
                break
            skip += page_size
            time.sleep(0.2)
    return reports


def _max_records_from_scope(scope: dict) -> int | None:
    value = scope.get("max_records_per_drug")
    if value in {None, "", 0, "0", "all", "ALL"}:
        return None
    return int(value)


def _download_openfda_reports_for_drugs(
    drugs: list[str],
    start_date: str,
    end_date: str,
    serious_only: bool,
    max_records: int | None,
    page_size: int,
    query_window_years: int,
    reactions: list[str] | None = None,
    output_path: Path | None = None,
) -> list[dict]:
    if output_path is not None:
        output_path.parent.mkdir(parents=True, exist_ok=True)

    seen_report_ids: set[str] = set()
    all_reports: list[dict] = []

    for drug in drugs:
        print(f"Pulling openFDA reports for {drug}...")
        reports = fetch_reports_for_drug(
            drug=drug,
            start_date=start_date,
            end_date=end_date,
            serious_only=serious_only,
            max_records=max_records,
            page_size=page_size,
            query_window_years=query_window_years,
            reactions=reactions,
        )
        for report in reports:
            report_id = str(report.get("safetyreportid", ""))
            if report_id and report_id in seen_report_ids:
                continue
            seen_report_ids.add(report_id)
            all_reports.append(report)

    if output_path is not None:
        with output_path.open("w", encoding="utf-8") as handle:
            for report in all_reports:
                handle.write(json.dumps(report) + "\n")
    return all_reports


def _download_openfda_reports_for_search(
    start_date: str,
    end_date: str,
    serious_only: bool,
    max_records: int | None,
    page_size: int,
    query_window_years: int,
    reactions: list[str] | None = None,
    output_path: Path | None = None,
) -> list[dict]:
    if output_path is not None:
        output_path.parent.mkdir(parents=True, exist_ok=True)

    print("Pulling openFDA reports for all drugs...")
    reports = fetch_reports_for_drug(
        drug=None,
        start_date=start_date,
        end_date=end_date,
        serious_only=serious_only,
        max_records=max_records,
        page_size=page_size,
        query_window_years=query_window_years,
        reactions=reactions,
    )
    if output_path is not None:
        with output_path.open("w", encoding="utf-8") as handle:
            for report in reports:
                handle.write(json.dumps(report) + "\n")
    return reports


def download_openfda_reports(scope: dict, output_path: Path = RAW_OUTPUT_PATH) -> list[dict]:
    api_reactions = _get_scope_reactions(scope) if scope.get("filter_reactions_in_api", False) else None

    return _download_openfda_reports_for_search(
        start_date=str(scope["start_date"]),
        end_date=str(scope["end_date"]),
        serious_only=bool(scope.get("serious_only", True)),
        max_records=_max_records_from_scope(scope),
        page_size=int(scope.get("page_size", 100)),
        query_window_years=int(scope.get("query_window_years", 1)),
        reactions=api_reactions,
        output_path=output_path,
    )


def _outcome_type(report: dict) -> str:
    if str(report.get("seriousnessdeath", "0")) == "1":
        return "Death"
    if str(report.get("seriousnessthreatening", "0")) == "1":
        return "Life Threatening"
    if str(report.get("seriousnesshospitalization", "0")) == "1":
        return "Hospitalization"
    if str(report.get("seriousnessdisabling", "0")) == "1":
        return "Disability"
    return "Other"


def _normalize_text(value: object) -> str:
    return str(value or "").strip().lower()


def flatten_reports_to_master(
    reports: list[dict],
    scope: dict,
    output_path: Path = MASTER_OUTPUT_PATH,
    allowed_drugs: set[str] | None = None,
    drug_class_map: dict[str, str] | None = None,
    dataset_type: str = "target",
) -> pd.DataFrame:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    normalized_allowed_drugs = None if allowed_drugs is None else _normalize_scope_list(allowed_drugs)
    drug_class_map = drug_class_map or {}
    reaction_scope = _normalize_scope_list(_get_scope_reactions(scope)) if scope.get("filter_reactions_in_api", False) else set()
    rows: list[dict] = []

    for report in reports:
        patient = report.get("patient", {})
        reactions = patient.get("reaction", []) or []
        drugs = patient.get("drug", []) or []
        reaction_names = [
            reaction.get("reactionmeddrapt")
            for reaction in reactions
            if reaction.get("reactionmeddrapt")
            and (not reaction_scope or _normalize_text(reaction.get("reactionmeddrapt")) in reaction_scope)
        ]
        if not reaction_names:
            continue

        for drug in drugs:
            medicinal_product = drug.get("medicinalproduct")
            normalized_drug = _normalize_text(medicinal_product)
            if normalized_allowed_drugs is not None and normalized_drug not in normalized_allowed_drugs:
                continue
            rows.append(
                {
                    "case_id": report.get("safetyreportid"),
                    "drug_name": str(medicinal_product).strip().title(),
                    "drug_class": drug_class_map.get(normalized_drug, ""),
                    "dataset_type": dataset_type,
                    "reaction_name": ", ".join(sorted({str(reaction_name).strip().title() for reaction_name in reaction_names})),
                    "outcome_type": _outcome_type(report),
                    "report_date": report.get("receivedate"),
                    "patient_age": patient.get("patientonsetage"),
                    "patient_age_unit": patient.get("patientonsetageunit"),
                    "patient_weight": patient.get("patientweight"),
                    "patient_weight_unit": patient.get("patientweightunit"),
                    "patient_gender": patient.get("patientsex"),
                    "serious": report.get("serious"),
                    "seriousness_death": report.get("seriousnessdeath"),
                    "seriousness_life_threatening": report.get("seriousnessthreatening"),
                    "seriousness_hospitalization": report.get("seriousnesshospitalization"),
                    "seriousness_disabling": report.get("seriousnessdisabling"),
                    "primary_source_country": report.get("primarysource", {}).get("reportercountry"),
                    "patient_drug_role": drug.get("activesubstance", {}).get("activesubstancename") if drug.get("activesubstance") else None,
                    "drug_route": drug.get("drugadministrationroute"),
                    "drug_dose": drug.get("dosevbm"),
                    "drug_dose_unit": drug.get("doseunit"),
                    "drug_duration": drug.get("drugduration"),
                    "drug_indication": drug.get("drugindication"),
                    "source": "openFDA Drug Event API",
                }
            )

    master = pd.DataFrame(rows).drop_duplicates()
    master.to_csv(output_path, index=False)
    return master


def run_openfda_extract(scope_path: Path = SCOPE_PATH, fetch_validation: bool = False) -> dict[str, pd.DataFrame]:
    scope = load_scope(scope_path)
    validation_drugs = _flatten_scope_values(scope.get("validation_drugs", []))
    validation_period = scope.get("validation_period", {})
    validation_start = str(validation_period.get("start_date", scope["start_date"]))
    validation_end = str(validation_period.get("end_date", scope["end_date"]))

    api_reactions = _get_scope_reactions(scope) if scope.get("filter_reactions_in_api", False) else None
    serious_only = bool(scope.get("serious_only", True))
    max_records = _max_records_from_scope(scope)
    page_size = int(scope.get("page_size", 100))
    query_window_years = int(scope.get("query_window_years", 1))

    all_reports = _download_openfda_reports_for_search(
        start_date=str(scope["start_date"]),
        end_date=str(scope["end_date"]),
        serious_only=serious_only,
        max_records=max_records,
        page_size=page_size,
        query_window_years=query_window_years,
        reactions=api_reactions,
        output_path=ALL_RAW_OUTPUT_PATH,
    )
    all_master = flatten_reports_to_master(
        all_reports,
        scope,
        output_path=ALL_MASTER_OUTPUT_PATH,
        allowed_drugs=None,
        drug_class_map={},
        dataset_type="all",
    )
    print(f"Created {ALL_MASTER_OUTPUT_PATH} with {len(all_master):,} analysis rows.")

    validation_master = pd.DataFrame()
    if fetch_validation:
        if validation_drugs:
            validation_reports = _download_openfda_reports_for_drugs(
                drugs=validation_drugs,
                start_date=validation_start,
                end_date=validation_end,
                serious_only=serious_only,
                max_records=max_records,
                page_size=page_size,
                query_window_years=query_window_years,
                reactions=api_reactions,
                output_path=None,
            )
            validation_master = flatten_reports_to_master(
                validation_reports,
                scope,
                output_path=VALIDATION_MASTER_OUTPUT_PATH,
                allowed_drugs=_normalize_scope_list(validation_drugs),
                drug_class_map={},
                dataset_type="validation",
            )
            print(f"Created {VALIDATION_MASTER_OUTPUT_PATH} with {len(validation_master):,} analysis rows.")
        else:
            print("No validation drugs configured in the scope file.")

    return {"target": all_master, "validation": validation_master}


def main(argv: Optional[list] = None) -> None:
    parser = argparse.ArgumentParser(description="Unified ingestion: pull ASCII or openFDA and build master dataset.")
    parser.add_argument("--source", choices=["openfda", "ascii"], default="openfda")
    parser.add_argument("--download", action="store_true", help="Download ASCII archives first (only for ascii source)")
    parser.add_argument("--quarter", help="Specific quarter to download, e.g. 2025Q1")
    parser.add_argument("--latest", type=int, default=1, help="Number of latest quarters to download when --download is used")
    parser.add_argument("--overwrite", action="store_true", help="Redownload archives that already exist")
    parser.add_argument(
        "--validation", action="store_true", help="Also build validation dataset when using openfda source"
    )
    args = parser.parse_args(argv)

    if args.source == "openfda":
        run_openfda_extract(fetch_validation=args.validation)
        return

    if args.download:
        download_faers_archives(quarter=args.quarter, latest=args.latest, overwrite=args.overwrite)

    tables = load_faers_tables()
    from src.processing.build_master_dataset import build_master_dataset

    build_master_dataset(tables)


if __name__ == "__main__":
    main()
