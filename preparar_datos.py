"""Copy the mockup's example catalog into JSON. Node is only needed to regenerate it."""

import json
import os
from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parent


def preparar_datos() -> Path:
    source = (ROOT / "maquetas.html").read_text(encoding="utf-8")
    start = source.index("const ROUTES=")
    end = source.index("/* Ilustraciones vectoriales", start)
    code = (
        "const euro=n=>new Intl.NumberFormat('es-ES',"
        "{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n);\n"
        + source[start:end]
        + "\n({documentos:DOCUMENTS, rutas:ROUTES});"
    )
    node = shutil.which("node")
    if node is None and os.name == "nt":
        base = Path(os.environ["LOCALAPPDATA"]) / "Microsoft/WinGet/Packages"
        node = next((str(p) for p in base.glob("OpenJS.NodeJS.LTS*/node-*/node.exe")), None)
    if node is None:
        raise RuntimeError("Para regenerar los datos de la maqueta hace falta Node.js.")

    # Evaluate only the mockup's data declarations, not its DOM or event handlers.
    evaluator = (
        "const fs=require('node:fs'),vm=require('node:vm');"
        "const source=fs.readFileSync(0,'utf8');"
        "process.stdout.write(JSON.stringify(vm.runInNewContext(source,{}, {timeout:1500})));"
    )
    result = subprocess.run(
        [node, "-e", evaluator], input=code, capture_output=True,
        text=True, encoding="utf-8", check=True, timeout=15,
    )
    extracted = json.loads(result.stdout)
    documents = []
    for doc in extracted["documentos"]:
        assert len(doc["sections"]) == len(doc["fragments"])
        documents.append({
            "id": doc["id"], "titulo": doc["title"], "tipo": doc["type"],
            "region": doc["region"], "pais": doc["country"], "fecha": doc["date"],
            "etiqueta": doc["label"],
            "fragmentos": [
                {"id": f"{doc['id']}:{i + 1}", "seccion": section, "texto": text}
                for i, (section, text) in enumerate(zip(doc["sections"], doc["fragments"]))
            ],
        })
    catalog = {
        "origen": "maquetas.html", "datos_de_ejemplo": True,
        "ruta_por_defecto": "RUT-JP-001",
        "cobertura": {"itinerarios": True, "presupuestos": True, "viajes_realizados": False},
        "documentos": documents,
    }
    destination = ROOT / "datos" / "documentos.json"
    destination.parent.mkdir(exist_ok=True)
    destination.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    budget_labels = ["Alojamiento", "Transporte en destino", "Comidas", "Visitas y actividades", "Margen para imprevistos"]
    routes = []
    for route in extracted["rutas"]:
        assert sum(route["budget"]) == route["price"]
        assert sum(stage["length"] for stage in route["stages"]) == route["days"]
        routes.append({
            "id": f"RUT-{route['id']}-001", "codigo": route["id"],
            "pais": route["country"], "continente": route["continent"],
            "titulo": route["title"], "titulo_completo": route["fullTitle"],
            "dias": route["days"], "noches": route["nights"], "precio": route["price"],
            "categoria": route["category"], "etiqueta": route["tag"],
            "descripcion": route["intro"], "temporada": route["season"], "transporte": route["travel"],
            "presupuesto": [{"concepto": name, "importe": amount} for name, amount in zip(budget_labels, route["budget"])],
            "etapas": [{"ciudad": stage["city"], "rango": stage["range"], "dias": stage["length"],
                        "descripcion": stage["text"], "lugares": stage["places"], "traslado": stage["transfer"]}
                       for stage in route["stages"]],
            "documentos": [f"RUT-{route['id']}-001", f"PRE-{route['id']}-001"],
        })
    (destination.parent / "rutas.json").write_text(json.dumps({
        "total": len(routes), "rutas": routes, "origen": "maquetas.html", "datos_de_ejemplo": True,
        "ruta_por_defecto": catalog["ruta_por_defecto"],
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return destination


if __name__ == "__main__":
    destination = preparar_datos()
    print(f"Catalogo de demostracion guardado en {destination.relative_to(ROOT)}")
