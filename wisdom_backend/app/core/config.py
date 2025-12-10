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
        self.frontend_origin = os.environ.get("FRONTEND_ORIGIN", "*")


settings = Settings()

