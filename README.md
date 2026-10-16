# Rumbo

Base local para la aplicación de viajes: servidor Python con FastAPI, gestionado con **uv**, e interfaz **Vite + Svelte + TypeScript** en `web/`.

`maquetas.html` conserva el diseño de referencia original. La interfaz inicial comprueba la conexión con la API y permite abrir esa maqueta. Las funciones completas de viajes y el chat con IA todavía no están implementados; los datos de la maqueta son ficticios.

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

La librería OpenAI está instalada, pero esta base no realiza llamadas a OpenAI ni necesita una clave para arrancar.

## Arrancar el proyecto

Abre dos terminales en esta carpeta y mantenlas abiertas.

**Terminal 1 — API Python, puerto 8000:**

```powershell
uv run --frozen python -m uvicorn rumbo.api:app --host 127.0.0.1 --port 8000 --reload
```

**Terminal 2 — interfaz Vite, puerto 5173:**

```powershell
cd web
npm.cmd run dev
```

Abre **http://127.0.0.1:5173**. El indicador de conexión debe mostrar que la API está conectada.

También puedes iniciar la API sin recarga automática con `uv run --frozen python -m rumbo`. Se utiliza `python -m` para evitar el error «Acceso denegado» observado con el lanzador `uvicorn.exe` en este equipo.

- Estado de la API, a través de Vite: http://127.0.0.1:5173/api/health
- Documentación de la API: http://127.0.0.1:8000/api/docs
- Maqueta original, a través de Vite: http://127.0.0.1:5173/api/maqueta
- La maqueta también se puede abrir directamente con doble clic en `maquetas.html`.

Vite reenvía `/api` a `http://127.0.0.1:8000` sin eliminar el prefijo. Esta configuración se aplica al servidor de desarrollo; no constituye una configuración de despliegue.

Usa `Ctrl+C` en cada terminal para detener su servidor. Los dos servidores escuchan solo en el equipo local.

## Comprobaciones

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

- `src/rumbo/api.py`: API FastAPI y carga de configuración local.
- `src/rumbo/__init__.py` y `__main__.py`: arranque con `python -m rumbo`.
- `pyproject.toml` y `uv.lock`: dependencias y versiones de Python.
- `web/src/App.svelte`: pantalla inicial y petición real a `/api/health`.
- `web/vite.config.ts`: servidor de desarrollo y proxy `/api`.
- `web/package.json` y `web/package-lock.json`: dependencias de la interfaz.
- `maquetas.html`: diseño de referencia original e independiente.

`.gitignore` excluye `.env`, `.venv`, `node_modules`, compilaciones, logs y bases de datos locales, incluidos los archivos auxiliares de SQLite. Los dos archivos de bloqueo sí se versionan. No se ha creado ninguna base de datos todavía.

## Referencias oficiales

- [Node.js: descargas](https://nodejs.org/en/download)
- [uv: gestión de proyectos](https://docs.astral.sh/uv/guides/projects/)
- [Vite: plantillas iniciales](https://vite.dev/guide/)
- [Vite: proxy del servidor](https://vite.dev/config/server-options#server-proxy)
