from __future__ import annotations

import csv
import json
import os
import re
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

API_URL = "https://api.fda.gov/drug/event.json"
OUTPUT_DIR = Path("data/processed")
API_KEY = os.getenv("OPENFDA_API_KEY")
DEFAULT_HEADERS = {
    "Accept": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) openFDA-data-downloader/1.0",
}
DRUG_NAMES = [
    "ROFECOXIB",
    "CELECOXIB",
    "DICLOFENAC",
    "IBUPROFEN",
    "NAPROXEN",
    "MELOXICAM",
    "PIROXICAM",
    "INDOMETHACIN",
    "KETOPROFEN",
    "ETODOLAC",
    "SULINDAC",
    "FLURBIPROFEN",
    "MEFENAMIC ACID",
    "KETOROLAC",
    "OXAPROZIN",
    "VALDECOXIB",
    "ETORICOXIB",
    "ASPIRIN",
    "NIMESULIDE",
    "ACECLOFENAC",
]

HEADERS = [
    "safetyreportid",
    "receivedate",
    "serious",
    "seriousnessdeath",
    "seriousnesshospitalization",
    "seriousnessdisabling",
    "seriousnesslifethreatening",
    "patientonsetage",
    "patientsex",
    "drug_names",
    "reaction_names",
    "drug_count",
    "drug_queried",
]


def sanitize_filename(drug_name: str) -> str:
    slug = drug_name.strip().lower().replace(" ", "_")
    slug = re.sub(r"[^a-z0-9_]+", "", slug)
    return slug


def fetch_reports(drug_name: str) -> list[dict]:
    reports: list[dict] = []
    for skip in range(0, 5000, 1000):
        query = f'patient.drug.medicinalproduct:"{drug_name}"'
        params = {"search": query, "limit": 1000, "skip": skip}
        if API_KEY:
            params["api_key"] = API_KEY
        url = f"{API_URL}?{urlencode(params)}"
        request = Request(url, headers=DEFAULT_HEADERS)

        try:
            with urlopen(request, timeout=120) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except HTTPError as error:
            print(f"HTTP error for {drug_name} skip={skip}: {error.code} {error.reason}")
            break
        except URLError as error:
            print(f"URL error for {drug_name} skip={skip}: {error}")
            break
        except json.JSONDecodeError as error:
            print(f"JSON decode error for {drug_name} skip={skip}: {error}")
            break
        except Exception as error:
            print(f"Unexpected error for {drug_name} skip={skip}: {error}")
            break

        batch = payload.get("results", [])
        if not batch:
            break

        reports.extend(batch)
        print(f"Fetched {len(batch)} records for {drug_name} skip={skip}")

        if len(batch) < 1000:
            break

        time.sleep(0.3)

    return reports


def flatten_report(report: dict, drug_name: str) -> dict[str, str | int | None]:
    patient = report.get("patient", {}) or {}
    drug_list = patient.get("drug", []) or []
    reaction_list = patient.get("reaction", []) or []

    drug_names = ";".join(
        str(drug.get("medicinalproduct", "")).strip() for drug in drug_list if drug.get("medicinalproduct")
    )
    reaction_names = ";".join(
        str(reaction.get("reactionmeddrapt", "")).strip() for reaction in reaction_list if reaction.get("reactionmeddrapt")
    )

    return {
        "safetyreportid": report.get("safetyreportid"),
        "receivedate": report.get("receivedate"),
        "serious": report.get("serious"),
        "seriousnessdeath": report.get("seriousnessdeath"),
        "seriousnesshospitalization": report.get("seriousnesshospitalization"),
        "seriousnessdisabling": report.get("seriousnessdisabling"),
        "seriousnesslifethreatening": report.get("seriousnessthreatening"),
        "patientonsetage": patient.get("patientonsetage"),
        "patientsex": patient.get("patientsex"),
        "drug_names": drug_names,
        "reaction_names": reaction_names,
        "drug_count": len(drug_list),
        "drug_queried": drug_name,
    }


def write_csv(path: Path, rows: list[dict[str, str | int | None]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=HEADERS)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    all_rows: list[dict[str, str | int | None]] = []

    for drug_name in DRUG_NAMES:
        print(f"Starting download for {drug_name}")
        reports = fetch_reports(drug_name)
        flattened = [flatten_report(report, drug_name) for report in reports]
        if not flattened:
            print(f"No records returned for {drug_name}")
        drug_file = OUTPUT_DIR / f"faers_{sanitize_filename(drug_name)}.csv"
        write_csv(drug_file, flattened)
        print(f"Wrote {len(flattened)} rows to {drug_file}")
        all_rows.extend(flattened)

    combined_file = OUTPUT_DIR / "faers_all_drugs.csv"
    write_csv(combined_file, all_rows)
    print(f"Wrote combined file with {len(all_rows)} rows to {combined_file}")


if __name__ == "__main__":
    main()
