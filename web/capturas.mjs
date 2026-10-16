import { chromium } from 'playwright-core'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import assert from 'node:assert/strict'

const root = fileURLToPath(new URL('../', import.meta.url))
const directory = path.join(root, 'capturas')
const base = process.env.APP_URL || 'http://127.0.0.1:5173'
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const questions = ['¿Qué continente visitar?', '¿Cuántos días dura la ruta?', '¿Cuál es el coste de la ruta?', '¿Cuántas rutas se hicieron el año pasado?']
const files = ['01-chat-continente.png', '02-chat-duracion.png', '03-chat-coste.png', '04-chat-no-consta.png', '05-documentos.png']
await mkdir(directory, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
try {
  if (!process.argv.includes('--pdf-only')) {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' })
    page.setDefaultTimeout(60000)
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(`${base}/#/chat`, { waitUntil: 'networkidle' })
    await page.locator('.chat-route-selector select option').first().waitFor({ state: 'attached' })
    await page.locator('.chat-route-selector select').selectOption('RUT-JP-001')
    const catalogResponse = await page.request.get(`${base}/api/documentos`)
    assert(catalogResponse.ok(), 'No se pudo obtener el catálogo')
    const catalog = await catalogResponse.json()
    const results = []
    for (const [index, question] of questions.entries()) {
      const responsePromise = page.waitForResponse(response => response.url().endsWith('/api/preguntar') && response.request().method() === 'POST', { timeout: 90000 })
      await page.locator('#question-input').fill(question)
      await page.getByRole('button', { name: 'Enviar pregunta', exact: true }).click()
      const response = await responsePromise
      assert.equal(response.status(), 200, `Error HTTP al preguntar: ${question}`)
      const answer = await response.json()
      assert.equal(answer.consta, index !== 3)
      assert(answer.respuesta?.trim().length > 0)
      assert(answer.fuentes.length > 0, 'La respuesta no tiene fuentes')
      if (index === 3) {
        assert.equal(answer.modelo_consultado, false)
        assert.match(answer.respuesta, /no consta/i)
      }
      for (const source of answer.fuentes) {
        const document = catalog.documentos.find(doc => doc.id === source.documento_id)
        const fragment = document?.fragmentos.find(item => item.id === source.fragmento_id)
        assert(fragment, `Fragmento desconocido: ${source.fragmento_id}`)
        assert.equal(fragment.texto, source.fragmento, 'La cita no coincide con el documento')
      }
      const turn = page.locator('.chat-turn').last()
      await turn.locator('.answer-text').waitFor()
      assert.equal((await turn.locator('.answer-text').innerText()).trim(), answer.respuesta.trim())
      assert.equal(await turn.locator('.citation').count(), answer.fuentes.length)
      assert.equal(await page.locator('.pending-answer, .turn-error').count(), 0)
      // Enlarge only the scroll panel when the complete latest turn does not fit.
      // The viewport remains 1366x900; fullPage captures the resulting page height.
      await page.locator('.chat-main').evaluate(main => {
        main.style.height = ''
        const transcript = main.querySelector('.transcript')
        const last = transcript.querySelector('.chat-turn:last-child')
        const extra = Math.max(0, last.getBoundingClientRect().height + 52 - transcript.clientHeight)
        if (extra) main.style.height = `${main.getBoundingClientRect().height + extra}px`
      })
      await turn.scrollIntoViewIfNeeded()
      // Keep the latest question and its citations visible in the real scrollable chat.
      await page.locator('.transcript').evaluate(element => {
        const last = element.querySelector('.chat-turn:last-child')
        element.scrollTo({ top: element.scrollTop + last.getBoundingClientRect().top - element.getBoundingClientRect().top, behavior: 'instant' })
      })
      await page.evaluate(() => document.fonts.ready)
      assert(await turn.evaluate(element => {
        const panel = element.closest('.transcript').getBoundingClientRect()
        const box = element.getBoundingClientRect()
        return box.top >= panel.top - 2 && box.bottom <= panel.bottom + 2
      }), 'La pregunta o sus fuentes quedan cortadas en la captura')
      await page.screenshot({ path: path.join(directory, files[index]), fullPage: true, animations: 'disabled' })
      results.push({ pregunta: question, ...answer, captura: `capturas/${files[index]}`, citas_coinciden_con_catalogo: true })
      console.log(`Captura ${index + 1}: respuesta real y ${answer.fuentes.length} fuentes verificadas.`)
    }
    await page.goto(`${base}/#/documentos`, { waitUntil: 'networkidle' })
    await page.locator('.library-table tbody tr').last().waitFor()
    assert.equal(await page.locator('.library-table tbody tr').count(), catalog.total)
    await page.screenshot({ path: path.join(directory, files[4]), fullPage: true, animations: 'disabled' })
    assert.deepEqual(errors, [], 'Errores JavaScript en la interfaz')
    const models = JSON.parse(execFileSync('uv', ['run', '--frozen', 'python', '-c', 'from dotenv import load_dotenv; import os,json; load_dotenv(); print(json.dumps({"respuestas":os.getenv("OPENAI_MODEL","gpt-6-luna"),"embeddings":os.getenv("OPENAI_EMBEDDING_MODEL","text-embedding-3-small")}))'], { cwd: root, encoding: 'utf8' }).trim())
    const evidence = { fecha: new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' }), navegador: 'Microsoft Edge (channel: msedge)', ventana: '1366 × 900', origen: base, modelos: models, documentos: catalog.total, resultados: results }
    await writeFile(path.join(directory, 'comprobacion.json'), JSON.stringify(evidence, null, 2) + '\n')
    await writeFile(path.join(root, 'entregable.html'), report(evidence))
    console.log(`Listado: ${catalog.total} documentos. HTML y evidencia guardados.`)
    await page.close()
  }
  const pdfPage = await browser.newPage()
  await pdfPage.goto(pathToFileURL(path.join(root, 'entregable.html')).href, { waitUntil: 'networkidle' })
  assert.equal(await pdfPage.locator('img').count(), 5)
  assert(await pdfPage.locator('img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0)), 'Hay imágenes sin cargar')
  await pdfPage.pdf({ path: path.join(root, 'entregable.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true })
  const pdf = await readFile(path.join(root, 'entregable.pdf'))
  const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length
  assert(pages > 0, 'No se pudo verificar el número de páginas')
  await writeFile(path.join(directory, 'pdf-resumen.json'), JSON.stringify({ archivo: 'entregable.pdf', paginas: pages, formato: 'A4', bytes: pdf.length }, null, 2) + '\n')
  console.log(`entregable.pdf: ${pages} páginas A4; ${pdf.length} bytes.`)
} finally { await browser.close() }

function report(evidence) {
  const sheet = (title, content, label = 'Buscador de Viajes por el Mundo') => `<section class="sheet"><header>${escape(label)}</header><h1>${escape(title)}</h1>${content}</section>`
  const captions = [
    'Primera pregunta: el asistente sitúa la ruta de Japón en Asia y muestra el fragmento del itinerario que lo acredita.',
    'Segunda pregunta, en la misma conversación: duración de 12 días y 11 noches. Las citas permiten comprobar la distribución de las etapas.',
    'Tercera pregunta: presupuesto estimado de 1.850 € por persona. El documento permite comprobar sus partidas y exclusiones. El área de conversación se amplía para capturar completas las fuentes, manteniendo la ventana de 1366 × 900.',
    'Cuarta pregunta, manteniendo el historial: no hay registros de rutas realizadas el año pasado. La respuesta muestra «No consta» y cita el alcance del catálogo, sin consultar al generador.',
    'Biblioteca de los 13 documentos y registros de ejemplo. Incluye búsqueda, filtros y acceso al contenido completo de cada registro.',
  ]
  const shots = files.map((file, index) => sheet(['Chat · Continente', 'Chat · Duración', 'Chat · Coste', 'Chat · Cuando no consta', 'Listado de documentos'][index], `<figure><img src="capturas/${file}" alt="${escape(captions[index])}"><figcaption><b>Figura ${index + 1}.</b> ${escape(captions[index])}</figcaption></figure>`)).join('')
  const checks = evidence.resultados.map((result, index) => `<article><h2>${index + 1}. ${escape(result.pregunta)}</h2><p><b>Respuesta real:</b> ${escape(result.respuesta)}</p><p><b>Contraste:</b> ${index === 3 ? 'Sí: el registro declara que no existen estadísticas de viajes realizados; no permite dar una cifra. La API devolvió consta=false y modelo_consultado=false.' : 'Sí: la información de la respuesta está respaldada por los fragmentos siguientes.'} La coincidencia literal de cada cita con el catálogo se comprobó automáticamente.</p>${result.fuentes.map(source => `<div class="source"><p><b>Abre:</b> ${escape(source.titulo)} · <code>${escape(source.documento_id)}</code><br><b>Sección:</b> ${escape(source.seccion)} · <code>${escape(source.fragmento_id)}</code></p><blockquote>${escape(source.fragmento)}</blockquote></div>`).join('')}</article>`)
  const validation = sheet('Cómo lo comprobé · Destino y duración', `<p>Prueba ejecutada el ${escape(evidence.fecha)} (Europe/Madrid), en Edge a 1366 × 900. Preguntas enviadas desde la interfaz con historial, sin simular respuestas.</p>${checks.slice(0, 2).join('')}`)
    + sheet('Cómo lo comprobé · Coste y límites', `${checks.slice(2).join('')}<p class="note">Para confirmarlo tú: abre <a href="${base}/#/documentos">Documentos</a>, busca el identificador indicado y pulsa «Ver registro». También puedes abrir <a href="datos/documentos.json">datos/documentos.json</a> y localizar el identificador del fragmento. Las citas bajo cada respuesta abren directamente el documento correspondiente.</p>`)
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Buscador de Viajes por el Mundo · Entregable</title><style>
@page{size:A4;margin:14mm}*{box-sizing:border-box}body{margin:0;color:#203a30;background:#eef1eb;font:10pt/1.45 "Segoe UI",Arial,sans-serif}.sheet{width:182mm;margin:8mm auto;padding:0;background:white;break-after:page}.sheet:last-child{break-after:auto}header{text-transform:uppercase;letter-spacing:1.5px;color:#637567;font-size:8pt;border-bottom:1px solid #dce4d9;padding-bottom:4mm;margin-bottom:7mm}h1{font-size:23pt;line-height:1.18;margin:0 0 6mm}h2{font-size:13pt;margin:5mm 0 2mm}p{margin:2mm 0 3mm}figure{margin:0;break-inside:avoid}img{display:block;width:100%;max-height:210mm;object-fit:contain;object-position:top;border:1px solid #dce4d9}figcaption{font-size:10pt;margin-top:4mm}article,.source{break-inside:avoid}article+article{margin-top:6mm;padding-top:3mm;border-top:1px solid #dce4d9}.source{background:#f3f6ef;padding:2mm 3mm;margin:2mm 0}blockquote{margin:1mm 0;font-size:9pt}code{font-size:9pt}a{color:#234e3c}.cover{padding-top:25mm;min-height:245mm}.cover h1{font-size:39pt;margin:12mm 0}.kicker{color:#68824c;text-transform:uppercase;letter-spacing:2px}.author{font-size:16pt;margin-bottom:16mm}.note{font-size:9pt;color:#526253}.cover .summary{font-size:14pt;line-height:1.6;margin-bottom:12mm}li{margin-bottom:3mm}@media screen{.sheet{padding:10mm;width:202mm;box-shadow:0 3px 20px #203a3015}}@media print{body{background:white}.sheet{margin:0}a{text-decoration:none}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<section class="sheet cover"><header>Proyecto de IA generativa · Entregable</header><p class="kicker">Rumbo · Asistente con fuentes</p><h1>Buscador de Viajes por el Mundo</h1><p class="author">Javier Bermejo</p><p class="summary">Reúne itinerarios, lugares que visitar y presupuestos para preparar viajes por el mundo. Permite preguntar en lenguaje natural y comprobar el origen de cada respuesta, mostrando «No consta» cuando los datos no la respaldan.</p><h2>De dónde salen los datos</h2><p>Datos inventados pero realistas de <code>maquetas.html</code>, extraídos mediante <code>preparar_datos.py</code> a <code>datos/rutas.json</code> y <code>datos/documentos.json</code>: seis rutas, seis presupuestos y un registro de alcance, con 32 fragmentos en total.</p><p>Esta versión no recopila páginas de viajes en directo. Los precios, fechas e itinerarios son de demostración y no representan tarifas actuales ni reservas reales.</p><p class="note">Prueba: ${escape(evidence.fecha)} · Europe/Madrid<br>Capturas con Microsoft Edge · Ventana 1366 × 900<br>Interfaz local: <a href="${base}">${escape(base)}</a></p></section>
${shots}${validation}
${sheet('Cómo está hecho', `<h2>Servidor Python con RAG</h2><p>FastAPI se ejecuta con <code>uv run servidor.py</code>, en el puerto 8000. El catálogo se divide en fragmentos y se indexa mediante embeddings normalizados. La búsqueda compara la pregunta con los fragmentos usando similitud coseno con NumPy.</p><p>El índice se guarda en <code>data/rag/indice.npz</code> y se reutiliza al arrancar, salvo que cambien los documentos o el modelo. Los fragmentos recuperados fundamentan una respuesta estructurada; las fuentes se reconstruyen desde el catálogo.</p><h2>Modelos usados en esta prueba</h2><p>Respuestas: <b>${escape(evidence.modelos.respuestas)}</b>.<br>Embeddings: <b>${escape(evidence.modelos.embeddings)}</b>.</p><p>Si no se recupera información suficiente, el servidor devuelve «No consta» sin pedir una respuesta al modelo. La pregunta de rutas realizadas se detecta antes de embeddings y generación, porque el catálogo declara expresamente esa ausencia.</p><h2>Interfaz en Svelte</h2><p>Svelte con TypeScript y Vite, con explorador, detalle, chat y biblioteca. Solo consume <code>/api/rutas</code>, <code>/api/documentos</code> y <code>/api/preguntar</code>. Vite reenvía esas rutas al servidor Python. La clave permanece en el <code>.env</code> del servidor y nunca se envía al navegador.</p><h2>Repetir la comprobación</h2><ol><li>En la raíz: <code>uv run servidor.py</code>.</li><li>En otra terminal, dentro de <code>web/</code>: <code>npm.cmd run dev</code>.</li><li>Abre <a href="${base}">${escape(base)}</a>.</li><li>En <code>web/</code>: <code>node capturas.mjs</code> repite preguntas, capturas y PDF. Requiere conexión y puede consumir la API del modelo.</li><li><code>node capturas.mjs --pdf-only</code> vuelve a generar solo el PDF desde el HTML existente.</li></ol><p class="note">Evidencia técnica: <a href="capturas/comprobacion.json">capturas/comprobacion.json</a>, con respuestas y citas recibidas; <a href="capturas/pdf-resumen.json">capturas/pdf-resumen.json</a>, con el número de páginas. Las cinco imágenes se enlazan por rutas relativas. No se descargaron navegadores.</p>`)}
</body></html>`
}
