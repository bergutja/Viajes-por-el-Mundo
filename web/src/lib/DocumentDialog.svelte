<script lang="ts">
  import { tick } from 'svelte'
  import type { Documento, Fuente } from './api'
  import Icon from './Icon.svelte'
  let { document: doc, source, onClose }: {
    document: Documento | null; source: Fuente | null; onClose: () => void
  } = $props()
  let dialog: HTMLDialogElement
  let fragments = $derived(doc?.fragmentos ?? (source ? [{ id: source.fragmento_id, seccion: source.seccion, texto: source.fragmento }] : []))
  $effect(() => {
    if (!dialog) return
    if (doc || source) {
      if (!dialog.open) dialog.showModal()
      if (source) void tick().then(() => dialog.querySelector('[data-highlight="true"]')?.scrollIntoView({ block: 'nearest' }))
    } else if (dialog.open) dialog.close()
  })
</script>

<dialog bind:this={dialog} aria-labelledby="document-title" onclose={onClose}>
  <div class="modal-head"><div><span class="pill">{doc?.etiqueta ?? 'Fuente citada'}</span><h3 id="document-title">{doc?.titulo ?? source?.titulo ?? 'Documento'}</h3></div><button class="close" onclick={() => dialog.close()} aria-label="Cerrar documento"><Icon name="close" size={16} /></button></div>
  <div class="modal-body">
    <div class="modal-meta"><span>{doc?.id ?? source?.documento_id}</span>{#if doc}<span>{doc.tipo} · {doc.region}</span><span>Fecha de ejemplo: {doc.fecha}</span>{/if}</div>
    {#each fragments as fragment (fragment.id)}
      <section class:highlighted={source?.fragmento_id === fragment.id} data-highlight={source?.fragmento_id === fragment.id}>
        <h4>{fragment.seccion}{#if source?.fragmento_id === fragment.id}<span class="pill">Fragmento citado</span>{/if}</h4><blockquote>{fragment.texto}</blockquote><small class="fragment-id">{fragment.id}</small>
      </section>
    {/each}
    <p class="modal-disclaimer">Documento de demostración. Sus datos, fechas y presupuestos son ficticios y no representan ofertas de viaje verificadas.</p>
  </div>
  <div class="modal-actions"><button class="button secondary" onclick={() => dialog.close()}>Volver a la aplicación</button></div>
</dialog>
