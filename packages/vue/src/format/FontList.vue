<script setup lang="ts">
import { cx, fontGroups, fontStack, keepFocus } from '@folioline/core/views';
import { computed, ref } from 'vue';
import { useT, useUI } from '../context';
import { vFocus, vValue } from '../directives';

defineProps<{ value: string }>();
const emit = defineEmits<{ pick: [font: string] }>();
const t = useT();
const { editor } = useUI();
const q = ref('');
const docFonts = editor.documentFonts().filter(Boolean).sort((a, b) => a.localeCompare(b));
const groups = computed(() => fontGroups(t, docFonts, q.value));
const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && q.value.trim()) emit('pick', groups.value[0]?.fonts[0] ?? q.value.trim());
};
</script>

<template>
  <div class="fl-fontlist">
    <input v-value="q" v-focus type="search" class="fl-input fl-font-search" role="searchbox" :aria-label="t('toolbar.searchFonts')" :placeholder="t('toolbar.searchFonts')" @input="q = ($event.target as HTMLInputElement).value" @keydown="onKey" />
    <div class="fl-listbox" role="listbox" :aria-label="t('toolbar.fontFamilyTitle')">
      <div v-for="g in groups" :key="g.label" role="group" :aria-label="g.label">
        <div class="fl-listbox-heading">{{ g.label }}</div>
        <button v-for="f in g.fonts" :key="f" type="button" role="option" :aria-selected="f === value" :class="cx('fl-option', f === value && 'is-selected')" :style="{ fontFamily: fontStack(f) }" :data-testid="`font-${f}`" @mousedown="keepFocus" @click="emit('pick', f)">{{ f }}</button>
      </div>
      <div v-if="!groups.length" class="fl-empty-small">{{ t('toolbar.noFonts') }}</div>
    </div>
  </div>
</template>
