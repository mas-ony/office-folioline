<script setup lang="ts">
/** The formatting toolbar: groups that fit the bar, the rest in More (phones: a scrolling row). */
import type { MessageKey } from '@folioline/core';
import { computed, markRaw, onMounted, onUnmounted, ref, watch } from 'vue';
import { useSnapshot, useT, useUI } from './context';
import AlignGroup from './format/AlignGroup.vue';
import FontGroup from './format/FontGroup.vue';
import FormatGroup from './format/FormatGroup.vue';
import FormatMore from './format/FormatMore.vue';
import HistoryGroup from './format/HistoryGroup.vue';
import ImageGroup from './format/ImageGroup.vue';
import ListGroup from './format/ListGroup.vue';
import ReviewGroup from './format/ReviewGroup.vue';
import ScriptGroup from './format/ScriptGroup.vue';
import StyleGroup from './format/StyleGroup.vue';
import TableGroup from './format/TableGroup.vue';
import TextGroup from './format/TextGroup.vue';
import type { Group } from './format/types';

const SEP = 13;
const MORE = 40;
const PAD = 16;

/** Order of the groups in the bar. */
const ORDER = ['history', 'styles', 'font', 'text', 'script', 'alignment', 'lists', 'format', 'table', 'image', 'review'];
/** Groups move into More in this order as the bar gets narrower. */
const OVERFLOW = ['format', 'lists', 'script', 'image', 'table', 'alignment', 'text', 'font', 'styles'];
/** Order of the sections inside More (contextual groups first, pictures last). */
const MORE_ORDER = ['table', 'styles', 'font', 'text', 'script', 'alignment', 'lists', 'format', 'image'];
/** Phones: the scrolling row starts with the tools used most while typing. */
const PHONE_ORDER = ['text', 'lists', 'alignment', 'styles', 'font', 'script', 'format', 'table', 'image'];

const group = (id: string, title: MessageKey, width: number, comp: Group['comp']): Group => ({ id, title, width, comp: markRaw(comp) });
const GROUPS = {
  history: group('history', 'toolbar.undo', 72, HistoryGroup),
  styles: group('styles', 'toolbar.styles', 136, StyleGroup),
  font: group('font', 'toolbar.font', 270, FontGroup),
  text: group('text', 'toolbar.textFormatting', 262, TextGroup),
  script: group('script', 'toolbar.script', 68, ScriptGroup),
  alignment: group('alignment', 'toolbar.alignment', 48, AlignGroup),
  lists: group('lists', 'toolbar.lists', 184, ListGroup),
  format: group('format', 'toolbar.format', 68, FormatGroup),
  table: group('table', 'toolbar.table', 330, TableGroup),
  image: group('image', 'toolbar.image', 196, ImageGroup),
  review: group('review', 'review.label', 124, ReviewGroup),
};

const t = useT();
const { state } = useUI();
const inTable = useSnapshot((s) => !!s.cursor?.inTable);
const image = useSnapshot((s) => !!s.cursor?.imageSelected);
const dock = ref<HTMLDivElement | null>(null);
const width = ref(1200);
const moreOpen = ref(false);
// A dialog closes the More panel, which would otherwise stay above it (often one of its tools opened it).
watch(() => state.value.modal, (modal) => {
  if (modal) moreOpen.value = false;
});

let observer: ResizeObserver | undefined;
onMounted(() => {
  const el = dock.value;
  if (!el || typeof ResizeObserver === 'undefined') return;
  // Room for the bar: the dock without its padding.
  const measure = () => {
    const cs = getComputedStyle(el);
    width.value = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  };
  observer = new ResizeObserver(measure);
  observer.observe(el);
  measure();
});
onUnmounted(() => observer?.disconnect());

const layout = computed(() => {
  const mobile = state.value.mobile;
  const present = (id: string) => (id === 'table' ? inTable.value : id === 'image' ? image.value : true);
  const groups = ORDER.filter(present).map((id) => GROUPS[id as keyof typeof GROUPS]);
  const find = (id: string) => groups.find((g) => g.id === id);

  // Desktop: drop groups in overflow order until the rest fits.
  const hidden = new Set<string>();
  if (!mobile) {
    const total = (gs: Group[]) => gs.reduce((w, g) => w + g.width, 0) + SEP * Math.max(0, gs.length - 1) + PAD;
    let shown = groups;
    for (const id of OVERFLOW) {
      if (total(shown) + (hidden.size ? MORE : 0) <= width.value) break;
      if (!shown.some((g) => g.id === id)) continue;
      hidden.add(id);
      shown = shown.filter((g) => g.id !== id);
    }
  }
  const ok = (g: Group | undefined): g is Group => !!g;
  const bar = mobile ? PHONE_ORDER.map(find).filter(ok) : groups.filter((g) => !hidden.has(g.id));
  const more = mobile ? MORE_ORDER.map(find).filter(ok) : MORE_ORDER.map((id) => (hidden.has(id) ? find(id) : undefined)).filter(ok);
  return { mobile, bar, more, overflow: hidden.size > 0 };
});
</script>

<template>
  <div ref="dock" :class="layout.mobile ? 'fl-dock is-mobile' : 'fl-dock'">
    <div v-if="layout.mobile" class="fl-formatbar is-mobile" role="toolbar" :aria-label="t('toolbar.label')" data-testid="formatbar">
      <div class="fl-tool-group is-fixed"><HistoryGroup variant="bar" /></div>
      <div class="fl-formatbar-scroll">
        <template v-for="(g, i) in layout.bar" :key="g.id">
          <span v-if="i > 0" class="fl-tool-sep" role="separator" aria-orientation="vertical" />
          <div class="fl-tool-group" :data-group="g.id"><component :is="g.comp" variant="bar" /></div>
        </template>
      </div>
      <div class="fl-tool-group is-fixed">
        <ReviewGroup />
        <FormatMore v-if="layout.more.length > 0" :groups="layout.more" :open="moreOpen" @toggle="moreOpen = !moreOpen" @close="moreOpen = false" />
      </div>
    </div>
    <div v-else class="fl-formatbar" role="toolbar" :aria-label="t('toolbar.label')" data-testid="formatbar" :data-overflow="layout.overflow ? 'true' : undefined">
      <template v-for="(g, i) in layout.bar" :key="g.id">
        <span v-if="i > 0" class="fl-tool-sep" role="separator" aria-orientation="vertical" />
        <div class="fl-tool-group" :data-group="g.id"><component :is="g.comp" variant="bar" /></div>
      </template>
      <FormatMore v-if="layout.more.length > 0" :groups="layout.more" :open="moreOpen" @toggle="moreOpen = !moreOpen" @close="moreOpen = false" />
    </div>
  </div>
</template>
