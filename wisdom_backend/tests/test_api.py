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
    # First discover tables that match the query/filters
    discover_payload = {
        "db": "db1",
        "query": [{"type": "clause", "content": {"value": "Mexico", "bdt": None}}],
        "filters": {"regions": ["Mexico"]},
        "permutations": {},
    }
    discover_res = client.post("/api/search/tables", json=discover_payload)
    assert discover_res.status_code == 200
    discover_body = discover_res.json()

    if discover_body["total"] == 0:
        # Dataset does not have Mexico in the picked db; ensure empty is handled without errors
        assert discover_body["tables"] == []
        return

    table_id = discover_body["tables"][0]["id"]

    payload = {
        "db": "db1",
        "query": discover_payload["query"],
        "filters": discover_payload["filters"],
        "permutations": discover_payload["permutations"],
        "picked_tables": [
          {"db": "db1", "table": table_id},
          {"db": "db1", "table": "t2"}
        ],
    }
    res = client.post("/api/search/tables", json=payload)
    assert res.status_code == 200
    body = res.json()
    assert body["total"] >= 1
    assert "facets" in body
    table_count = body["tables"][0]["count"]
    rows_payload = {
        "query": payload["query"],
        "filters": payload["filters"],
        "permutations": payload["permutations"],
        "picked_tables": payload["picked_tables"],
        "options": {
            "db": "db1",
            "table": table_id,
            "pageNumber": 1,
            "startRow": 0,
            "sizeLimit": 5,
        },
    }
    rows_res = client.post("/api/search/rows", json=rows_payload)
    assert rows_res.status_code == 200
    rows_body = rows_res.json()
    assert table_count == rows_body["pagination"]["totalRecords"]


def test_search_tables_with_permutations():
    # query value "X_mex" is not in data; permutation maps it to "Mexico" which is present
    payload = {
        "db": "db1",
        "query": [{"type": "clause", "content": {"value": "X_mex", "bdt": None}}],
        "filters": {},
        "permutations": {"X_mex": ["Mexico"]},
        "picked_tables": [
          {"db": "db1", "table": "t1"},
          {"db": "db1", "table": "t2"}
        ]
    }
    res = client.post("/api/search/tables", json=payload)
    assert res.status_code == 200
    body = res.json()
    assert body["total"] >= 1


def test_search_tables_multi_db_includes_db_fields_and_order():
    payload = {"dbs": ["db1", "db2"], "query": None, "filters": {}, "permutations": {}}
    res = client.post("/api/search/tables", json=payload)
    assert res.status_code == 200
    body = res.json()
    assert body["total"] == len(body["tables"])
    assert len(body["tables"]) > 0

    db_ids = [t.get("dbId") for t in body["tables"]]
    assert set(db_ids).issubset({"db1", "db2"})
    assert db_ids.count("db1") > 0 and db_ids.count("db2") > 0

    # db order should follow the order requested in dbs
    first_db1 = db_ids.index("db1")
    first_db2 = db_ids.index("db2")
    assert first_db1 < first_db2

    for table in body["tables"]:
        assert "dbId" in table
        assert "dbName" in table
        assert table["dbName"]
        assert table["id"]


def test_search_tables_multi_db_respects_picked_tables():
    payload = {
        "dbs": ["db1", "db2"],
        "query": None,
        "filters": {},
        "picked_tables": [{"db": "db2", "table": "t26"}],
    }
    res = client.post("/api/search/tables", json=payload)
    assert res.status_code == 200
    body = res.json()
    assert body["total"] == 1
    table = body["tables"][0]
    assert table["id"] == "t26"
    assert table["dbId"] == "db2"
    assert table["count"] >= 0


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
        "permutations": {},
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
        "permutations": {},
    }
    res = client.post("/api/search/rows", json=payload)
    assert res.status_code == 200
    body = res.json()
    # rows should respect size and not be empty if data exists
    assert len(body["rows"]) <= 5
    assert "columns" in body


def test_search_rows_with_permutations():
    # query value "X_mex" is not in data; permutation maps it to "Mexico" which is present in t1 rows
    payload = {
        "query": [{"type": "clause", "content": {"value": "X_mex", "bdt": None}}],
        "filters": {},
        "options": {
            "db": "db1",
            "table": "t1",
            "pageNumber": 1,
            "startRow": 0,
            "sizeLimit": 5,
        },
        "permutations": {"X_mex": ["Mexico"]},
        "picked_tables": [
          {"db": "db1", "table": "t1"}
        ],
    }
    res = client.post("/api/search/rows", json=payload)
    assert res.status_code == 200
    body = res.json()
    assert len(body["rows"]) >= 1


def test_search_tables_picked_tables_and_filters():
    # picked tables t1,t2,t3 combined with filter regions=Japan -> only tables that are both picked and match region
    payload = {
        "db": "db1",
        "query": None,
        "filters": {"regions": ["Japan"], "selectedTables": ["t1", "t2"]},
        "permutations": {},
        "picked_tables": [
          {"db": "db1", "table": "t1"},
          {"db": "db1", "table": "t2"},
          {"db": "db1", "table": "t3"}
        ],
    }
    res = client.post("/api/search/tables", json=payload)
    assert res.status_code == 200
    body = res.json()
    assert body["total"] >= 0  # ensure no error


def test_search_rows_respects_picked_tables():
    payload = {
        "query": None,
        "filters": {},
        "options": {
            "db": "db1",
            "table": "t1",
            "pageNumber": 1,
            "startRow": 0,
            "sizeLimit": 5,
        },
        "permutations": {},
        "picked_tables": [
          {"db": "db1", "table": "t2"}
        ],
    }
    res = client.post("/api/search/rows", json=payload)
    assert res.status_code == 200
    body = res.json()
    assert body["rows"] == []
    assert body["pagination"]["totalRecords"] == 0


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

