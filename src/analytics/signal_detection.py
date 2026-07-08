from pathlib import Path

import numpy as np
import pandas as pd


OUTPUT_PATH = Path("outputs/signal_detection_results.csv")


def detect_signals(master: pd.DataFrame, output_path: Path = OUTPUT_PATH) -> pd.DataFrame:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    total = len(master)
    pair_counts = master.groupby(["drug_name", "reaction_name"]).size().reset_index(name="a")
    drug_counts = master.groupby("drug_name").size().rename("drug_total")
    reaction_counts = master.groupby("reaction_name").size().rename("reaction_total")
    results = pair_counts.join(drug_counts, on="drug_name").join(reaction_counts, on="reaction_name")

    results["b"] = results["drug_total"] - results["a"]
    results["c"] = results["reaction_total"] - results["a"]
    results["d"] = total - results["a"] - results["b"] - results["c"]

    epsilon = 0.5
    a = results["a"] + epsilon
    b = results["b"] + epsilon
    c = results["c"] + epsilon
    d = results["d"] + epsilon

    results["prr"] = (a / (a + b)) / (c / (c + d))
    results["ror"] = (a / b) / (c / d)
    numerator = total * ((results["a"] * results["d"] - results["b"] * results["c"]) ** 2)
    denominator = (results["a"] + results["b"]) * (results["c"] + results["d"]) * (results["a"] + results["c"]) * (results["b"] + results["d"])
    results["chi_square"] = np.where(denominator > 0, numerator / denominator, 0)
    results["signal_flag"] = (results["prr"] >= 2) & (results["chi_square"] >= 4)

    final = results.rename(columns={"drug_name": "drug", "reaction_name": "reaction", "a": "report_count"})[
        ["drug", "reaction", "report_count", "prr", "ror", "chi_square", "signal_flag"]
    ].sort_values(["signal_flag", "chi_square"], ascending=[False, False])
    final.to_csv(output_path, index=False)
    return final
