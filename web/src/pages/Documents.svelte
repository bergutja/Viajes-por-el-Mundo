<script lang="ts">
  import { normalizar, type Documento, type ListadoDocumentos } from '../lib/api'
  import Icon from '../lib/Icon.svelte'
  let { catalog, loading, error, search = $bindable(''), onRetry, onDocument }: {
    catalog: ListadoDocumentos | null; loading: boolean; error: string; search?: string
    onRetry: () => void; onDocument: (document: Documento) => void
  } = $props()
  let type = $state('all'), region = $state('all')
  let documents = $derived(catalog?.documentos ?? [])
  let regions = $derived([...new Set(documents.map(doc => doc.region))].sort((a, b) => a.localeCompare(b, 'es')))
  let continentCount = $derived(new Set(documents.filter(doc => doc.tipo === 'Itinerario').map(doc => doc.region)).size)
  let filtered = $derived(documents.filter(doc =>
    (type === 'all' || doc.tipo === type) && (region === 'all' || doc.region === region)
    && normalizar([doc.id, doc.titulo, doc.pais, doc.region, ...doc.fragmentos.map(fragment => fragment.texto)].join(' ')).includes(normalizar(search))))
  function reset() { search = ''; type = 'all'; region = 'all' }
  function download() {
    if (!catalog) return
    const url = URL.createObjectURL(new Blob([JSON.stringify(catalog, null, 2)], { type: 'application/json;charset=utf-8' }))
    const link = document.createElement('a'); link.href = url; link.download = 'rumbo-documentos.json'; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
</script>

<section class="screen documents-screen"><div class="wrap">
  <div class="screen-label"><span class="number">05</span>La biblioteca · El origen de cada respuesta</div>
  <div class="section-head"><div><h1 class="page-title">Detrás de cada ruta, un poco de contexto.</h1><p class="subtitle">Busca los documentos y registros que utiliza el asistente.</p></div><button class="button secondary" onclick={download} disabled={!catalog || loading}><Icon name="download" size={16} />Descargar catálogo</button></div>
  <div class="library-stats"><div class="library-stat"><Icon name="folder" size={21} /><div><strong>{catalog?.total ?? '—'}</strong><span>documentos y registros</span></div></div><div class="library-stat"><Icon name="globe" size={21} /><div><strong>{catalog ? continentCount : '—'}</strong><span>continentes para explorar</span></div></div><div class="library-stat"><Icon name="file" size={21} /><div><strong>{catalog?.datos_de_ejemplo ? '100 %' : '—'}</strong><span>contenido de demostración</span></div></div></div>
  <div class="search-row"><label class="searchbox"><Icon name="search" size={17} /><input type="search" bind:value={search} placeholder="Busca por título, país, identificador o fragmento…" aria-label="Buscar documentos y registros" /></label><select bind:value={type} aria-label="Filtrar documentos por tipo"><option value="all">Todos los tipos</option><option value="Itinerario">Itinerarios</option><option value="Presupuesto">Presupuestos</option><option value="Catálogo">Alcance del catálogo</option></select><select bind:value={region} aria-label="Filtrar documentos por región"><option value="all">Todas las regiones</option>{#each regions as name}<option value={name}>{name}</option>{/each}</select></div>
  {#if loading}<div class="loading-state" role="status"><span class="thinking-dot"></span>Cargando documentos…</div>
  {:else if error}<div class="error-state" role="alert"><Icon name="info" size={22} /><h2>No hemos podido cargar la biblioteca.</h2><p>{error}</p><button class="button secondary" onclick={onRetry}>Reintentar</button></div>
  {:else}<div class="library-table-wrap"><table class="library-table"><thead><tr><th scope="col">Documento o registro</th><th scope="col">Tipo</th><th scope="col">Región</th><th scope="col">Fecha de ejemplo</th><th scope="col">Contenido</th></tr></thead><tbody>{#each filtered as doc (doc.id)}<tr><td><div class="doc-name"><span class="file-box"><Icon name={doc.tipo === 'Catálogo' ? 'folder' : 'file'} size={16} /></span><span><strong>{doc.titulo}</strong><small>{doc.id} · {doc.etiqueta}</small></span></div></td><td><span class="pill outline">{doc.tipo}</span></td><td>{doc.region}</td><td>{doc.fecha}</td><td><button class="table-button" onclick={() => onDocument(doc)} aria-label={`Ver registro: ${doc.titulo}`}>Ver registro ↗</button></td></tr>{:else}<tr><td colspan="5" class="table-empty"><h2>Sin resultados</h2><p>Prueba otra búsqueda o elimina alguno de los filtros.</p><button class="button secondary" onclick={reset}>Limpiar filtros</button></td></tr>{/each}</tbody></table></div>
  <div class="library-bottom"><span aria-live="polite">Mostrando {filtered.length} de {catalog?.total ?? 0} registros</span><span>Fechas y fragmentos de demostración</span></div>{/if}
  <div class="library-context"><Icon name="info" size={18} /><p>Los documentos describen propuestas de viaje. Sus fechas y precios son ejemplos; no representan disponibilidad ni reservas.</p></div>
</div></section>
