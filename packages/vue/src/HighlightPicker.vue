<script setup lang="ts">
/** Text highlight: No Color and Word's highlight colours. */
import { HIGHLIGHTS, keepFocus } from '@folioline/core/views';
import { useT } from './context';
import Swatch from './Swatch.vue';

defineProps<{ value: string | null; label: string }>();
const emit = defineEmits<{ pick: [name: string | null] }>();
const t = useT();
</script>

<template>
  <div class="fl-colors" role="group" :aria-label="label" data-testid="highlight-picker">
    <button type="button" class="fl-color-auto" @mousedown="keepFocus" @click="emit('pick', null)"><span class="fl-swatch is-none" aria-hidden="true" />{{ t('color.noColor') }}</button>
    <div class="fl-color-title">{{ t('color.highlightColors') }}</div>
    <div class="fl-color-grid is-highlight" role="group">
      <Swatch v-for="h in HIGHLIGHTS" :key="h.name" :hex="h.hex" :label="t(h.key)" :selected="value === h.name" @pick="emit('pick', h.name)" />
    </div>
  </div>
</template>
