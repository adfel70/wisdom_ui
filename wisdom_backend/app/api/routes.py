from fastapi import APIRouter, HTTPException

from app.models.schemas import PermutationsRequest, SearchRowsRequest, SearchTablesRequest
from app.services.permutations import expand_terms
from app.services.search_service import get_bdts, get_catalog, search_rows, search_tables

router = APIRouter(prefix="/api")


@router.get("/version")
def get_version():
    return {"version": "v1"}


@router.get("/health")
def health():
    return {"status": "ok"}


@router.get("/catalog")
def catalog():
    return get_catalog()


@router.get("/bdts")
def bdts():
    return {"bdts": get_bdts()}


@router.post("/search/tables")
def search_tables_route(payload: SearchTablesRequest):
    db_keys = payload.dbs or ([payload.db] if payload.db else [])
    return search_tables(db_keys, payload.query, payload.filters, payload.permutations, payload.picked_tables)


@router.post("/search/rows")
def search_rows_route(payload: SearchRowsRequest):
    opts = payload.options
    page_number = opts.pageNumber if opts.pageNumber is not None else 1
    size_limit = opts.sizeLimit if opts.sizeLimit is not None else 20
    start_row = opts.startRow if opts.startRow is not None else (page_number - 1) * size_limit
    return search_rows(
        opts.db,
        opts.table,
        payload.query,
        payload.filters,
        payload.permutations,
        payload.picked_tables,
        page_number,
        start_row,
        size_limit,
    )


@router.post("/permutations")
def permutations_route(payload: PermutationsRequest):
    if not payload.terms:
        raise HTTPException(status_code=400, detail="terms must be non-empty")
    permutations = expand_terms(payload.terms, payload.permutationId, payload.params)
    return {"permutations": permutations}

