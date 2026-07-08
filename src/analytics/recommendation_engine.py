from pathlib import Path

import pandas as pd


OUTPUT_PATH = Path("outputs/recommendation_output.csv")


def _recommend(row: pd.Series, high_exposure_threshold: float) -> tuple[str, str]:
    if row["risk_score"] > 80 and row["financial_exposure"] >= high_exposure_threshold:
        return "Tier 1", "Immediate Investigation; Escalate to Safety Committee"
    if row["risk_score"] >= 50:
        return "Tier 2", "Enhanced Monitoring"
    return "Tier 3", "Routine Surveillance"


def generate_recommendations(
    exposure: pd.DataFrame,
    high_exposure_threshold: float,
    output_path: Path = OUTPUT_PATH,
) -> pd.DataFrame:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    recommendations = exposure.copy()
    tiers = recommendations.apply(lambda row: _recommend(row, high_exposure_threshold), axis=1)
    recommendations["tier"] = [tier for tier, _ in tiers]
    recommendations["recommended_action"] = [action for _, action in tiers]
    recommendations["rank"] = recommendations.sort_values(
        ["tier", "risk_score", "financial_exposure"],
        ascending=[True, False, False],
    ).reset_index().index + 1
    final = recommendations[
        ["rank", "drug", "reaction", "risk_score", "financial_exposure", "tier", "recommended_action", "report_count", "severity_score", "signal_strength_score", "volume_score"]
    ].sort_values(["tier", "risk_score", "financial_exposure"], ascending=[True, False, False])
    final.to_csv(output_path, index=False)
    return final
