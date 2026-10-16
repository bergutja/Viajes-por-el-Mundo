<script lang="ts">
  import { iconPaths } from './icons'
  let { name, size = 20 }: { name: string; size?: number } = $props()
</script>

<svg class="icon" viewBox="0 0 24 24" width={size} height={size} style:width={`${size}px`} style:height={`${size}px`} aria-hidden="true">
  <!-- Only SVG paths authored in the visual specification, never API or user text. -->
  {@html iconPaths[name] ?? iconPaths.file}
</svg>
