<script lang="ts">
  import { onMount, tick } from 'svelte'
  import {
    obtenerDocumentos, obtenerRutas, preguntar,
    type Documento, type Fuente, type ListadoDocumentos, type Mensaje, type Ruta, type Turno,
  } from './lib/api'
  import Icon from './lib/Icon.svelte'
  import DocumentDialog from './lib/DocumentDialog.svelte'
  import Explore from './pages/Explore.svelte'
  import RouteDetail from './pages/RouteDetail.svelte'
  import Chat from './pages/Chat.svelte'
  import NoData from './pages/NoData.svelte'
  import Documents from './pages/Documents.svelte'

  type View = 'explorar' | 'ruta' | 'chat' | 'sin-datos' | 'documentos' | 'not-found'
  const pageNames: Record<View, string> = {
    explorar: 'Explorar el mundo', ruta: 'Tu ruta', chat: 'Tu asistente',
    'sin-datos': 'El alcance de las fuentes', documentos: 'La biblioteca', 'not-found': 'Página no encontrada',
  }
  function readLocation(): { view: View; id: string } {
    const [name = '', encodedId = ''] = window.location.hash.replace(/^#\/?/, '').split('/')
    const view: View = !name ? 'explorar' : Object.hasOwn(pageNames, name) && name !== 'not-found' ? name as View : 'not-found'
    let id = ''
    try { if (view === 'ruta') id = decodeURIComponent(encodedId) } catch { return { view: 'not-found', id: '' } }
    return { view, id }
  }
  const initial = readLocation()
  let view = $state<View>(initial.view)
  let selectedId = $state(initial.id)
  let routes = $state<Ruta[]>([])
  let catalog = $state<ListadoDocumentos | null>(null)
  let routesLoading = $state(true), documentsLoading = $state(true)
  let routesError = $state(''), documentsError = $state('')
  let saved = $state<string[]>([]), onlySaved = $state(false)
  let documentSearch = $state('')
  let conversations = $state<Record<string, Turno[]>>({})
  let activeDocument = $state<Documento | null>(null), activeSource = $state<Fuente | null>(null)
  let toast = $state(''), announcement = $state('')
  let loader: AbortController | undefined, sender: AbortController | undefined
  let toastTimer: ReturnType<typeof setTimeout> | undefined
  let disposed = false

  let selectedRoute = $derived(routes.find(route => route.id === selectedId))
  let turns = $derived(conversations[selectedId] ?? [])
  let pending = $derived(Object.values(conversations).some(thread => thread.some(turn => turn.estado === 'pending')))
  let documents = $derived(catalog?.documentos ?? [])
  let scope = $derived(documents.find(doc => doc.id === 'CAT-000'))
  let coverageTurn = $derived([...turns].reverse().find(turn => turn.cobertura)
    ?? [...turns].reverse().find(turn => turn.respuesta?.consta === false))
  let modalDocument = $derived(activeDocument ?? documents.find(doc => doc.id === activeSource?.documento_id) ?? null)

  const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'No se pudo completar la solicitud.'
  function notify(message: string) {
    toast = message
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => toast = '', 2800)
  }
  async function loadCatalog() {
    loader?.abort()
    const controller = new AbortController(); loader = controller
    routesLoading = true; documentsLoading = true; routesError = ''; documentsError = ''
    await Promise.all([
      obtenerRutas(controller.signal).then(data => {
        if (controller.signal.aborted) return
        routes = data.rutas
        if (!selectedId) selectedId = data.ruta_por_defecto
        saved = saved.filter(id => data.rutas.some(route => route.id === id))
      }).catch(error => { if (!controller.signal.aborted) routesError = errorMessage(error) })
        .finally(() => { if (!controller.signal.aborted) routesLoading = false }),
      obtenerDocumentos(controller.signal).then(data => { if (!controller.signal.aborted) catalog = data })
        .catch(error => { if (!controller.signal.aborted) documentsError = errorMessage(error) })
        .finally(() => { if (!controller.signal.aborted) documentsLoading = false }),
    ])
  }
  function saveRoute(id: string) {
    const exists = saved.includes(id)
    saved = exists ? saved.filter(item => item !== id) : [...saved, id]
    try { localStorage.setItem('rumbo-favorites', JSON.stringify(saved)) } catch { /* Favorites still work for this session. */ }
    notify(exists ? 'Ruta eliminada de tus guardadas.' : 'Ruta guardada para tu próximo viaje.')
  }
  function showSaved() { onlySaved = !onlySaved; window.location.hash = '/explorar' }
  function showSources(country: string) { documentSearch = country; window.location.hash = '/documentos' }
  function openDocument(doc: Documento) { activeSource = null; activeDocument = doc }
  function openSource(source: Fuente) { activeDocument = null; activeSource = source }
  function closeDocument() { activeSource = null; activeDocument = null }
  function chooseRoute(id: string) { if (routes.some(route => route.id === id)) selectedId = id }
  function clearConversation() {
    if (pending) return
    conversations[selectedId] = []
    announcement = 'Se ha iniciado una nueva conversación.'
  }
  async function executeTurn(key: string, turnId: string) {
    const thread = conversations[key]
    const index = thread.findIndex(turn => turn.id === turnId)
    if (index < 0) return
    const turn = thread[index]
    const history: Mensaje[] = thread.slice(0, index).filter(item => item.estado === 'done' && item.respuesta)
      .flatMap(item => [
        { rol: 'user' as const, contenido: item.pregunta },
        { rol: 'assistant' as const, contenido: item.respuesta!.respuesta.slice(0, 2000) },
      ]).slice(-20)
    turn.estado = 'pending'; turn.error = undefined
    const controller = new AbortController(); sender = controller
    try {
      const response = await preguntar(turn.pregunta, history, key, controller.signal)
      if (disposed) return
      turn.respuesta = response; turn.estado = 'done'
      announcement = response.consta ? `Respuesta recibida con ${response.fuentes.length} fuentes.` : 'No consta en los datos. Consulta el alcance de las fuentes.'
    } catch (error) {
      if (disposed) return
      turn.estado = 'error'; turn.error = errorMessage(error)
      announcement = 'No se pudo completar la consulta. Puedes reintentar.'
    }
  }
  function ask(question: string, coverage = false) {
    const text = question.trim()
    if (!selectedRoute || pending || !text) return
    if (text.length > 1000) { notify('La pregunta puede tener hasta 1.000 caracteres.'); return }
    const key = selectedId, id = crypto.randomUUID()
    if (!conversations[key]) conversations[key] = []
    conversations[key].push({ id, pregunta: text, estado: 'pending', cobertura: coverage })
    void executeTurn(key, id)
  }
  function retry(id: string) { if (!pending) void executeTurn(selectedId, id) }

  onMount(() => {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem('rumbo-favorites') ?? '[]')
      if (Array.isArray(stored)) saved = stored.filter((id): id is string => typeof id === 'string')
    } catch { /* Ignore invalid or unavailable local storage. */ }
    const navigate = () => {
      const next = readLocation(); view = next.view
      if (next.id) selectedId = next.id
      closeDocument()
      void tick().then(() => {
        window.scrollTo({ top: 0, behavior: 'instant' })
        document.getElementById('main-content')?.focus({ preventScroll: true })
      })
    }
    window.addEventListener('hashchange', navigate)
    void loadCatalog()
    return () => {
      disposed = true; loader?.abort(); sender?.abort(); clearTimeout(toastTimer)
      window.removeEventListener('hashchange', navigate)
    }
  })
</script>

<svelte:head><title>Rumbo · {pageNames[view]}</title><meta name="description" content="Explora rutas, conversa con un asistente que cita sus fuentes y consulta su biblioteca de documentos." /></svelte:head>
<a href="#main-content" class="skip" onclick={(event) => { event.preventDefault(); document.getElementById('main-content')?.focus() }}>Saltar al contenido</a>
<div class="topline"><div class="wrap"><span>Menos búsquedas. Más camino.</span><span>DATOS DE DEMOSTRACIÓN · Rutas y precios ficticios</span></div></div>
<header class="site-header"><div class="wrap header-inner"><a class="brand" href="#/explorar" aria-label="Rumbo, inicio"><Icon name="compass" size={33} />rumbo<span class="brand-dot">.</span></a>
  <nav class="nav" aria-label="Navegación principal"><a href="#/explorar" class:active={view === 'explorar'} aria-current={view === 'explorar' ? 'page' : undefined}>Explorar</a><a href={`#/ruta/${selectedId}`} class:active={view === 'ruta'} aria-current={view === 'ruta' ? 'page' : undefined}>Mi ruta</a><a href="#/chat" class:active={view === 'chat' || view === 'sin-datos'} aria-current={view === 'chat' || view === 'sin-datos' ? 'page' : undefined}>Asistente</a><a href="#/documentos" class:active={view === 'documentos'} aria-current={view === 'documentos' ? 'page' : undefined}>Documentos</a></nav>
  <div class="header-actions"><button class="saved-button" aria-label="Ver rutas guardadas" aria-pressed={onlySaved} onclick={showSaved}><Icon name="bookmark" size={16} /><span class="saved-text">Guardadas</span><span class="saved-count">{saved.length}</span></button><span class="avatar" aria-label="Tu perfil">TÚ</span></div>
</div></header>
<main id="main-content" tabindex="-1">
  {#if view === 'explorar'}<Explore {routes} loading={routesLoading} error={routesError} {saved} {onlySaved} onSave={saveRoute} onRetry={loadCatalog} onResetSaved={() => onlySaved = false} />
  {:else if view === 'ruta'}<RouteDetail route={selectedRoute} loading={routesLoading} error={routesError} saved={saved.includes(selectedId)} onSave={saveRoute} onAsk={() => window.location.hash = '/chat'} onSources={showSources} onRetry={loadCatalog} />
  {:else if view === 'chat'}<Chat route={selectedRoute} {routes} {turns} {pending} onAsk={ask} onRetry={retry} onSource={openSource} onClear={clearConversation} onChooseRoute={chooseRoute} />
  {:else if view === 'sin-datos'}<NoData route={selectedRoute} turn={coverageTurn} {scope} {pending} onAsk={() => ask('¿Cuántas rutas se hicieron el año pasado?', true)} onRetry={retry} onSource={openSource} onDocument={openDocument} />
  {:else if view === 'documentos'}<Documents {catalog} loading={documentsLoading} error={documentsError} bind:search={documentSearch} onRetry={loadCatalog} onDocument={openDocument} />
  {:else}<section class="screen"><div class="wrap"><div class="empty"><Icon name="compass" size={38} /><h1 class="page-title">Este camino no existe.</h1><p>Vuelve a las rutas para elegir tu próximo destino.</p><a class="button" href="#/explorar">Explorar rutas</a></div></div></section>{/if}
</main>
<footer class="footer"><div class="wrap"><a class="brand" href="#/explorar"><Icon name="compass" size={25} />rumbo<span class="brand-dot">.</span></a><p>Las mejores historias empiezan con una buena pregunta.<br />Datos de demostración · Sin reservas ni tarifas en directo.</p><a href="#/documentos">Conoce nuestras fuentes <span aria-hidden="true">↗</span></a></div></footer>
<DocumentDialog document={modalDocument} source={activeSource} onClose={closeDocument} />
<div class="toast" class:show={toast !== ''} role="status">{toast}</div>
<p class="sr-only" aria-live="polite">{announcement}</p>
