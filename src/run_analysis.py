from pathlib import Path

import pandas as pd

from src.analytics.anomaly_detection import detect_anomalies
from src.analytics.financial_impact import calculate_financial_exposure, load_cost_benchmarks
from src.analytics.recommendation_engine import generate_recommendations
from src.analytics.risk_scoring import score_risk
from src.analytics.signal_detection import detect_signals


MASTER_PATH = Path("data/processed/master_safety_dataset.csv")


def main() -> None:
    if not MASTER_PATH.exists():
        raise FileNotFoundError(
            "Missing data/processed/master_safety_dataset.csv. "
            "Run `python -m src.run_ingestion_processing` first."
        )

    master = pd.read_csv(MASTER_PATH, dtype={"case_id": str}, low_memory=False)
    signals = detect_signals(master)
    risk = score_risk(master, signals)
    benchmarks = load_cost_benchmarks()
    exposure = calculate_financial_exposure(master, risk, benchmarks)
    recommendations = generate_recommendations(
        exposure,
        high_exposure_threshold=benchmarks.get("high_financial_exposure_threshold", 5000000),
    )
    detect_anomalies(recommendations)

    print("Analysis complete.")
    print("- outputs/signal_detection_results.csv")
    print("- outputs/risk_intelligence_table.csv")
    print("- outputs/financial_exposure_results.csv")
    print("- outputs/recommendation_output.csv")
    print("- outputs/anomaly_detection_results.csv")


if __name__ == "__main__":
    main()
