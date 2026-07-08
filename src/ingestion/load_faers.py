from pathlib import Path
from zipfile import ZipFile

import pandas as pd


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


def main() -> None:
    tables = load_faers_tables()
    if not tables:
        print("No FAERS DEMO/DRUG/REAC/OUTC files found in data/raw.")
        print("Place FDA quarterly zip files or extracted TXT/CSV files in data/raw and run again.")
        return

    print("Loaded FAERS tables into data/processed/staging:")
    for table_name, table in sorted(tables.items()):
        print(f"- {table_name}: {len(table):,} rows")


if __name__ == "__main__":
    main()
