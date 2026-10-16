<script lang="ts">
  import type { Documento, Fuente, Ruta, Turno } from '../lib/api'
  import Icon from '../lib/Icon.svelte'
  import ChatTurn from '../lib/ChatTurn.svelte'
  let { route, turn, scope, pending, onAsk, onRetry, onSource, onDocument }: {
    route: Ruta | undefined; turn: Turno | undefined; scope: Documento | undefined; pending: boolean
    onAsk: () => void; onRetry: (id: string) => void; onSource: (source: Fuente) => void
    onDocument: (document: Documento) => void
  } = $props()
</script>

<section class="screen unknown-screen"><div class="wrap">
  <div class="screen-label"><span class="number">04</span>La misma conversación · Cuando faltan datos</div>
  <div class="section-head"><div><h1 class="page-title">También está bien decir «no lo sé».</h1><p class="subtitle">Una propuesta de viaje y un viaje realizado necesitan registros diferentes.</p></div><a class="text-link" href="#/chat">Volver a la conversación <Icon name="arrow" size={15} /></a></div>
  <div class="unknown-layout"><div class="unknown-chat"><div class="chat-topbar"><div class="assistant-identity"><span class="assistant-avatar"><Icon name="spark" size={21} /></span><div><strong>El asistente de Rumbo</strong><small>{route ? `Mi viaje a ${route.pais} · continuación` : 'Tu conversación'}</small></div></div><span class="pill outline">Alcance de las fuentes</span></div>
    <div class="chat-messages"><div class="chat-date">EL MISMO CONTEXTO DE TU CONVERSACIÓN</div>{#if turn}<ChatTurn {turn} {onSource} {onRetry} disabled={pending} />{:else}<div class="coverage-question"><Icon name="chat" size={28} /><h2>¿Cuántas rutas se hicieron el año pasado?</h2><p>Comprueba qué puede responder el asistente con los documentos disponibles.</p><button class="button" onclick={onAsk} disabled={pending || !route}><Icon name="spark" size={16} />Consultar al asistente</button></div>{/if}</div>
  </div><aside class="unknown-note"><Icon name="compass" size={28} /><h2>La confianza también se construye con límites.</h2><p>Una respuesta útil empieza por saber qué información está disponible.</p>{#if scope}<div class="scope-excerpt"><strong>{scope.titulo}</strong><p>{scope.fragmentos[0]?.texto}</p><button class="text-link" onclick={() => onDocument(scope)}>Ver registro de alcance <Icon name="arrow" size={14} /></button></div>{/if}<a href="#/documentos" class="text-link">Explorar la biblioteca <Icon name="arrow" size={15} /></a></aside></div>
</div></section>
