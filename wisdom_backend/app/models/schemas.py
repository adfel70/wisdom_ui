from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class Filters(BaseModel):
    tableName: Optional[str] = None
    year: Optional[Any] = None
    category: Optional[str] = None
    country: Optional[str] = None
    selectedTables: Optional[List[str]] = None
    categories: Optional[List[str]] = None
    regions: Optional[List[str]] = None
    tableNames: Optional[List[str]] = None
    tableYears: Optional[List[Any]] = None
    columnTags: Optional[List[str]] = None


class SearchTablesRequest(BaseModel):
    db: Optional[str] = None
    dbs: Optional[List[str]] = Field(default_factory=list)
    query: Optional[Any] = None
    filters: Filters = Field(default_factory=Filters)
    permutations: Optional[Dict[str, List[str]]] = Field(default_factory=dict)
    picked_tables: Optional[List[Dict[str, str]]] = Field(default_factory=list)


class SearchRowsOptions(BaseModel):
    db: str
    table: str
    pageNumber: Optional[int] = None
    startRow: Optional[int] = None
    sizeLimit: Optional[int] = None


class SearchRowsRequest(BaseModel):
    query: Optional[Any] = None
    filters: Filters = Field(default_factory=Filters)
    options: SearchRowsOptions
    permutations: Optional[Dict[str, List[str]]] = Field(default_factory=dict)
    picked_tables: Optional[List[Dict[str, str]]] = Field(default_factory=list)


class PermutationsRequest(BaseModel):
    permutationId: str
    terms: List[str]
    params: Optional[Dict[str, Any]] = None


class ErrorResponse(BaseModel):
    error: str
    details: Optional[Any] = None

