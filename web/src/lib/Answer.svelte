<script lang="ts">
  import type { Fuente, Respuesta } from './api'
  import Icon from './Icon.svelte'
  let { answer, onSource }: { answer: Respuesta; onSource: (source: Fuente) => void } = $props()
</script>

<div class="answer" data-consta={answer.consta}>
  <span class="assistant-avatar"><Icon name="spark" size={16} /></span>
  <div class="answer-body">
    <div class="answer-name">Rumbo</div>
    {#if !answer.consta}<span class="pill no-data-badge"><Icon name="info" size={12} />Sin datos suficientes</span>{/if}
    <p class:no-data-title={!answer.consta} class="answer-text">{answer.respuesta}</p>
    {#if !answer.consta}
      <div class="scope-box"><strong>La respuesta necesita un registro que la respalde.</strong>Consulta el alcance de las fuentes disponibles o pregunta por un itinerario, sus días o su presupuesto.</div>
    {/if}
    {#each answer.fuentes as source, index (source.fragmento_id)}
      <button class="citation" onclick={() => onSource(source)} aria-label={`Abrir fuente ${index + 1}: ${source.titulo}`}>
        <span class="citation-head"><Icon name="file" size={14} /><strong>[{index + 1}] {source.titulo}</strong><span class="tag">{source.tipo}</span></span>
        <blockquote>«{source.fragmento}»</blockquote>
        <span class="citation-foot">{source.documento_id} · {source.seccion} ↗</span>
      </button>
    {/each}
    {#if !answer.consta && answer.fuentes.length === 0}<p class="no-sources">No se ha encontrado un fragmento que justifique una respuesta.</p>{/if}
  </div>
</div>
