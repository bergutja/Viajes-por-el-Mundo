# Buscador de Viajes por el Mundo

Aplicación local para explorar rutas de viaje, consultar sus etapas y presupuestos y preguntar a un asistente que muestra las fuentes bajo cada respuesta. Cuando la información no existe, responde «No consta en los datos».

## Datos y tecnología

Los datos son inventados pero realistas: seis itinerarios, seis presupuestos y un registro de alcance, extraídos de `maquetas.html` a `datos/rutas.json` y `datos/documentos.json`. No son tarifas actuales ni datos de reservas reales.

El servidor usa Python, FastAPI y RAG con un índice de embeddings persistente. La interfaz utiliza Svelte, TypeScript y Vite. Los modelos configurados por defecto son `gpt-6-luna` para respuestas y `text-embedding-3-small` para embeddings. La clave solo se utiliza en Python.

## Arranque

Requisitos: Python 3.13, uv, Node.js y npm. Desde la raíz:

```powershell
uv sync --frozen
```

Copia `.env.example` a `.env` si todavía no existe y configura tu clave. No publiques ese archivo. El primer índice y las consultas al modelo requieren conexión y una clave válida.

Terminal 1, desde la raíz:

```powershell
uv run servidor.py
```

Terminal 2, desde la raíz:

```powershell
cd web
npm.cmd ci
npm.cmd run dev
```

Abre **http://127.0.0.1:5173**. Vite reenvía `/api` al servidor Python en el puerto 8000. Detén los servidores con `Ctrl+C`.

## Preguntas comprobadas

Con la ruta de Japón seleccionada:

| Pregunta | Resultado | Fuente |
| --- | --- | --- |
| ¿Qué continente visitar? | Asia | `RUT-JP-001`, Destino y enfoque |
| ¿Cuántos días dura la ruta? | 12 días y 11 noches | `RUT-JP-001`, Distribución de días |
| ¿Cuál es el coste de la ruta? | 1.850 € por persona, sin vuelos internacionales ni seguro | `PRE-JP-001`, Desglose e inclusiones |
| ¿Cuántas rutas se hicieron el año pasado? | No consta en los datos; sin llamar al generador | `CAT-000`, Cobertura y limitaciones |

Puedes abrir esos registros en la página Documentos para comprobar los fragmentos.

## Entregable

- [Informe PDF: 9 páginas A4](entregable.pdf).
- [Informe HTML](entregable.html), con imágenes relativas en [capturas/](capturas/).
- [Respuestas y fuentes de la comprobación](capturas/comprobacion.json).

Con ambos servidores activos, desde `web/`, `node capturas.mjs` repite las preguntas reales, guarda las cinco capturas y genera el informe. Usa `playwright-core` y Microsoft Edge instalado, sin descargar navegadores. Puede consumir la API del modelo. `node capturas.mjs --pdf-only` regenera solo el PDF.

## Comprobaciones técnicas

Desde la raíz: `uv run python -m unittest discover -s tests -v`.

Desde `web/`: `npm.cmd run check` y `npm.cmd run build`.
