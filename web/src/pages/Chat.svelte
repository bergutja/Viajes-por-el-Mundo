<script lang="ts">
  import { tick } from 'svelte'
  import { euros, type Fuente, type Ruta, type Turno } from '../lib/api'
  import Icon from '../lib/Icon.svelte'
  import ChatTurn from '../lib/ChatTurn.svelte'
  let { route, routes, turns, pending, onAsk, onRetry, onSource, onClear, onChooseRoute }: {
    route: Ruta | undefined; routes: Ruta[]; turns: Turno[]; pending: boolean
    onAsk: (question: string) => void; onRetry: (id: string) => void
    onSource: (source: Fuente) => void; onClear: () => void; onChooseRoute: (id: string) => void
  } = $props()
  let draft = $state('')
  let transcript: HTMLDivElement
  const suggestions = ['¿Qué continente visitar?', '¿Cuántos días dura la ruta?', '¿Cuál es el coste de la ruta?', '¿Qué lugares se visitan?']
  $effect(() => {
    const revision = turns.map(turn => `${turn.id}:${turn.estado}`).join('|')
    if (revision) void tick().then(() => transcript?.scrollTo({ top: transcript.scrollHeight, behavior: 'smooth' }))
  })
  $effect(() => { route?.id; draft = '' })
  function submit(event: SubmitEvent) {
    event.preventDefault()
    if (pending || !route || !draft.trim()) return
    onAsk(draft.trim()); draft = ''
  }
</script>

<section class="screen chat-screen"><div class="wrap">
  <div class="screen-label"><span class="number">03</span>El asistente · Una conversación con fuentes</div>
  <div class="section-head"><div><h1 class="page-title">La curiosidad hace buenas preguntas.</h1><p class="subtitle">Habla de tu próximo viaje. Sigue el rastro de cada respuesta.</p></div><span class="pill outline"><Icon name="file" size={12} />Fuentes de la biblioteca</span></div>
  <div class="chat-shell"><aside class="chat-sidebar"><a class="brand" href="#/explorar"><Icon name="compass" size={25} />rumbo<span class="brand-dot">.</span></a><p>Tu compañero de viaje.</p><button class="button secondary" onclick={onClear} disabled={pending || turns.length === 0}><Icon name="chat" size={15} />Nueva conversación</button><div class="sidebar-label">Tu conversación</div><a class="conversation-link selected" href="#/chat"><Icon name="chat" size={15} />{route ? `Mi viaje a ${route.pais}` : 'Mi próximo viaje'}</a><a class="conversation-link" href="#/sin-datos"><Icon name="info" size={15} />Las rutas del año pasado</a><a class="conversation-link" href="#/documentos"><Icon name="folder" size={15} />Consultar documentos</a>
    {#if route}<div class="sidebar-route"><div class="eyebrow">En esta conversación</div><strong>{route.titulo_completo}</strong><p>{route.continente} · {route.dias} días<br />{euros(route.precio)} / persona</p><a class="text-link" href={`#/ruta/${route.id}`}>Ver itinerario <Icon name="arrow" size={14} /></a></div>{/if}
  </aside><div class="chat-main">
    <div class="chat-topbar"><div class="assistant-identity"><span class="assistant-avatar"><Icon name="spark" size={21} /></span><div><strong>El asistente de Rumbo</strong><small>{route ? `Mi viaje a ${route.pais}` : 'Selecciona una ruta para empezar'}</small></div></div><span class="pill"><Icon name="file" size={12} />Respuestas con fuentes</span></div>
    <label class="chat-route-selector"><span>Tu ruta</span><select aria-label="Ruta de la conversación" value={route?.id ?? ''} onchange={(event) => onChooseRoute(event.currentTarget.value)} disabled={routes.length === 0}>{#each routes as item}<option value={item.id}>{item.pais} · {item.titulo}</option>{/each}</select></label>
    <div class="chat-messages transcript" bind:this={transcript} role="region" aria-label="Conversación con Rumbo">
      {#if turns.length === 0}<div class="chat-welcome"><span class="assistant-avatar"><Icon name="spark" size={24} /></span><p class="eyebrow">UN BUEN VIAJE EMPIEZA CON UNA PREGUNTA</p><h2>¿Qué te gustaría descubrir?</h2><p>Pregunta por un continente, los días de tu ruta, los lugares que visitar o su presupuesto. Cada respuesta te mostrará sus fuentes.</p>{#if !route}<a class="text-link" href="#/explorar">Cargar y elegir una ruta <Icon name="arrow" size={14} /></a>{/if}</div>
      {:else}<div class="chat-date">TU VIAJE · {route?.pais.toUpperCase()}</div>{#each turns as turn (turn.id)}<ChatTurn {turn} {onSource} {onRetry} disabled={pending} />{/each}{/if}
    </div>
    <div class="composer-wrap"><div class="suggestions">{#each suggestions as question}<button class="suggestion" onclick={() => onAsk(question)} disabled={pending || !route}>{question}</button>{/each}<a class="suggestion" href="#/sin-datos">¿Y las rutas del año pasado?</a></div>
      <form class="composer" onsubmit={submit}><label class="sr-only" for="question-input">Tu pregunta sobre la ruta</label><input id="question-input" bind:value={draft} maxlength="1000" placeholder={route ? `Pregunta sobre tu ruta de ${route.pais}…` : 'Elige una ruta para empezar…'} autocomplete="off" required disabled={!route} /><button class="send" type="submit" aria-label="Enviar pregunta" disabled={pending || !route || !draft.trim()}><Icon name="send" size={17} /></button></form>
      <p class="composer-note">Rutas y presupuestos de demostración. Las fuentes permiten comprobar cada respuesta.</p>
    </div>
  </div></div>
</div></section>
