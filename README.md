# Adverse Event Signal Analytics

Detecting drug safety risks in FDA adverse event data and estimating the cost of inaction.

This is an analytics project, not a production software system. The workflow pulls adverse event reports from the openFDA Drug Event API, prepares an analysis-ready dataset, computes signal metrics, ranks safety signals, and exports CSV files that can be used in Power BI.

## Research Question

Can statistical patterns in publicly available FDA adverse event reports identify disproportionately risky drug-reaction pairs, and what is the estimated cost when those signals are ignored?

## Thesis Scope

- Data source: FDA FAERS/AEMS via the openFDA Drug Event API
- Focus: serious reports for selected cardiovascular and Vioxx-validation drugs
- Methods: PRR, ROR, chi-square, severity score, risk index, and cost-of-harm estimate
- Validation case: rofecoxib/Vioxx cardiovascular risk before the 2004 withdrawal
- Output: CSV datasets for analysis and Power BI scorecards

## Project Structure

```text
config/
  analysis_scope.yaml
  cost_benchmarks.yaml
data/
  raw/
  processed/
outputs/
reports/
src/
  analytics/
  ingestion/
  processing/
```

## Setup

If `pip` is not recognized in PowerShell, use `python -m pip`:

```bash
python -m pip install -r requirements.txt
```

Optional virtual environment:

```bash
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

## Pull Data From openFDA

The recommended thesis workflow is openFDA, not manual quarterly downloads:

```bash
python -m src.run_ingestion_processing
```

If openFDA returns `HTTP 403 Forbidden`, create a free API key from `https://open.fda.gov/apis/authentication/` and set it in PowerShell before running:

```powershell
$env:OPENFDA_API_KEY='your_key_here'
python -m src.run_ingestion_processing
```

If openFDA returns `HTTP 504 Gateway Timeout`, the query is too broad for the API at that moment. The extractor is configured to reduce this by pulling 100 records at a time and splitting the date range into one-year windows. You can make it even smaller in `config/analysis_scope.yaml`:

```yaml
page_size: 50
query_window_years: 1
max_records_per_drug: 1000
```

This uses `config/analysis_scope.yaml` to pull:

- serious reports only
- selected recent cardiovascular and NSAID drug names
- cardiovascular reaction terms such as myocardial infarction, cardiac arrest, stroke, thrombosis, arrhythmia, and heart failure
- report dates from `20040101` through `20260625`
- all matching reports returned by openFDA for each configured drug and date window

The output is:

```text
data/raw/openfda_drug_event_reports.jsonl
data/processed/master_safety_dataset.csv
```

You can also run the openFDA step directly:

```bash
python -m src.ingestion.openfda_events
```

## Run Signal Analysis

After the master dataset is created, run:

```bash
python -m src.run_analysis
```

This generates the PRR/ROR signal table, risk index table, cost-of-harm table, tiered recommendation table, and anomaly labels for Power BI.

## Optional Quarterly ASCII Pull

The repo still supports FDA quarterly ASCII extracts if you want the full raw table workflow:

```bash
python -m src.run_ingestion_processing --source ascii --download --latest 1
```

For this thesis, openFDA is simpler and better aligned with the presentation.

## Recommended Data To Pull

Start with the configured openFDA scope:

- Time window: `20040101` to `20260625`
- Filter: `serious:1`
- Drug set: rofecoxib/Vioxx, celecoxib, diclofenac, ibuprofen, naproxen, aspirin, clopidogrel, warfarin, atorvastatin, simvastatin, amlodipine, lisinopril, metoprolol
- Reaction set: myocardial infarction, cardiac arrest, cerebrovascular accident, stroke, thrombosis, pulmonary embolism, deep vein thrombosis, hypertension, hypotension, arrhythmia, atrial fibrillation, heart failure, angina pectoris

Use this as the full validation dataset, including the Vioxx retrospective signal window.

By default, `max_records_per_drug: all` pulls every matching report in the configured scope. If you need a smaller emergency sample, set it to a number such as `300`.

## Analysis Outputs

The analytics modules write:

- `outputs/signal_detection_results.csv`
- `outputs/risk_intelligence_table.csv`
- `outputs/financial_exposure_results.csv`
- `outputs/recommendation_output.csv`
- `outputs/anomaly_detection_results.csv`

## Backend API (optional)

A lightweight FastAPI backend is included to trigger ingestion and analysis and to serve CSV outputs.

Install dependencies and run locally:

```bash
python -m pip install -r requirements.txt
python -m uvicorn src.backend.app:app --host 127.0.0.1 --port 8000
```

Endpoints:
- `POST /ingest` - trigger ingestion (`source=openfda` or `source=ascii`)
- `POST /analyze` - run the analysis pipeline
- `GET /outputs/{name}` - download CSV outputs

Container:

```bash
docker build -t faers-backend .
docker run -p 8000:8000 faers-backend
```

These CSVs are intended for Power BI visuals: signal table, tiered risk scorecard, risk index ranking, and cost-of-harm summary.
