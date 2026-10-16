"""Arranque: uv run servidor.py (API local en el puerto 8000)."""

import argparse
import logging

from rumbo.api import app
from rumbo.rag import BuscadorRAG


def main() -> None:
    parser = argparse.ArgumentParser(description="Servidor RAG de viajes Rumbo")
    parser.add_argument("--preparar-indice", action="store_true", help="Preparar o comprobar el índice y salir")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    if args.preparar_indice:
        rag = BuscadorRAG()
        try:
            rag.preparar_indice()
            mode = "reutilizado de disco" if rag.indice_cargado_de_disco else "generado y guardado"
            print(f"Indice {mode}: {len(rag.trozos)} fragmentos.")
        finally:
            rag.cerrar()
    else:
        import uvicorn
        uvicorn.run(app, host="127.0.0.1", port=8000)


if __name__ == "__main__":
    main()
