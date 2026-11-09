<script setup lang="ts">
/** A border line drawn in a style (`line`) and width. */
import { sampleStroke } from '@folioline/core/views';
import { computed } from 'vue';

const props = withDefaults(defineProps<{ line: string; width?: number }>(), { width: 1 });
const stroke = computed(() => sampleStroke(props.line, props.width));
</script>

<template>
  <svg width="64" height="12" viewBox="0 0 64 12" aria-hidden="true">
    <path v-if="line === 'double'" d="M2 4h60M2 8h60" stroke="currentColor" stroke-width="1" />
    <path v-else-if="line === 'triple'" d="M2 3h60M2 6h60M2 9h60" stroke="currentColor" stroke-width="1" />
    <path v-else d="M2 6h60" stroke="currentColor" :stroke-width="stroke.width" :stroke-dasharray="stroke.dash" />
  </svg>
</template>
