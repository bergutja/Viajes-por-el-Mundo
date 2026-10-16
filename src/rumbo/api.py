"""Local FastAPI server for the mockup's travel RAG."""

import asyncio
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse

from rumbo.esquemas import ListadoDocumentos, ListadoRutas, Pregunta, Respuesta
from rumbo.rag import BuscadorRAG, ErrorRAG

PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(PROJECT_ROOT / ".env", override=False)

def crear_app(buscador: BuscadorRAG | None = None) -> FastAPI:
    @asynccontextmanager
    async def lifespan(application: FastAPI):
        rag = buscador or BuscadorRAG()
        application.state.rag = rag
        application.state.rutas = ListadoRutas.model_validate_json(
            (PROJECT_ROOT / "datos/rutas.json").read_text(encoding="utf-8")
        )
        try:
            await asyncio.to_thread(rag.preparar_indice)
            yield
        finally:
            rag.cerrar()

    application = FastAPI(
        title="Rumbo API",
        description="RAG local sobre los itinerarios y presupuestos ficticios de la maqueta.",
        version="0.2.0",
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
        swagger_ui_oauth2_redirect_url="/api/docs/oauth2-redirect",
        redoc_url=None,
        lifespan=lifespan,
    )

    @application.get("/api/health", tags=["Sistema"])
    async def health() -> dict[str, str]:
        return {"status": "ok", "service": "rumbo-api"}

    @application.get("/api/documentos", response_model=ListadoDocumentos, tags=["Documentos"])
    def documentos(request: Request) -> ListadoDocumentos:
        catalog = request.app.state.rag.catalogo
        return ListadoDocumentos(total=len(catalog.documentos), documentos=catalog.documentos,
                                 origen=catalog.origen, datos_de_ejemplo=catalog.datos_de_ejemplo)

    @application.get("/api/rutas", response_model=ListadoRutas, tags=["Rutas"])
    def rutas(request: Request) -> ListadoRutas:
        return request.app.state.rutas

    @application.post("/api/preguntar", response_model=Respuesta, tags=["Asistente"])
    def preguntar(peticion: Pregunta, request: Request) -> Respuesta:
        try:
            return request.app.state.rag.responder(peticion)
        except ErrorRAG as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from None
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from None

    @application.get("/api/maqueta", include_in_schema=False)
    async def mockup() -> FileResponse:
        mockup_path = PROJECT_ROOT / "maquetas.html"
        if not mockup_path.is_file():
            raise HTTPException(status_code=404, detail="La maqueta no está disponible.")
        return FileResponse(mockup_path, media_type="text/html")

    return application


app = crear_app()
