from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

from src.ingestion.openfda_events import run_openfda_extract


def main() -> None:
    run_openfda_extract(scope_path=Path("config/analysis_scope.yaml"), fetch_validation=False)


if __name__ == "__main__":
    main()
