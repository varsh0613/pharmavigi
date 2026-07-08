from pathlib import Path

import numpy as np
import pandas as pd


OUTPUT_PATH = Path("outputs/risk_intelligence_table.csv")

SEVERITY_WEIGHTS = {
    "Death": 3,
    "Hospitalization": 2,
    "Disability": 1,
    "Life Threatening": 2,
    "Other": 0,
}


def _normalize(series: pd.Series) -> pd.Series:
    if series.max() == series.min():
        return pd.Series([50.0] * len(series), index=series.index)
    return ((series - series.min()) / (series.max() - series.min())) * 100


def score_risk(master: pd.DataFrame, signals: pd.DataFrame, output_path: Path = OUTPUT_PATH) -> pd.DataFrame:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    signal_rows = signals[signals["signal_flag"]].copy()
    if signal_rows.empty:
        signal_rows = signals.copy()

    severity = master.copy()
    severity["severity_weight"] = severity["outcome_type"].map(SEVERITY_WEIGHTS).fillna(1)
    severity_summary = (
        severity.groupby(["drug_name", "reaction_name"])["severity_weight"]
        .mean()
        .reset_index()
        .rename(columns={"drug_name": "drug", "reaction_name": "reaction", "severity_weight": "severity_raw"})
    )

    risk = signal_rows.merge(severity_summary, on=["drug", "reaction"], how="left")
    risk["severity_score"] = _normalize(risk["severity_raw"].fillna(1))
    risk["signal_strength_score"] = _normalize(np.log1p(risk["prr"]) + np.log1p(risk["ror"]))
    risk["volume_score"] = _normalize(risk["report_count"])
    risk["risk_score"] = (
        risk["severity_score"] * 0.40
        + risk["signal_strength_score"] * 0.35
        + risk["volume_score"] * 0.25
    ).round(2)

    final = risk[
        ["drug", "reaction", "report_count", "severity_score", "signal_strength_score", "volume_score", "risk_score", "prr", "ror", "chi_square"]
    ].sort_values("risk_score", ascending=False)
    final.to_csv(output_path, index=False)
    return final
