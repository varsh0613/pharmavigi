param([string[]]$Args)

Write-Output "Running ingestion (openFDA) with args: $Args"
python -m src.ingestion.openfda_events @Args
