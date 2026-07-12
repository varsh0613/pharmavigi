"""FastAPI backend — serves analysis profiles to the React dashboard."""

from __future__ import annotations

import json
import re
import threading
from pathlib import Path

from fastapi import BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi import FastAPI

app = FastAPI(title="PharmaVigi Analytics API")

ROOT = Path(__file__).resolve().parents[2]
RESULTS_DIR = ROOT / "public" / "results"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _slug(name: str) -> str:
    return re.sub(r"\s+", "-", name.strip().lower())


def _profile_path(drug_id: str) -> Path | None:
    """Resolve a dashboard drug id to a cached profile JSON file."""
    drug_id = drug_id.strip().lower()
    for path in RESULTS_DIR.glob("*_profile.json"):
        stem = path.stem.replace("_profile", "")
        if _slug(stem) == drug_id or stem.lower() == drug_id.replace("-", " "):
            return path
    return None


def _load_profile(path: Path) -> dict:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _list_profile_paths() -> list[Path]:
    return sorted(RESULTS_DIR.glob("*_profile.json"))


@app.get("/health")
def health():
    profiles = _list_profile_paths()
    return {
        "status": "ok",
        "profiles_loaded": len(profiles),
        "results_dir": str(RESULTS_DIR),
    }


@app.get("/drugs")
def list_drugs():
    """Return all cached drug analysis profiles."""
    profiles = []
    for path in _list_profile_paths():
        try:
            profiles.append(_load_profile(path))
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Failed to read {path.name}: {exc}") from exc
    profiles.sort(key=lambda p: p.get("risk_scoring", {}).get("risk_index") or 0, reverse=True)
    return profiles


@app.get("/drugs/{drug_id}")
def get_drug(drug_id: str):
    path = _profile_path(drug_id)
    if not path:
        raise HTTPException(status_code=404, detail=f"No profile found for '{drug_id}'")
    return _load_profile(path)


@app.post("/drugs/{drug_name}")
def analyze_drug(drug_name: str, background: bool = False, bg: BackgroundTasks = None):
    """Run live analysis for a drug and cache the profile JSON."""

    def _run():
        from src.analytics.analysis import analyze_new_drug

        analyze_new_drug(drug_name.upper())

    if background:
        threading.Thread(target=_run, daemon=True).start()
        return JSONResponse({"status": "started", "drug": drug_name.upper()})

    _run()
    path = _profile_path(drug_name)
    if not path:
        raise HTTPException(status_code=500, detail="Analysis completed but profile file not found")
    return _load_profile(path)


@app.post("/analyze")
def analyze_all(background: bool = True):
    """Rebuild profiles for all pre-loaded NSAIDs."""

    def _run():
        from src.analytics.analysis import analyze_all_drugs

        analyze_all_drugs(generate_summaries=False)

    if background:
        threading.Thread(target=_run, daemon=True).start()
        return JSONResponse({"status": "started"})

    _run()
    return JSONResponse({"status": "complete", "profiles": len(_list_profile_paths())})


@app.get("/compare/{drug_a}/{drug_b}")
def compare_drugs(drug_a: str, drug_b: str):
    path_a = _profile_path(drug_a)
    path_b = _profile_path(drug_b)
    if not path_a:
        raise HTTPException(status_code=404, detail=f"No profile for '{drug_a}'")
    if not path_b:
        raise HTTPException(status_code=404, detail=f"No profile for '{drug_b}'")

    profile_a = _load_profile(path_a)
    profile_b = _load_profile(path_b)

    from src.analytics.analysis import generate_comparative_summary

    summary = generate_comparative_summary(profile_a, profile_b)
    return {
        "drug_a": profile_a.get("drug_name"),
        "drug_b": profile_b.get("drug_name"),
        "comparative_summary": summary,
    }


@app.post("/ingest")
def ingest(source: str = "openfda", download: bool = False, latest: int = 1, overwrite: bool = False, background: bool = True):
    """Trigger data ingestion (openFDA or FAERS ASCII)."""

    def _run_openfda():
        from src.ingestion.ingest import run_openfda_extract

        run_openfda_extract()

    def _run_ascii():
        from src.ingestion.ingest import download_faers_archives, load_faers_tables
        from src.processing.process import build_master_dataset

        if download:
            download_faers_archives(latest=latest, overwrite=overwrite)
        tables = load_faers_tables()
        build_master_dataset(tables)

    if source not in ("openfda", "ascii"):
        raise HTTPException(status_code=400, detail="Invalid source — use 'openfda' or 'ascii'")

    target = _run_openfda if source == "openfda" else _run_ascii
    if background:
        threading.Thread(target=target, daemon=True).start()
        return JSONResponse({"status": "started", "source": source})

    target()
    return JSONResponse({"status": "complete", "source": source})
