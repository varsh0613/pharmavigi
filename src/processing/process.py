from __future__ import annotations

from pathlib import Path
import argparse
from typing import Optional

import numpy as np
import pandas as pd


PROCESSED_DIR = Path("data/processed")
MASTER_PATH = PROCESSED_DIR / "master_safety_dataset.csv"
STAGING_DIR = PROCESSED_DIR / "staging"

OUTCOME_MAP = {
  "DE": "Death",
  "LT": "Life Threatening",
  "HO": "Hospitalization",
  "DS": "Disability",
  "CA": "Other",
  "RI": "Other",
  "OT": "Other",
}

DRUG_NORMALIZATION = {
  "acetaminophen": "Acetaminophen",
  "paracetamol": "Acetaminophen",
  "ibuprofen": "Ibuprofen",
  "advil": "Ibuprofen",
  "metformin": "Metformin",
  "glucophage": "Metformin",
  "atorvastatin": "Atorvastatin",
  "lipitor": "Atorvastatin",
  "amoxicillin": "Amoxicillin",
}


def _first_existing(frame: pd.DataFrame, candidates: list[str], default: str = "") -> pd.Series:
  for candidate in candidates:
    if candidate in frame.columns:
      return frame[candidate]
  return pd.Series([default] * len(frame), index=frame.index)


def normalize_drug_name(value: object) -> str:
  text = str(value or "").strip().lower()
  if not text or text == "nan":
    return "Unknown"
  return DRUG_NORMALIZATION.get(text, text.title())


def _create_demo_dataset() -> pd.DataFrame:
  rng = np.random.default_rng(42)
  profiles = [
    ("Atorvastatin", "Rhabdomyolysis", "Hospitalization", 190),
    ("Atorvastatin", "Liver Injury", "Life Threatening", 95),
    ("Metformin", "Lactic Acidosis", "Death", 120),
    ("Ibuprofen", "Gastrointestinal Hemorrhage", "Hospitalization", 145),
    ("Acetaminophen", "Liver Failure", "Death", 110),
    ("Amoxicillin", "Anaphylaxis", "Life Threatening", 85),
    ("Metformin", "Nausea", "Other", 165),
    ("Ibuprofen", "Rash", "Other", 140),
    ("Amoxicillin", "Diarrhea", "Other", 120),
    ("Acetaminophen", "Headache", "Other", 90),
  ]
  rows = []
  case_id = 100000
  for drug, reaction, outcome, count in profiles:
    for _ in range(count):
      case_id += 1
      rows.append(
        {
          "case_id": case_id,
          "drug_name": drug,
          "reaction_name": reaction,
          "outcome_type": outcome,
          "report_date": pd.Timestamp("2025-01-01") + pd.to_timedelta(int(rng.integers(0, 420)), unit="D"),
          "patient_age": int(rng.normal(58, 16).clip(18, 92)),
          "patient_gender": rng.choice(["F", "M", "UNK"], p=[0.52, 0.44, 0.04]),
        }
      )
  return pd.DataFrame(rows)


def build_master_dataset(tables: dict[str, pd.DataFrame], output_path: Path = MASTER_PATH) -> pd.DataFrame:
  output_path.parent.mkdir(parents=True, exist_ok=True)
  required = {"demo", "drug", "reac", "outc"}
  if not required.issubset(tables):
    master = _create_demo_dataset()
    master.to_csv(output_path, index=False)
    return master

  demo = tables["demo"].copy()
  drug = tables["drug"].copy()
  reac = tables["reac"].copy()
  outc = tables["outc"].copy()

  keys = ["primaryid", "caseid"]
  for table in [demo, drug, reac, outc]:
    for key in keys:
      if key not in table.columns:
        table[key] = ""

  merged = drug.merge(reac, on=keys, how="inner", suffixes=("_drug", "_reaction"))
  merged = merged.merge(demo, on=keys, how="left")
  merged = merged.merge(outc, on=keys, how="left")

  master = pd.DataFrame(
    {
      "case_id": _first_existing(merged, ["caseid", "primaryid"]),
      "drug_name": _first_existing(merged, ["drugname", "prod_ai", "val_vbm"]).map(normalize_drug_name),
      "reaction_name": _first_existing(merged, ["pt", "reaction"]).fillna("Unknown").astype(str).str.title(),
      "outcome_type": _first_existing(merged, ["outc_cod", "outcome"]).map(lambda value: OUTCOME_MAP.get(str(value).upper(), "Other")),
      "report_date": pd.to_datetime(_first_existing(merged, ["fda_dt", "event_dt", "mfr_dt"]), errors="coerce"),
      "patient_age": pd.to_numeric(_first_existing(merged, ["age", "patient_age"]), errors="coerce"),
      "patient_gender": _first_existing(merged, ["sex", "patient_gender"], "UNK").fillna("UNK"),
    }
  )
  master = master.dropna(subset=["case_id", "drug_name", "reaction_name"]).drop_duplicates()
  master.to_csv(output_path, index=False)
  return master


def load_staged_tables(staging_dir: Path = STAGING_DIR) -> dict[str, pd.DataFrame]:
  tables: dict[str, pd.DataFrame] = {}
  for table_name in ["demo", "drug", "reac", "outc"]:
    path = staging_dir / f"{table_name}.csv"
    if path.exists():
      tables[table_name] = pd.read_csv(path, dtype=str, low_memory=False)
  return tables


def main(argv: Optional[list] = None) -> None:
  parser = argparse.ArgumentParser(description="Build master dataset from staged FAERS tables")
  parser.add_argument("--staged-dir", help="Optional staged directory (unused)")
  args = parser.parse_args(argv)

  tables = load_staged_tables()
  master = build_master_dataset(tables)
  if not {"demo", "drug", "reac", "outc"}.issubset(tables):
    print("Staged FAERS tables were incomplete, so a demo master dataset was generated.")
    print("Run ingestion after placing DEMO/DRUG/REAC/OUTC files in data/raw to process real FAERS data.")
  print(f"Created {MASTER_PATH} with {len(master):,} rows.")


if __name__ == "__main__":
  main()
