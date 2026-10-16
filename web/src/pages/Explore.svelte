<script lang="ts">
  import { euros, normalizar, type Ruta } from '../lib/api'
  import Icon from '../lib/Icon.svelte'
  import { illustration } from '../lib/illustrations'
  let { routes, loading, error, saved, onlySaved, onSave, onRetry, onResetSaved }: {
    routes: Ruta[]; loading: boolean; error: string; saved: string[]; onlySaved: boolean
    onSave: (id: string) => void; onRetry: () => void; onResetSaved: () => void
  } = $props()
  let search = $state(''), continent = $state('all'), duration = $state('all'), budget = $state('all')
  const continents = ['Europa', 'Asia', 'América', 'África', 'Oceanía']
  let featured = $derived(routes.find(route => route.codigo === 'JP') ?? routes[0])
  let filtered = $derived(routes.filter(route =>
    (!onlySaved || saved.includes(route.id)) && (continent === 'all' || route.continente === continent)
    && (duration === 'all' || duration === 'short' && route.dias <= 8 || duration === 'medium' && route.dias >= 9 && route.dias <= 12 || duration === 'long' && route.dias > 12)
    && (budget === 'all' || route.precio <= Number(budget))
    && normalizar([route.pais, route.titulo, route.continente, ...route.etapas.flatMap(stage => [stage.ciudad, ...stage.lugares])].join(' ')).includes(normalizar(search))))
  function reset() { search = ''; continent = 'all'; duration = 'all'; budget = 'all'; onResetSaved() }
</script>

<section class="screen explore-screen"><div class="wrap">
  <div class="screen-label"><span class="number">01</span>Explorar · Encuentra tu próximo destino</div>
  <div class="hero"><div class="hero-copy"><div class="eyebrow">Para los que sienten curiosidad</div><h1>Hay un mundo<br />con <em>tu nombre.</em></h1><p>Rutas con lugares que merecen una pausa.<br />Y respuestas que siempre te dicen de dónde vienen.</p><a class="button light" href="#catalogo" onclick={(event) => { event.preventDefault(); document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' }) }}>Encuentra tu próxima ruta <Icon name="arrow" size={16} /></a></div>
    <div class="hero-art">{@html illustration(featured?.codigo ?? 'JP')}{#if featured}<span class="hero-destination">{featured.pais.toUpperCase()}</span><a class="hero-note" href={`#/ruta/${featured.id}`}><Icon name="compass" size={27} /><div><strong>{featured.titulo_completo}</strong><span>{featured.dias} días para mirar el mundo de otra forma</span></div><Icon name="arrow" size={18} /></a>{/if}</div>
  </div>
  <div id="catalogo" class="explore-toolbar">
    <div class="section-head"><div><h2 class="catalog-heading">¿Hacia dónde te lleva la curiosidad?</h2><p class="muted catalog-subtitle">{onlySaved ? 'Los caminos que has guardado para más adelante.' : 'Seis formas de empezar. Tú eliges el camino.'}</p></div><span class="pill outline"><Icon name="globe" size={13} />{new Set(routes.map(route => route.continente)).size} continentes</span></div>
    <div class="search-row"><label class="searchbox"><Icon name="search" size={17} /><input type="search" bind:value={search} placeholder="Busca un país, una ciudad o un lugar…" aria-label="Buscar rutas" /></label><select bind:value={duration} aria-label="Filtrar por duración"><option value="all">Cualquier duración</option><option value="short">Hasta 8 días</option><option value="medium">De 9 a 12 días</option><option value="long">Más de 12 días</option></select><select bind:value={budget} aria-label="Filtrar por presupuesto"><option value="all">Cualquier presupuesto</option><option value="1000">Hasta 1.000 €</option><option value="2000">Hasta 2.000 €</option><option value="3000">Hasta 3.000 €</option></select></div>
    <div class="filters"><div class="chips" aria-label="Filtrar por continente"><button class:active={continent === 'all'} class="chip" aria-pressed={continent === 'all'} onclick={() => continent = 'all'}>Todo el mundo</button>{#each continents as name}<button class:active={continent === name} class="chip" aria-pressed={continent === name} onclick={() => continent = name}>{name}</button>{/each}</div><span class="results-label" aria-live="polite">{filtered.length} rutas {onlySaved ? 'guardadas' : 'para descubrir'}</span></div>
    {#if loading}<div class="loading-state" role="status"><span class="thinking-dot"></span>Cargando rutas…</div>
    {:else if error}<div class="error-state" role="alert"><Icon name="info" size={22} /><h3>No hemos podido cargar las rutas.</h3><p>{error}</p><button class="button secondary" onclick={onRetry}>Reintentar</button></div>
    {:else}<div class="route-grid">{#each filtered as route (route.id)}
      <article class="route-card"><div class="card-image">{@html illustration(route.codigo)}<span class="pill"><Icon name="clock" size={12} />{route.dias} días</span><button class="bookmark" aria-label={`${saved.includes(route.id) ? 'Quitar de guardadas' : 'Guardar'}: ${route.pais}`} aria-pressed={saved.includes(route.id)} onclick={() => onSave(route.id)}><Icon name="bookmark" size={15} /></button></div><div class="card-body"><div class="card-meta">{route.continente} · {route.pais}</div><h3><a href={`#/ruta/${route.id}`}>{route.titulo}</a></h3><p class="route-stops">{route.etapas.map(stage => stage.ciudad).join(' → ')}</p><div class="card-bottom"><span class="price">{euros(route.precio)} <small>/ persona</small></span><a class="card-open" href={`#/ruta/${route.id}`} aria-label={`Ver ruta de ${route.pais}`}><Icon name="arrow" size={15} /></a></div></div></article>
    {:else}<div class="empty"><h3>{onlySaved ? 'Todavía no hay rutas en esta selección.' : 'No hay rutas con estos filtros.'}</h3><p>{onlySaved ? 'Pulsa el marcador de una ruta para guardarla.' : 'Prueba otro destino, duración o presupuesto.'}</p><button class="button secondary" onclick={reset}>Ver todas las rutas</button></div>{/each}</div>{/if}
    <p class="tiny-note"><Icon name="info" size={13} />Datos de demostración. Precios por persona, sin vuelos internacionales. No son ofertas de reserva.</p>
  </div>
</div></section>
