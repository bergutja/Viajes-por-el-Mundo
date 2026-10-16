<script lang="ts">
  import { onMount } from 'svelte'

  type ConnectionStatus = 'loading' | 'online' | 'offline'
  let connection = $state<ConnectionStatus>('loading')
  let controller: AbortController | undefined

  async function checkConnection() {
    controller?.abort()
    controller = new AbortController()
    const currentController = controller
    const timeout = setTimeout(() => currentController.abort(), 5000)
    connection = 'loading'

    try {
      const response = await fetch('/api/health', {
        signal: currentController.signal,
        cache: 'no-store',
      })
      if (!response.ok) throw new Error('API unavailable')

      const data: { status?: string; service?: string } = await response.json()
      connection = data.status === 'ok' && data.service === 'rumbo-api' ? 'online' : 'offline'
    } catch {
      connection = 'offline'
    } finally {
      clearTimeout(timeout)
    }
  }

  onMount(() => {
    void checkConnection()
    return () => controller?.abort()
  })
</script>

<svelte:head>
  <title>Rumbo · Tu próximo viaje empieza aquí</title>
</svelte:head>

<header>
  <a class="brand" href="/" aria-label="Rumbo, inicio">
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" />
      <path d="m16 8-2.5 5.5L8 16l2.5-5.5L16 8Z" />
    </svg>
    rumbo<span>.</span>
  </a>
  <span class="local-label">ENTORNO LOCAL</span>
</header>

<main>
  <section class="intro" aria-labelledby="welcome-title">
    <p class="eyebrow">EL COMIENZO DE UN NUEVO VIAJE</p>
    <h1 id="welcome-title">El siguiente destino<br />empieza <em>aquí.</em></h1>
    <p class="description">
      La base de Rumbo ya está preparada. Explora el diseño de las rutas
      mientras damos forma a la aplicación.
    </p>
    <div class="actions">
      <a class="button primary" href="/api/maqueta" target="_blank" rel="noopener noreferrer">
        Abrir maqueta <span aria-hidden="true">↗</span>
      </a>
      <a class="button secondary" href="/api/docs" target="_blank" rel="noopener noreferrer">
        Documentación de la API
      </a>
    </div>
    <p class="caption">Diseño de referencia · Rutas y precios ficticios</p>
  </section>

  <aside class="connection-card" aria-labelledby="connection-title">
    <span class="card-symbol" aria-hidden="true">↗</span>
    <p class="eyebrow">TODO EMPIEZA POR CONECTAR</p>
    <h2 id="connection-title">Las dos partes,<br />en el mismo camino.</h2>
    <div class="service-row">
      <div><strong>Interfaz</strong><small>Svelte + TypeScript · Vite</small></div>
      <span class="status online"><span class="dot"></span>Lista</span>
    </div>
    <div class="service-row">
      <div><strong>Servidor</strong><small>Python · FastAPI</small></div>
      <span class:online={connection === 'online'} class:offline={connection === 'offline'} class="status" role="status">
        <span class="dot"></span>
        {connection === 'loading' ? 'Comprobando…' : connection === 'online' ? 'Conectado' : 'Sin conexión'}
      </span>
    </div>
    {#if connection === 'offline'}
      <p class="connection-help">Arranca la API Python en el puerto 8000 siguiendo el README y vuelve a comprobar la conexión.</p>
    {:else}
      <p class="connection-help">La comprobación pasa por <code>/api/health</code> a través del proxy de Vite.</p>
    {/if}
    <button class="button secondary verify" onclick={checkConnection} disabled={connection === 'loading'}>
      {connection === 'loading' ? 'Comprobando conexión…' : 'Comprobar conexión'}
    </button>
  </aside>
</main>

<footer><span>rumbo · Un proyecto para explorar el mundo.</span><span>Base de desarrollo · Sin reservas ni llamadas a IA</span></footer>
