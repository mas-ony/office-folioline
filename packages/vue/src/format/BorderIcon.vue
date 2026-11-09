<script setup lang="ts">
import { type BorderPreset, presetHasSide } from '@folioline/core/views';

const props = defineProps<{ preset: BorderPreset }>();
const on = (side: string) => presetHasSide(props.preset, side);
const s = (side: string) => (on(side) ? 'currentColor' : 'var(--fl-faint)');
</script>

<template>
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" fill="none" stroke-width="1.6">
    <path d="M2 2h14" :stroke="s('top')" /><path d="M2 16h14" :stroke="s('bottom')" /><path d="M2 2v14" :stroke="s('left')" /><path d="M16 2v14" :stroke="s('right')" />
    <path d="M2 9h14" :stroke="s('h')" :stroke-dasharray="on('h') ? undefined : '1 2'" /><path d="M9 2v14" :stroke="s('v')" :stroke-dasharray="on('v') ? undefined : '1 2'" />
  </svg>
</template>
