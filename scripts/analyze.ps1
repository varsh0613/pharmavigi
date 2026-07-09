param([string[]]$Args)

Write-Output "Running analysis with args: $Args"
python -m src.run_analysis @Args
