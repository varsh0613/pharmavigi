This folder is intended to hold JSON and other result artifacts consumed by the dashboard.

Guidelines:
- Keep only derived JSON, NDJSON, or small CSV files here that are safe to check into the repo.
- Large raw datasets belong in `data/raw/` and should be stored externally (S3, Drive) or tracked with Git LFS.
- Add each output file's schema or a small example JSON file for dashboard development.
