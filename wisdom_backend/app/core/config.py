import os
from pathlib import Path


class Settings:
    def __init__(self) -> None:
        # project root: wisdom_backend/
        self.root_dir = Path(__file__).resolve().parents[2]
        self.data_dir = self.root_dir / "data"
        self.metadata_path = self.data_dir / "metadata.json"
        self.records_dir = self.data_dir / "records"

        self.host = os.environ.get("HOST", "0.0.0.0")
        self.port = int(os.environ.get("PORT", "8000"))

        # Support multiple allowed origins. Prefer FRONTEND_ORIGINS (comma-separated),
        # then fallback to single FRONTEND_ORIGIN, else default to local dev/preview.
        origins_env = os.environ.get("FRONTEND_ORIGINS")
        single_origin = os.environ.get("FRONTEND_ORIGIN")
        if origins_env:
            self.frontend_origins = [o.strip() for o in origins_env.split(",") if o.strip()]
        elif single_origin:
            self.frontend_origins = [single_origin.strip()]
        else:
            self.frontend_origins = [
                "http://localhost:5173",  # vite dev default
                "http://localhost:4173",  # vite preview default
            ]


settings = Settings()

