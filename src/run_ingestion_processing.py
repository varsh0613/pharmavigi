import argparse

from src.ingestion.download_faers import download_faers_archives
from src.ingestion.load_faers import load_faers_tables
from src.ingestion.openfda_events import run_openfda_extract
from src.processing.build_master_dataset import build_master_dataset


def main() -> None:
    parser = argparse.ArgumentParser(description="Pull, ingest, and process FAERS/openFDA adverse event data.")
    parser.add_argument("--source", choices=["openfda", "ascii"], default="openfda", help="Use openFDA API for analysis or quarterly ASCII extracts.")
    parser.add_argument("--download", action="store_true", help="Download FDA ASCII zip files before ingestion.")
    parser.add_argument("--quarter", help="Specific quarter to download, for example 2025Q1.")
    parser.add_argument("--latest", type=int, default=1, help="Number of latest quarters to download when --download is used.")
    parser.add_argument("--overwrite", action="store_true", help="Re-download FDA zip files that already exist.")
    args = parser.parse_args()

    if args.source == "openfda":
        run_openfda_extract()
        return

    if args.download:
        download_faers_archives(quarter=args.quarter, latest=args.latest, overwrite=args.overwrite)

    tables = load_faers_tables()
    master = build_master_dataset(tables)
    print("FAERS ingestion and processing complete.")
    for table_name, table in sorted(tables.items()):
        print(f"- staged {table_name}: {len(table):,} rows")
    print(f"- master dataset: {len(master):,} rows")
    print("- output: data/processed/master_safety_dataset.csv")


if __name__ == "__main__":
    main()
