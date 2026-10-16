# Rumbo

Aplicación local de viajes con un **servidor RAG en Python y FastAPI**, gestionado con **uv**, y una interfaz **Vite + Svelte + TypeScript** en `web/`.

`maquetas.html` es la especificación visual y conserva el diseño original. La interfaz reproduce sus cinco páginas: explorador de rutas, detalle del itinerario, chat con fuentes, aviso de datos no disponibles y biblioteca de documentos. El chat consulta realmente al servidor y muestra debajo de cada respuesta el documento, la sección y el fragmento original que la justifican. Todos los datos de viajes y sus precios son **ficticios**.

Los datos de la interfaz llegan exclusivamente de `/api/rutas`, `/api/documentos` y `/api/preguntar`. La clave se carga en Python desde el `.env` de la raíz; el navegador no recibe credenciales ni consulta directamente a OpenAI.

## Requisitos

- Node.js 24.20.0 y npm. La versión de referencia está en `.node-version`.
- Python 3.13 y uv.
- Git.

En Windows, si una terminal abierta antes de instalar Node.js no lo reconoce, vuelve a abrir el editor o actualiza el `PATH` de esa terminal:

```powershell
$env:Path = [Environment]::GetEnvironmentVariable('Path', 'User') + ';' + $env:Path
node -v
npm.cmd -v
```

Se usa `npm.cmd` en las instrucciones de PowerShell para evitar que una política de ejecución bloquee el lanzador `npm.ps1`.

## Dependencias

Desde la raíz, `uv sync --frozen` reproduce las versiones Python de `uv.lock` y crea `.venv` si hace falta:

```powershell
uv sync --frozen
```

Para instalar las dependencias de la interfaz a partir del archivo de bloqueo:

```powershell
cd web
npm.cmd ci
```

Las dependencias Python se añadieron con `uv add openai python-dotenv numpy fastapi uvicorn`. Para añadir otras, utiliza `uv add`, sin pip.

## Configuración local

El archivo `.env` existente se conserva y no se versiona. `.env.example` muestra únicamente las variables de referencia, sin valores reales. El servidor carga `.env` con `python-dotenv`; la interfaz no necesita acceso a sus claves.

Los ajustes de usuario de npm `proxy` y `https-proxy` se han configurado con el mismo valor de `HTTPS_PROXY` del `.env`. Se guardan en la configuración local de npm, fuera del repositorio. Si cambia ese proxy habrá que actualizar ambos ajustes. No se ha desactivado la verificación TLS.

El RAG usa `OPENAI_API_KEY` del `.env`, sin enviarla al navegador ni mostrarla en los registros. Hace falta una clave válida y conexión para construir el primer índice y consultar OpenAI. Un índice válido se carga de disco en los siguientes arranques.

Opcionalmente se pueden definir estas variables en el `.env`; si no están, se usan los valores de la tabla:

| Variable | Valor por defecto | Uso |
| --- | --- | --- |
| `OPENAI_MODEL` | `gpt-6-luna` | Respuestas estructuradas, como en la referencia RAG. |
| `OPENAI_EMBEDDING_MODEL` | `text-embedding-3-small` | Vectores de documentos y preguntas. |
| `RAG_UMBRAL` | `0.30` | Similitud mínima para pasar fragmentos al generador. |
| `RAG_K` | `4` | Máximo de fragmentos recuperados por pregunta. |

## Arrancar el proyecto

Abre dos terminales en esta carpeta y mantenlas abiertas.

**Terminal 1 — API Python, puerto 8000:**

```powershell
uv run servidor.py
```

**Terminal 2 — interfaz Vite, puerto 5173:**

```powershell
cd web
npm.cmd run dev
```

Abre **http://127.0.0.1:5173**. Verás el explorador con seis rutas. Desde la navegación puedes abrir el chat, el caso «No consta» y los documentos.

`servidor.py` ejecuta Uvicorn desde Python para evitar el error «Acceso denegado» observado con el lanzador `uvicorn.exe` en este equipo. Detén cualquier servidor anterior que ocupe el puerto 8000 antes de arrancarlo. Si cambias datos o código, reinicia el servidor.

- Estado de la API, a través de Vite: http://127.0.0.1:5173/api/health
- Documentación de la API: http://127.0.0.1:8000/api/docs
- Catálogo de documentos: http://127.0.0.1:8000/api/documentos
- Catálogo de rutas: http://127.0.0.1:8000/api/rutas
- Maqueta original, a través de Vite: http://127.0.0.1:5173/api/maqueta
- La maqueta también se puede abrir directamente con doble clic en `maquetas.html`.

Vite reenvía `/api` a `http://127.0.0.1:8000` sin eliminar el prefijo. Esta configuración se aplica al servidor de desarrollo; no constituye una configuración de despliegue.

Usa `Ctrl+C` en cada terminal para detener su servidor. Los dos servidores escuchan solo en el equipo local.

## Datos e índice persistente

`datos/documentos.json` contiene 13 documentos y registros, divididos en 32 fragmentos. `datos/rutas.json` contiene los seis itinerarios con sus etapas, lugares y presupuestos. Se copiaron de las declaraciones de datos de `maquetas.html`; conservan sus identificadores, secciones, fechas de ejemplo y fragmentos originales.

Para regenerar ese catálogo después de editar la maqueta:

```powershell
uv run preparar_datos.py
```

El generador necesita Node.js, ya instalado para la interfaz. El servidor utiliza directamente el JSON generado y no necesita Node.js para leerlo.

El buscador sigue el enfoque de `../iagen-api-casos/rag.py`: embeddings normalizados y similitud coseno con NumPy. El índice se guarda mediante sustitución atómica en `data/rag/indice.npz`, que no se versiona. Incluye una huella del texto indexado y del modelo de embeddings; cambiar el contenido o ese modelo lo invalida, aunque siga habiendo el mismo número de fragmentos. Una caché corrupta se reconstruye.

Para preparar o comprobar el índice sin dejar el servidor arrancado:

```powershell
uv run servidor.py --preparar-indice
```

La segunda ejecución indica `Indice reutilizado de disco`. Las preguntas nuevas sí necesitan su embedding para buscar; reutilizar el índice evita volver a calcular los embeddings del catálogo.

## API del asistente

`POST /api/preguntar` recibe:

```json
{
  "pregunta": "¿Cuántos días dura la ruta?",
  "historial": [
    {"rol": "user", "contenido": "Quiero visitar Japón."},
    {"rol": "assistant", "contenido": "La propuesta está en Asia."}
  ]
}
```

Los roles permitidos son `user` y `assistant`. También se admiten los nombres de campo `role` y `content`. `historial` es opcional; se validan hasta 20 mensajes de 2.000 caracteres y una pregunta de hasta 1.000 caracteres. Puedes añadir `ruta_id`, por ejemplo `RUT-PT-001`, para seleccionar explícitamente un itinerario.

Sin un destino explícito ni uno mencionado en el historial, el contexto es la ruta de Japón, como en el chat de la maqueta. Los metadatos de país evitan mezclar sus días o precios con los de otras rutas.

La respuesta JSON contiene:

- `respuesta`: texto de la respuesta.
- `consta`: si los documentos respaldan la respuesta.
- `modelo_consultado`: si se llamó al generador de respuestas; no incluye el cálculo del embedding de la pregunta.
- `datos_de_ejemplo`: `true` para este catálogo ficticio.
- `fuentes`: documento, título, tipo, identificador de fragmento, sección, fragmento original y similitud cuando procede.

El generador usa Structured Outputs con un esquema Pydantic. Solo puede seleccionar identificadores de los fragmentos recuperados; el servidor construye las fuentes a partir del catálogo y rechaza referencias inventadas. El historial no se trata como una fuente documental.

Si ningún fragmento supera el umbral, se devuelve `No consta en los datos.`, `consta: false`, `modelo_consultado: false` y ninguna fuente. Además, la falta de registros de viajes realizados se comprueba **antes de cualquier llamada de embeddings o generación**: la pregunta sobre rutas realizadas el año pasado cita `CAT-000:1` como evidencia del alcance, sin inventar un número.

Los errores de conexión o de respuesta del proveedor devuelven HTTP 502; no se presentan como una ausencia de datos. Una entrada inválida devuelve HTTP 422. El primer arranque requiere que pueda prepararse el índice.

`GET /api/documentos` devuelve `total`, `origen`, `datos_de_ejemplo` y `documentos`. Cada documento incluye su identificador, título, tipo, región, país, fecha de ejemplo, etiqueta y fragmentos. El listado puede filtrarse en la interfaz sin nuevas consultas al modelo.

`GET /api/rutas` devuelve `total`, `rutas`, `ruta_por_defecto`, `origen` y `datos_de_ejemplo`. Incluye las etapas, visitas, traslados y partidas del presupuesto; la interfaz no mantiene una copia de esos datos.

## Uso de la interfaz

- **Explorar:** búsqueda por destino o lugar, filtros por continente, duración y presupuesto, y rutas guardadas.
- **Detalle:** itinerario por etapas, lugares que visitar, desglose del presupuesto y acceso a sus documentos.
- **Chat:** selecciona la ruta y utiliza las preguntas sugeridas o escribe la tuya. Las fuentes se abren para consultar el documento completo y el fragmento citado.
- **No consta:** pregunta por las rutas realizadas el año pasado. Muestra la respuesta real de la API y el registro que explica la ausencia de esos datos.
- **Documentos:** busca por título, identificador o fragmento, filtra por tipo y región y descarga el catálogo JSON.

La conversación se conserva en memoria por ruta mientras la página permanece abierta. Se envían al servidor los últimos 20 mensajes completados. Al recargar se vacía el chat; solo los identificadores de favoritos se guardan en `localStorage`. Un error de conexión ofrece reintentar y se distingue de una respuesta «No consta».

## Probar con curl en PowerShell

Desde la raíz del proyecto, con el servidor arrancado, usa `curl.exe` para evitar el alias de PowerShell. Los archivos JSON están en UTF-8 y conservan el contexto entre las preguntas de ejemplo. `--noproxy "*"` evita enviar las peticiones locales al proxy de Internet.

```powershell
curl.exe --noproxy "*" http://127.0.0.1:8000/api/documentos

curl.exe --noproxy "*" http://127.0.0.1:8000/api/preguntar -H "Content-Type: application/json" --data-binary "@ejemplos/continente.json"
curl.exe --noproxy "*" http://127.0.0.1:8000/api/preguntar -H "Content-Type: application/json" --data-binary "@ejemplos/duracion.json"
curl.exe --noproxy "*" http://127.0.0.1:8000/api/preguntar -H "Content-Type: application/json" --data-binary "@ejemplos/coste.json"
curl.exe --noproxy "*" http://127.0.0.1:8000/api/preguntar -H "Content-Type: application/json" --data-binary "@ejemplos/no_consta.json"
```

Resultados esperados: Asia/Japón, 12 días y 11 noches, 1.850 € por persona sin vuelos internacionales ni seguro, y `No consta en los datos.` para las rutas realizadas el año pasado. En el cuarto caso, `modelo_consultado` debe ser `false`.

## Comprobaciones

Desde la raíz, las pruebas del RAG usan un cliente simulado, sin llamadas pagadas:

```powershell
uv run python -m unittest discover -s tests -v
```

Comprueban persistencia, invalidación del índice, caché corrupta, historial, citas originales, rechazo de fuentes inventadas, validación de la API y los caminos que no llaman al generador.

Desde `web/`, comprueba los tipos de Svelte y TypeScript y genera la compilación:

```powershell
npm.cmd run check
npm.cmd run build
```

Con ambos servidores en marcha, esta petición desde PowerShell verifica también el proxy de Vite:

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:5173/api/health
```

Debe devolver `status: ok` y `service: rumbo-api`.

## Archivos principales

- `servidor.py`: arranque solicitado en el puerto 8000 y preparación opcional del índice.
- `src/rumbo/api.py`: endpoints FastAPI y carga de configuración local.
- `src/rumbo/rag.py`: búsqueda con embeddings, persistencia y generación fundamentada.
- `src/rumbo/esquemas.py`: esquemas de peticiones, respuestas, documentos y salida del modelo.
- `preparar_datos.py`, `datos/documentos.json` y `datos/rutas.json`: extracción reproducible de los catálogos de la maqueta.
- `ejemplos/*.json`: las cuatro peticiones listas para curl.
- `tests/test_rag.py`: pruebas locales sin consultar OpenAI.
- `pyproject.toml` y `uv.lock`: dependencias y versiones de Python.
- `web/src/App.svelte` y `web/src/pages/`: navegación y las cinco páginas de la aplicación.
- `web/src/lib/api.ts`: cliente tipado que solo utiliza rutas relativas `/api`.
- `web/src/lib/Answer.svelte` y `DocumentDialog.svelte`: respuestas, citas y consulta de documentos.
- `web/src/mockup.css` y `app.css`: diseño original y estados de la aplicación.
- `web/vite.config.ts`: servidor de desarrollo y proxy `/api`.
- `web/package.json` y `web/package-lock.json`: dependencias de la interfaz.
- `maquetas.html`: diseño de referencia original e independiente.

`.gitignore` excluye `.env`, `.venv`, `node_modules`, compilaciones, logs y `data/`, donde están el índice y los resultados de las pruebas reales. También excluye bases de datos locales y archivos auxiliares de SQLite. El catálogo `datos/documentos.json` y los dos archivos de bloqueo sí se versionan. No se ha creado una base de datos SQL.

## Referencias oficiales

- [Node.js: descargas](https://nodejs.org/en/download)
- [uv: gestión de proyectos](https://docs.astral.sh/uv/guides/projects/)
- [Vite: plantillas iniciales](https://vite.dev/guide/)
- [Vite: proxy del servidor](https://vite.dev/config/server-options#server-proxy)
- [OpenAI: embeddings y búsqueda por similitud](https://developers.openai.com/api/docs/guides/embeddings)
- [OpenAI: salidas estructuradas](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses)
