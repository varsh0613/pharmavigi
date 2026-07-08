from pathlib import Path

import pandas as pd
import yaml


CONFIG_PATH = Path("config/cost_benchmarks.yaml")
OUTPUT_PATH = Path("outputs/financial_exposure_results.csv")


def load_cost_benchmarks(path: Path = CONFIG_PATH) -> dict[str, float]:
    with path.open("r", encoding="utf-8") as handle:
        return yaml.safe_load(handle)


def calculate_financial_exposure(
    master: pd.DataFrame,
    risk: pd.DataFrame,
    benchmarks: dict[str, float],
    output_path: Path = OUTPUT_PATH,
) -> pd.DataFrame:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    pivot = (
        master.pivot_table(
            index=["drug_name", "reaction_name"],
            columns="outcome_type",
            values="case_id",
            aggfunc="count",
            fill_value=0,
        )
        .reset_index()
        .rename(columns={"drug_name": "drug", "reaction_name": "reaction"})
    )
    for column in ["Hospitalization", "Death", "Disability", "Life Threatening"]:
        if column not in pivot.columns:
            pivot[column] = 0

    pivot["financial_exposure"] = (
        pivot["Hospitalization"] * benchmarks.get("hospitalization_cost", 0)
        + pivot["Death"] * benchmarks.get("death_cost", 0)
        + pivot["Disability"] * benchmarks.get("disability_cost", 0)
        + pivot["Life Threatening"] * benchmarks.get("life_threatening_cost", 0)
    )

    final = risk.merge(
        pivot[["drug", "reaction", "Hospitalization", "Death", "Disability", "Life Threatening", "financial_exposure"]],
        on=["drug", "reaction"],
        how="left",
    )
    final["financial_exposure"] = final["financial_exposure"].fillna(0)
    final.to_csv(output_path, index=False)
    return final
