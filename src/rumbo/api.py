"""Local API scaffold. No external API calls or travel data ingestion yet."""

from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse

PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(PROJECT_ROOT / ".env", override=False)

app = FastAPI(
    title="Rumbo API",
    description="API local del proyecto de viajes Rumbo.",
    version="0.1.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    redoc_url=None,
)


@app.get("/api/health", tags=["Sistema"])
async def health() -> dict[str, str]:
    """Verify connectivity without exposing configuration or credentials."""
    return {"status": "ok", "service": "rumbo-api"}


@app.get("/api/maqueta", include_in_schema=False)
async def mockup() -> FileResponse:
    """Serve the original standalone mockup, without duplicating its contents."""
    mockup_path = PROJECT_ROOT / "maquetas.html"
    if not mockup_path.is_file():
        raise HTTPException(status_code=404, detail="La maqueta no está disponible.")
    return FileResponse(mockup_path, media_type="text/html")
