<script lang="ts">
  import type { Fuente, Turno } from './api'
  import Answer from './Answer.svelte'
  import Icon from './Icon.svelte'
  let { turn, onSource, onRetry, disabled = false }: {
    turn: Turno; onSource: (source: Fuente) => void; onRetry: (id: string) => void; disabled?: boolean
  } = $props()
</script>

<article class="chat-turn" data-turn-id={turn.id}>
  <div class="question"><div class="bubble-user">{turn.pregunta}</div><span class="avatar" aria-label="Tú">TÚ</span></div>
  {#if turn.estado === 'pending'}
    <div class="answer pending-answer" role="status"><span class="assistant-avatar"><Icon name="spark" size={16} /></span><p><span class="thinking-dot"></span>Consultando las fuentes de tu viaje…</p></div>
  {:else if turn.estado === 'error'}
    <div class="turn-error" role="alert"><Icon name="info" size={18} /><div><strong>No se pudo completar la consulta.</strong><p>{turn.error}</p><button class="text-link" onclick={() => onRetry(turn.id)} disabled={disabled}>Reintentar <Icon name="arrow" size={14} /></button></div></div>
  {:else if turn.respuesta}
    <Answer answer={turn.respuesta} {onSource} />
  {/if}
</article>
