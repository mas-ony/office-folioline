<script setup lang="ts">
/** How insertions, deletions or moves are marked: the style, its colour and the background. */
import type { MessageKey } from '@folioline/core';
import { MARKUP_BACK_COLORS, MARKUP_TEXT_COLORS, type RevisionMarkup } from '@folioline/core/views';
import { useT } from '../context';
import { vValue } from '../directives';
import ColorSelect from './ColorSelect.vue';

type Kind = 'insertions' | 'deletions' | 'movedFrom' | 'movedTo';
defineProps<{ kind: Kind; name: MessageKey; styles: string[]; markup: RevisionMarkup }>();
const emit = defineEmits<{ set: [key: keyof RevisionMarkup, value: string] }>();
const t = useT();
</script>

<template>
  <div class="fl-track-row">
    <label :for="`to-${kind}`">{{ t(name) }}</label>
    <select :id="`to-${kind}`" v-value="markup[kind]" class="fl-input" :data-testid="`to-${kind}`" @change="emit('set', kind, ($event.target as HTMLSelectElement).value)">
      <option v-for="s in styles" :key="s" :value="s">{{ t(`track.v.${s}` as MessageKey) }}</option>
    </select>
    <ColorSelect :label="t('track.color', { name: t(name) })" :value="markup[`${kind}Color`]" :special="['byAuthor']" :colors="MARKUP_TEXT_COLORS" @change="(v) => emit('set', `${kind}Color`, v)" />
  </div>
  <div class="fl-track-row is-sub">
    <label>{{ t('track.background', { name: t(name) }) }}</label>
    <ColorSelect :label="t('track.background', { name: t(name) })" :value="markup[`${kind}Background`]" :special="['none']" :colors="MARKUP_BACK_COLORS" @change="(v) => emit('set', `${kind}Background`, v)" />
  </div>
</template>
