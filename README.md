# Wisdom Workspace (Frontend + Backend)

This repository contains two independent projects that communicate only via the published HTTP API contract.

## Layout
- `wisdom_frontend/` — React (Vite) UI that consumes the Wisdom API.
- `wisdom_backend/` — FastAPI server that implements the Wisdom API over the shared dataset.

No code is shared between the two; the API contract is the sole integration surface.

## How to run (high level)
- Backend: see `wisdom_backend/README.md` for environment, install, and `uvicorn` run instructions.
- Frontend: see `wisdom_frontend/README.md` for the Vite setup (`npm install && npm run dev`).

## API contract
Full request/response shapes, filters, pagination rules, and sample payloads live in `wisdom_backend/docs/api-contract.md`.

