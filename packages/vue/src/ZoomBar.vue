<script setup lang="ts">
/** Zoom out, zoom level menu (Automatic, Fit width, fixed levels) and zoom in. */
import { keepFocus, zoomEntries } from '@folioline/core/views';
import { ChevronDown, Minus, Plus } from '@lucide/vue';
import { computed } from 'vue';
import { useSnapshot, useT, useUI } from './context';
import MenuButton from './MenuButton.vue';

const t = useT();
const { ui, editor, store } = useUI();
const zoom = useSnapshot((s) => s.zoom);
const viewMode = useSnapshot((s) => s.viewMode);
const pct = computed(() => Math.round(zoom.value * 100));
const entries = () => zoomEntries(ui, store.getSnapshot());
</script>

<template>
  <div v-if="viewMode === 'print'" class="fl-zoombar" role="group" :aria-label="t('zoom.label')" data-testid="zoombar">
    <button type="button" class="fl-zoom-btn" :aria-label="t('zoom.out')" :title="t('zoom.out')" data-testid="zoom-out" @mousedown="keepFocus" @click="editor.zoomOut()"><Minus :size="14" /></button>
    <MenuButton :label="t('zoom.levelTitle', { percent: pct })" button-class="fl-zoom-level" test-id="zoom-level" :entries="entries" align="center" :menu-label="t('zoom.label')">
      <span>{{ pct }}%</span>
      <ChevronDown :size="11" class="fl-caret" />
    </MenuButton>
    <button type="button" class="fl-zoom-btn" :aria-label="t('zoom.in')" :title="t('zoom.in')" data-testid="zoom-in" @mousedown="keepFocus" @click="editor.zoomIn()"><Plus :size="14" /></button>
  </div>
</template>
