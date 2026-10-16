"""Validated API contracts and the model's structured output."""

from typing import Literal

from pydantic import AliasChoices, BaseModel, ConfigDict, Field


class Esquema(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Fragmento(Esquema):
    id: str
    seccion: str
    texto: str


class Documento(Esquema):
    id: str
    titulo: str
    tipo: Literal["Itinerario", "Presupuesto", "Catálogo"]
    region: str
    pais: str
    fecha: str
    etiqueta: str
    fragmentos: list[Fragmento] = Field(min_length=1)


class Catalogo(Esquema):
    origen: str
    datos_de_ejemplo: bool
    ruta_por_defecto: str
    cobertura: dict[str, bool]
    documentos: list[Documento] = Field(min_length=1)


class Mensaje(Esquema):
    rol: Literal["user", "assistant"] = Field(validation_alias=AliasChoices("rol", "role"))
    contenido: str = Field(
        min_length=1, max_length=2000,
        validation_alias=AliasChoices("contenido", "content"),
    )


class Pregunta(Esquema):
    pregunta: str = Field(min_length=1, max_length=1000)
    historial: list[Mensaje] = Field(default_factory=list, max_length=20)
    ruta_id: str | None = Field(default=None, max_length=100)


class Fuente(Esquema):
    documento_id: str
    titulo: str
    tipo: str
    fragmento_id: str
    seccion: str
    fragmento: str
    similitud: float | None = None


class Respuesta(Esquema):
    respuesta: str
    fuentes: list[Fuente]
    consta: bool
    modelo_consultado: bool
    datos_de_ejemplo: bool = True


class ListadoDocumentos(Esquema):
    total: int
    documentos: list[Documento]
    origen: str
    datos_de_ejemplo: bool


class SalidaModelo(Esquema):
    # All fields are required for OpenAI Structured Outputs.
    consta: bool
    respuesta: str
    fragmentos: list[str]


class Etapa(Esquema):
    ciudad: str
    rango: str
    dias: int = Field(gt=0)
    descripcion: str
    lugares: list[str]
    traslado: str


class PartidaPresupuesto(Esquema):
    concepto: str
    importe: int = Field(ge=0)


class Ruta(Esquema):
    id: str
    codigo: str
    pais: str
    continente: str
    titulo: str
    titulo_completo: str
    dias: int = Field(gt=0)
    noches: int = Field(ge=0)
    precio: int = Field(ge=0)
    categoria: str
    etiqueta: str
    descripcion: str
    temporada: str
    transporte: str
    presupuesto: list[PartidaPresupuesto]
    etapas: list[Etapa]
    documentos: list[str]


class ListadoRutas(Esquema):
    total: int
    rutas: list[Ruta]
    origen: str
    datos_de_ejemplo: bool
    ruta_por_defecto: str
