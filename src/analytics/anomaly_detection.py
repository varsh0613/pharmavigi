from pathlib import Path

import pandas as pd
from sklearn.ensemble import IsolationForest


OUTPUT_PATH = Path("outputs/anomaly_detection_results.csv")


def detect_anomalies(recommendations: pd.DataFrame, output_path: Path = OUTPUT_PATH) -> pd.DataFrame:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    results = recommendations.copy()
    features = results[["risk_score", "report_count", "severity_score"]].fillna(0)
    if len(features) < 4:
        results["anomaly_score"] = 0.0
    else:
        model = IsolationForest(contamination=0.2, random_state=42)
        model.fit(features)
        results["anomaly_score"] = -model.decision_function(features)

    critical_cutoff = results["anomaly_score"].quantile(0.85)
    emerging_cutoff = results["anomaly_score"].quantile(0.60)
    results["anomaly_label"] = "Normal"
    results.loc[results["anomaly_score"] >= emerging_cutoff, "anomaly_label"] = "Emerging"
    results.loc[(results["anomaly_score"] >= critical_cutoff) | (results["tier"] == "Tier 1"), "anomaly_label"] = "Critical"
    results.to_csv(output_path, index=False)
    return results
