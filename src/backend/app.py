from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from pathlib import Path
import threading

app = FastAPI(title="FAERS Analytics API")

ROOT = Path(__file__).resolve().parents[2]


@app.get("/health")
def health():
    return {"status": "ok"}


def _run_ingest_openfda():
    from src.ingestion.openfda_events import run_openfda_extract

    run_openfda_extract()


def _run_ingest_ascii(download: bool, quarter: str, latest: int, overwrite: bool):
    from src.ingestion.download_faers import download_faers_archives
    from src.ingestion.load_faers import load_faers_tables
    from src.processing.build_master_dataset import build_master_dataset

    if download:
        download_faers_archives(quarter=quarter, latest=latest, overwrite=overwrite)
    tables = load_faers_tables()
    build_master_dataset(tables)


@app.post("/ingest")
def ingest(source: str = "openfda", download: bool = False, quarter: str = None, latest: int = 1, overwrite: bool = False, background: bool = True, bg: BackgroundTasks = None):
    """Trigger ingestion and processing.

    - `source`: 'openfda' or 'ascii'
    - if `background` true, runs in background and returns immediately
    """
    if source not in ("openfda", "ascii"):
        raise HTTPException(status_code=400, detail="Invalid source")

    if background:
        if source == "openfda":
            threading.Thread(target=_run_ingest_openfda, daemon=True).start()
        else:
            threading.Thread(target=_run_ingest_ascii, args=(download, quarter, latest, overwrite), daemon=True).start()
        return JSONResponse({"status": "started"})

    # synchronous
    if source == "openfda":
        _run_ingest_openfda()
    else:
        _run_ingest_ascii(download, quarter, latest, overwrite)

    return JSONResponse({"status": "complete"})


@app.post("/analyze")
def analyze(background: bool = True):
    """Run the analysis pipeline that produces CSV outputs."""
    from src.run_analysis import main as run_analysis_main

    if background:
        threading.Thread(target=run_analysis_main, daemon=True).start()
        return JSONResponse({"status": "started"})

    run_analysis_main()
    return JSONResponse({"status": "complete"})


@app.get("/outputs/{name}")
def get_output(name: str):
    allowed = {
        "signal_detection_results.csv",
        "risk_intelligence_table.csv",
        "financial_exposure_results.csv",
        "recommendation_output.csv",
        "anomaly_detection_results.csv",
        "master_safety_dataset.csv",
    }
    if name not in allowed:
        raise HTTPException(status_code=404, detail="Unknown output")
    path = ROOT / "outputs" / name
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path)
