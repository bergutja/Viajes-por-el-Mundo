<script lang="ts">
  import { euros, type Ruta } from '../lib/api'
  import Icon from '../lib/Icon.svelte'
  import { illustration } from '../lib/illustrations'
  let { route, loading, error, saved, onSave, onAsk, onSources, onRetry }: {
    route: Ruta | undefined; loading: boolean; error: string; saved: boolean
    onSave: (id: string) => void; onAsk: () => void; onSources: (country: string) => void; onRetry: () => void
  } = $props()
</script>

<section class="screen detail-screen"><div class="wrap">
  <div class="screen-label"><span class="number">02</span>La ruta · Cada etapa cuenta</div>
  {#if loading}<div class="loading-state" role="status">Cargando el itinerario…</div>
  {:else if error}<div class="error-state" role="alert"><h2>No hemos podido cargar esta ruta.</h2><p>{error}</p><button class="button secondary" onclick={onRetry}>Reintentar</button></div>
  {:else if !route}<div class="empty"><h2>No encontramos esta ruta.</h2><p>Elige uno de los itinerarios disponibles.</p><a class="button" href="#/explorar">Explorar rutas</a></div>
  {:else}
    <div class="breadcrumb"><a href="#/explorar">Explorar rutas</a><Icon name="chevron" size={12} /><span>{route.continente}</span><Icon name="chevron" size={12} /><span>{route.pais}</span></div>
    <div class="detail-title"><div><span class="pill">{route.categoria}</span><h1 class="detail-heading">{route.titulo_completo}</h1><p class="subtitle">{route.descripcion}</p></div><button class="button secondary" aria-pressed={saved} onclick={() => onSave(route!.id)}><Icon name="bookmark" size={17} /><span>{saved ? 'Ruta guardada' : 'Guardar ruta'}</span></button></div>
    <div class="trip-stats"><span><Icon name="clock" size={16} />{route.dias} días / {route.noches} noches</span><span><Icon name="pin" size={16} />{route.etapas.length} etapas</span><span><Icon name="train" size={16} />{route.transporte}</span><span><Icon name="leaf" size={16} />{route.temporada}</span></div>
    <div class="detail-layout"><div><div class="route-banner">{@html illustration(route.codigo)}<span class="pill"><Icon name="leaf" size={13} />{route.etiqueta}</span></div><div class="itinerary-heading"><h2>Un camino, muchas historias</h2><small>{route.etapas.length} etapas · {route.dias} días</small></div><ol class="timeline">{#each route.etapas as stage, index}<li class="stage"><span class="stage-number">{index + 1}</span><div class="days">{stage.dias === 1 ? 'Día' : 'Días'} {stage.rango}</div><h3>{stage.ciudad}</h3><p>{stage.descripcion}</p><div class="place-tags">{#each stage.lugares as place}<span>{place}</span>{/each}</div><div class="transfer"><Icon name="arrow" size={12} />{stage.traslado}</div></li>{/each}</ol></div>
    <aside><div class="budget"><div class="eyebrow">Tu presupuesto orientativo</div><div class="budget-total">{euros(route.precio)}</div><p class="budget-sub">por persona · habitación doble compartida</p><ul>{#each route.presupuesto as item, index}<li><span>{item.concepto}{index === 0 ? ` · ${route.noches} noches` : ''}</span><strong>{euros(item.importe)}</strong></li>{/each}</ul><p class="budget-note">Incluye alojamiento, transporte en destino, comidas, visitas y un margen para imprevistos.<br /><strong>No incluye vuelos internacionales ni seguro.</strong></p><button class="button" onclick={onAsk}><Icon name="spark" size={16} />Pregúntale a Rumbo</button><p class="budget-note centered">Estimación ficticia. No es una cotización.</p></div><div class="source-summary"><h3><Icon name="file" size={15} />Una ruta con contexto</h3><p>Consulta el itinerario y el registro de presupuesto utilizados en esta propuesta.</p><button class="text-link" onclick={() => onSources(route!.pais)}>Ver las fuentes <Icon name="arrow" size={15} /></button></div></aside></div>
  {/if}
</div></section>
