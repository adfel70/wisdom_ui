# Wisdom Backend (FastAPI)

Mock-parity backend that matches the frontend contract. Data is local JSON copied from the mock dataset; services are structured so they can be swapped with a real backend later.

## Structure
- `app/core` — config/env
- `app/api` — FastAPI routes
- `app/services` — data loading, search/facets/pagination, permutations
- `app/models` — request/response schemas
- `data/` — metadata + records (copied from mock)
- `docs/api-contract.md` — full contract, payloads, samples

## Quick start
```bash
cd wisdom_backend
python -m venv .venv
.venv\Scripts\activate  # or source .venv/bin/activate
pip install -r requirements.txt
set HOST=0.0.0.0
set PORT=8000
set FRONTEND_ORIGINS=http://localhost:5173,http://localhost:4173
uvicorn app.main:app --host %HOST% --port %PORT% --reload
```

## Routes (high level)
- `GET /api/version` — version marker (`v1`)
- `GET /api/health` — health probe
- `GET /api/catalog` — all tables metadata + database descriptors
- `POST /api/search/tables` — table list + facets for a db (query + filters)
- `POST /api/search/rows` — columns + rows (array-of-arrays) + pagination for a table
- `POST /api/permutations` — expand terms by permutation id

Error model: `{ "error": string, "details"?: object }`

Full request/response details and examples: see `docs/api-contract.md`.

