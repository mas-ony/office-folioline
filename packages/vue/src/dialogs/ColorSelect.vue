<script setup lang="ts">
/** A markup colour: its swatch and the list. */
import type { MessageKey } from '@folioline/core';
import { MARKUP_COLORS, type MarkupColor } from '@folioline/core/views';
import { computed } from 'vue';
import { useT } from '../context';
import { vValue } from '../directives';

const props = defineProps<{ label: string; value: string; special: string[]; colors: MarkupColor[] }>();
const emit = defineEmits<{ change: [value: string] }>();
const t = useT();
const background = computed(() => MARKUP_COLORS[props.value as MarkupColor] ?? (props.value === 'byAuthor' ? 'linear-gradient(135deg,#b53a2f 50%,#1f6fb2 50%)' : props.value === 'auto' ? '#202124' : 'transparent'));
</script>

<template>
  <span class="fl-color-select">
    <span class="fl-swatch is-small" :style="{ background }" aria-hidden="true" />
    <select v-value="value" class="fl-input" :aria-label="label" @change="emit('change', ($event.target as HTMLSelectElement).value)">
      <option v-for="s in special" :key="s" :value="s">{{ t(`track.v.${s}` as MessageKey) }}</option>
      <option v-for="c in colors" :key="c" :value="c">{{ t(`track.c.${c}` as MessageKey) }}</option>
    </select>
  </span>
</template>
