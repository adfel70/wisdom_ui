from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_version():
    res = client.get("/api/version")
    assert res.status_code == 200
    assert res.json() == {"version": "v1"}


def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_bdts():
    res = client.get("/api/bdts")
    assert res.status_code == 200
    body = res.json()
    assert "bdts" in body
    assert isinstance(body["bdts"], list)
    assert len(body["bdts"]) > 0


def test_catalog_shape():
    res = client.get("/api/catalog")
    assert res.status_code == 200
    body = res.json()
    assert "tables" in body and isinstance(body["tables"], list)
    assert "databases" in body and isinstance(body["databases"], list)
    assert len(body["tables"]) > 0
    table = body["tables"][0]
    for key in ["id", "name", "columns"]:
        assert key in table


def test_search_tables_no_query():
    payload = {"db": "db1", "query": None, "filters": {}}
    res = client.post("/api/search/tables", json=payload)
    assert res.status_code == 200
    body = res.json()
    assert "tables" in body
    assert "facets" in body
    assert body["total"] == len(body["tables"])
    assert len(body["tables"]) > 0


def test_search_tables_with_query_and_filter():
    payload = {
        "db": "db1",
        "query": [{"type": "clause", "content": {"value": "Mexico", "bdt": None}}],
        "filters": {"regions": ["Mexico"]},
    }
    res = client.post("/api/search/tables", json=payload)
    assert res.status_code == 200
    body = res.json()
    assert body["total"] >= 1
    assert "facets" in body


def test_search_rows_basic_paging():
    payload = {
        "query": None,
        "filters": {},
        "options": {
            "db": "db1",
            "table": "t1",
            "pageNumber": 1,
            "startRow": 0,
            "sizeLimit": 10,
        },
    }
    res = client.post("/api/search/rows", json=payload)
    assert res.status_code == 200
    body = res.json()
    assert "columns" in body and "rows" in body and "pagination" in body
    assert len(body["rows"]) <= 10
    assert body["pagination"]["pageNumber"] == 1
    assert body["pagination"]["pageSize"] == 10
    assert body["pagination"]["totalRecords"] >= len(body["rows"])


def test_search_rows_with_query_filters_down():
    payload = {
        "query": [{"type": "clause", "content": {"value": "Japan", "bdt": None}}],
        "filters": {"regions": ["Japan"]},
        "options": {
            "db": "db1",
            "table": "t1",
            "pageNumber": 1,
            "startRow": 0,
            "sizeLimit": 5,
        },
    }
    res = client.post("/api/search/rows", json=payload)
    assert res.status_code == 200
    body = res.json()
    # rows should respect size and not be empty if data exists
    assert len(body["rows"]) <= 5
    assert "columns" in body


def test_permutations():
    payload = {
        "permutationId": "reverse",
        "terms": ["abc"],
        "params": {},
    }
    res = client.post("/api/permutations", json=payload)
    assert res.status_code == 200
    body = res.json()
    assert body["permutations"]["abc"] == ["abc", "cba"]

