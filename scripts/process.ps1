param([string[]]$Args)

Write-Output "Running processing (ASCII ingestion + build master) with args: $Args"
python -m src.run_ingestion_processing --source ascii @Args
