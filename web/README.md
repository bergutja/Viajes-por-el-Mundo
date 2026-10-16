# Interfaz de Rumbo

Svelte 5 con TypeScript y Vite. Reproduce las cinco páginas de `../maquetas.html`: explorador, detalle, chat con fuentes, caso «No consta» y documentos.

Desde la raíz, arranca Python en una terminal:

```powershell
uv run servidor.py
```

En otra terminal, desde `web/`:

```powershell
npm.cmd ci
npm.cmd run dev
```

Abre **http://127.0.0.1:5173**. La instalación con `npm.cmd ci` solo hace falta si faltan dependencias o cambia el archivo de bloqueo.

La interfaz utiliza exclusivamente `/api/rutas`, `/api/documentos` y `/api/preguntar`. Vite reenvía `/api` al puerto 8000. La clave permanece en el `.env` de la raíz y solo la lee Python; no la copies a variables `VITE_*`.

Comprobación de tipos y compilación:

```powershell
npm.cmd run check
npm.cmd run build
```

Consulta `../README.md` para la configuración, el índice RAG y las pruebas con curl.
