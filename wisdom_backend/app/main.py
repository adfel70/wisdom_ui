import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import router
from app.core.config import settings
from app.models.schemas import ErrorResponse


def create_app() -> FastAPI:
    """
    Create the FastAPI application.

    This backend is intentionally a thin mock-compatible layer that mirrors the
    real system's contract. Core logic is split into services so that future
    integration with the real backend can swap implementations without changing
    the API surface.
    """
    app = FastAPI(title="Wisdom Backend (mock parity)")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.frontend_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(router)

    @app.exception_handler(HTTPException)
    async def http_exception_handler(_, exc: HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content=ErrorResponse(
                error=exc.detail if isinstance(exc.detail, str) else "error",
                details=None if isinstance(exc.detail, str) else exc.detail,
            ).model_dump(),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(_, exc: Exception):
        return JSONResponse(
            status_code=500,
            content=ErrorResponse(error="internal_error", details=str(exc)).model_dump(),
        )

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
    )


