from typing import Any, Dict, List, Optional, Set

from fastapi import HTTPException

from app.models.schemas import Filters
from app.services.data_loader import (
    get_database_assignments,
    get_database_config,
    get_table_metadata,
    load_records,
)
from app.services.pagination import paginate_rows


def _normalize_filters(filters: Optional[Filters]) -> Filters:
    return filters or Filters()


def _table_meta_from_key(table_key: str, table_meta: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    meta = table_meta.get(table_key)
    if not meta:
        return None
    return {
        "id": table_key,
        "name": meta.get("name"),
        "year": meta.get("year"),
        "country": meta.get("country"),
        "categories": meta.get("categories", []),
        "count": meta.get("recordCount"),
        "columns": [c.get("name") for c in meta.get("columns", [])],
    }


def _evaluate_clause(element: Dict[str, Any], record: Dict[str, Any], table_meta: Dict[str, Any]) -> bool:
    content = element.get("content", {})
    value = content.get("value")
    if value is None:
        return False
    bdt = content.get("bdt")
    term = str(value).lower()

    if not bdt:
        return any(str(v).lower().find(term) != -1 for v in record.values() if v is not None)

    table_key = record.get("tableKey")
    meta = table_meta.get(table_key) if table_key else None
    if not meta:
        return False
    matching_cols = [col["name"] for col in meta.get("columns", []) if col.get("type") == bdt]
    if not matching_cols:
        return False
    return any(str(record.get(col, "")).lower().find(term) != -1 for col in matching_cols)


def _evaluate_query_elements(elements: List[Dict[str, Any]], record: Dict[str, Any], table_meta: Dict[str, Any]) -> bool:
    if not elements:
        return True
    result = None
    pending_op = None
    for element in elements:
        etype = element.get("type")
        if etype == "operator":
            pending_op = element.get("content", {}).get("operator")
            continue
        if etype == "subQuery":
            res = _evaluate_query_elements(element.get("content", {}).get("elements", []), record, table_meta)
        else:
            res = _evaluate_clause(element, record, table_meta)
        if result is None:
            result = res
        elif pending_op:
            if pending_op == "AND":
                result = result and res
            elif pending_op == "OR":
                result = result or res
            pending_op = None
    return bool(result) if result is not None else True


def _apply_query_to_records(records: List[Dict[str, Any]], query: Optional[Any], table_meta: Dict[str, Any]) -> List[Dict[str, Any]]:
    if not query:
        return records
    if isinstance(query, str):
        term = query.lower()
        return [r for r in records if any(term in str(v).lower() for v in r.values() if v is not None)]
    if isinstance(query, list):
        return [r for r in records if _evaluate_query_elements(query, r, table_meta)]
    return records


def _filter_tables_by_filters(tables: List[Dict[str, Any]], filters: Filters) -> List[Dict[str, Any]]:
    f = filters
    out = []
    for t in tables:
        if f.selectedTables and t["id"] not in f.selectedTables:
            continue
        if f.tableName and f.tableName.lower() not in t.get("name", "").lower():
            continue
        if f.year not in (None, "all"):
            try:
                if int(t.get("year")) != int(f.year):
                    continue
            except Exception:
                continue
        if f.category not in (None, "all") and f.category not in t.get("categories", []):
            continue
        if f.country not in (None, "all") and t.get("country") != f.country:
            continue
        if f.categories and not any(cat in t.get("categories", []) for cat in f.categories):
            continue
        if f.regions and (not t.get("country") or t["country"] not in f.regions):
            continue
        if f.tableNames and t.get("name") not in f.tableNames:
            continue
        if f.tableYears and str(t.get("year")) not in [str(y) for y in f.tableYears]:
            continue
        out.append(t)
    return out


def _build_facets(tables: List[Dict[str, Any]], table_counts: Dict[str, int]) -> Dict[str, Dict[str, int]]:
    categories: Dict[str, int] = {}
    regions: Dict[str, int] = {}
    table_names: Dict[str, int] = {}
    table_years: Dict[str, int] = {}
    for t in tables:
        weight = table_counts.get(t["id"], 0)
        if weight == 0:
            # If we don't have row-level counts (e.g., query is empty), fall back to table presence as 1
            weight = 1
        for cat in t.get("categories", []):
            categories[cat] = categories.get(cat, 0) + weight
        country = t.get("country")
        if country:
            regions[country] = regions.get(country, 0) + weight
        name = t.get("name")
        if name:
            table_names[name] = table_names.get(name, 0) + weight
        year = t.get("year")
        if year is not None:
            key = str(year)
            table_years[key] = table_years.get(key, 0) + weight
    return {
        "categories": categories,
        "regions": regions,
        "tableNames": table_names,
        "tableYears": table_years,
    }


def search_tables(db_key: str, query: Optional[Any], filters: Optional[Filters]) -> Dict[str, Any]:
    filters = _normalize_filters(filters)
    assignments = get_database_assignments()
    table_meta = get_table_metadata()

    if db_key not in assignments:
        raise HTTPException(status_code=404, detail=f"Database {db_key} not found")

    all_table_keys: List[str] = assignments.get(db_key, [])
    records = load_records(db_key)
    filtered_records = _apply_query_to_records(records, query, table_meta)

    if query:
        table_ids: Set[str] = {r.get("tableKey") for r in filtered_records if r.get("tableKey")}
        table_counts: Dict[str, int] = {}
        for r in filtered_records:
            tk = r.get("tableKey")
            if tk:
                table_counts[tk] = table_counts.get(tk, 0) + 1
    else:
        table_ids = set(all_table_keys)
        # when no query, use full record counts from metadata
        table_counts = {tid: table_meta.get(tid, {}).get("recordCount", 0) for tid in table_ids}

    tables = [_table_meta_from_key(tid, table_meta) for tid in table_ids]
    tables = [t for t in tables if t]
    tables = _filter_tables_by_filters(tables, filters)
    facets = _build_facets(tables, table_counts)

    return {"tables": tables, "facets": facets, "total": len(tables)}


def search_rows(
    db_key: str,
    table_key: str,
    query: Optional[Any],
    filters: Optional[Filters],
    page_number: int,
    start_row: int,
    size_limit: int,
) -> Dict[str, Any]:
    filters = _normalize_filters(filters)
    assignments = get_database_assignments()
    table_meta_all = get_table_metadata()

    if table_key not in assignments.get(db_key, []):
        raise HTTPException(status_code=404, detail=f"Table {table_key} not in database {db_key}")

    # If filters explicitly exclude the table, return empty
    if filters.selectedTables and table_key not in filters.selectedTables:
        return {
            "columns": [],
            "rows": [],
            "pagination": {"hasMore": False, "nextOffset": None, "pageNumber": page_number, "pageSize": size_limit, "totalRecords": 0},
        }

    records = [r for r in load_records(db_key) if r.get("tableKey") == table_key]
    filtered_records = _apply_query_to_records(records, query, table_meta_all)

    meta = _table_meta_from_key(table_key, table_meta_all)
    if not meta:
        raise HTTPException(status_code=404, detail=f"Table {table_key} metadata not found")

    columns = meta.get("columns", [])
    rows_list: List[List[str]] = []
    for r in filtered_records:
        row = []
        for col in columns:
            val = r.get(col, "")
            row.append("" if val is None else str(val))
        rows_list.append(row)

    paged = paginate_rows(rows_list, start_row, size_limit, page_number)
    paged["columns"] = columns
    return paged


def get_catalog() -> Dict[str, Any]:
    table_meta = get_table_metadata()
    db_config = get_database_config()
    assignments = get_database_assignments()

    tables = [_table_meta_from_key(k, table_meta) for k in table_meta.keys()]
    tables = [t for t in tables if t]

    databases = []
    for db_key, cfg in db_config.items():
        databases.append(
            {
                "id": db_key,
                "name": cfg.get("name"),
                "description": cfg.get("description"),
                "tableKeys": assignments.get(db_key, []),
            }
        )

    return {"tables": tables, "databases": databases}


def get_bdts() -> List[str]:
    table_meta = get_table_metadata()
    types = set()
    for meta in table_meta.values():
        for col in meta.get("columns", []):
            ctype = col.get("type")
            if ctype:
                types.add(ctype)
    return sorted(types)

