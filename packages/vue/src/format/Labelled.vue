<script setup lang="ts">
/** A labelled control row inside "More"; in the bar, the control alone. */
import type { Variant } from './types';

defineProps<{ label: string; variant: Variant }>();
</script>

<template>
  <slot v-if="variant === 'bar'" />
  <div v-else class="fl-tool-labelled">
    <span class="fl-tool-label">{{ label }}</span>
    <span class="fl-tool-control"><slot /></span>
  </div>
</template>
