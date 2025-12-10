import json
from functools import lru_cache
from typing import Any, Dict, List

from fastapi import HTTPException

from app.core.config import settings


@lru_cache(maxsize=1)
def _load_metadata_raw() -> Dict[str, Any]:
    with settings.metadata_path.open("r", encoding="utf-8") as f:
        return json.load(f)


def get_table_metadata() -> Dict[str, Any]:
    return _load_metadata_raw().get("metadata", {})


def get_database_config() -> Dict[str, Any]:
    return _load_metadata_raw().get("databaseConfig", {})


def get_database_assignments() -> Dict[str, Any]:
    return _load_metadata_raw().get("databaseAssignments", {})


def load_records(db_key: str) -> List[Dict[str, Any]]:
    path = settings.records_dir / f"{db_key}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Database {db_key} not found")
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    return data.get("records", [])

