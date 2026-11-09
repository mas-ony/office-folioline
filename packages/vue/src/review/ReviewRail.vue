<script setup lang="ts">
/** Comment cards beside the pages, each next to the text it is about. */
import { keepFocus, reviewItems } from '@folioline/core/views';
import { MessageSquarePlus } from '@lucide/vue';
import { computed, onMounted, onUnmounted, onUpdated, ref, shallowRef } from 'vue';
import { useSnapshot, useT, useUI } from '../context';
import CommentCard from './CommentCard.vue';
import DraftCard from './DraftCard.vue';

const GAP = 10;
const RAIL_W = 300;

/** Vertical position of a document position in the scroll content, or null when not shown. */
function yOf(scroll: HTMLElement, view: { coordsAtPos(p: number): { top: number } }, pos: number): number | null {
  try {
    const c = view.coordsAtPos(pos);
    return c.top - scroll.getBoundingClientRect().top + scroll.scrollTop;
  } catch {
    return null;
  }
}

const t = useT();
const { ui, editor, state } = useUI();
const version = useSnapshot((s) => `${s.commentsVersion}:${s.layoutVersion}:${s.zoom}:${s.markup}:${s.hiddenReviewers.join('|')}`);
const activeComment = useSnapshot((s) => s.activeComment);
const selected = useSnapshot((s) => !!s.cursor?.textSelected && s.stream === 'body');
const mode = useSnapshot((s) => s.editMode);
const viewMode = useSnapshot((s) => s.viewMode);
const hidden = useSnapshot((s) => s.hiddenReviewers);
const railOpen = computed(() => state.value.railOpen);
const composerRange = computed(() => state.value.composerRange);
const heights = shallowRef<Record<string, number>>({});
// The window's size moves the column (not the cards).
const tick = ref(0);
const slots: Record<string, HTMLDivElement | null> = {};

const resize = () => tick.value++;
onMounted(() => window.addEventListener('resize', resize));
onUnmounted(() => window.removeEventListener('resize', resize));

const scroll = editor.scrollEl;
const items = computed(() => {
  void version.value;
  return railOpen.value ? reviewItems(editor, { hidden: hidden.value }).filter((i) => i.kind === 'comment') : [];
});

/** Where the rail column starts: right of the widest page. */
function railX(): number {
  void tick.value;
  const sizer = scroll.querySelector<HTMLElement>('.dx-sizer');
  const r = editor.result;
  const pageRight = r && r.mode === 'print' && r.pages.length ? Math.max(...r.pages.map((p) => p.left + p.width)) : 0;
  return (sizer?.offsetLeft ?? 0) + pageRight * editor.zoom + 16;
}

// Stack the cards: each as close to its anchor as the ones above allow; the active card
// sits at its anchor and pushes earlier cards up.
const layout = computed(() => {
  void version.value;
  const view = editor.view;
  const range = composerRange.value;
  const h = heights.value;
  const rows: { key: string; top: number }[] = [];
  const entries = items.value.map((it) => ({ key: it.key, anchor: yOf(scroll, view, it.pos) ?? 0, id: it.kind === 'comment' ? it.thread.id : '' }));
  if (range) entries.push({ key: 'draft', anchor: yOf(scroll, view, range.from) ?? 0, id: 'draft' });
  entries.sort((a, b) => a.anchor - b.anchor);
  let y = 0;
  for (const e of entries) {
    const top = Math.max(e.anchor - 4, y);
    rows.push({ key: e.key, top });
    y = top + (h[e.key] ?? 96) + GAP;
  }
  const activeIdx = entries.findIndex((e) => (range ? e.key === 'draft' : e.id === activeComment.value));
  if (activeIdx > 0) {
    const want = entries[activeIdx].anchor - 4;
    if (rows[activeIdx].top > want) {
      rows[activeIdx].top = want;
      for (let i = activeIdx - 1; i >= 0; i--) {
        const limit = rows[i + 1].top - GAP - (h[rows[i].key] ?? 96);
        if (rows[i].top > limit) rows[i].top = limit;
      }
      let yy = rows[activeIdx].top + (h[rows[activeIdx].key] ?? 96) + GAP;
      for (let i = activeIdx + 1; i < rows.length; i++) {
        rows[i].top = Math.max(entries[i].anchor - 4, yy);
        yy = rows[i].top + (h[rows[i].key] ?? 96) + GAP;
      }
    }
  }
  return new Map(rows.map((row) => [row.key, Math.max(0, row.top)]));
});

// After every render: the cards' heights, for the next layout.
const measure = () => {
  const next: Record<string, number> = {};
  let changed = false;
  for (const [key, el] of Object.entries(slots)) {
    if (!el) continue;
    next[key] = el.offsetHeight;
    if (Math.abs((heights.value[key] ?? 0) - next[key]) > 1) changed = true;
  }
  if (changed) heights.value = next;
};
onMounted(measure);
onUpdated(measure);

/** Where the comment button beside a selection goes (measured at each render, as the column is). */
function bubble(): number | null {
  if (!selected.value || composerRange.value || mode.value === 'viewing') return null;
  return yOf(scroll, editor.view, editor.view.state.selection.from);
}
const slot = (key: string) => (el: unknown) => {
  slots[key] = el as HTMLDivElement | null;
};
</script>

<template>
  <Teleport v-if="!state.mobile && viewMode === 'print'" :to="scroll">
    <div class="fl-rail" :style="{ left: `${railX()}px`, width: `${RAIL_W}px` }" :aria-label="t('review.label')" role="region" data-testid="review-rail">
      <button
        v-if="bubble() !== null"
        type="button"
        class="fl-rail-bubble"
        :style="{ top: `${bubble()! - 4}px`, left: '-8px' }"
        :aria-label="t('toolbar.comment')"
        :title="t('toolbar.comment')"
        data-testid="comment-bubble"
        @mousedown="keepFocus"
        @click="ui.openComposer()"
      >
        <MessageSquarePlus :size="17" />
      </button>
      <div v-for="it in items" :key="it.key" :ref="slot(it.key)" class="fl-rail-slot" :style="{ top: `${layout.get(it.key) ?? 0}px` }">
        <CommentCard v-if="it.kind === 'comment'" :item="it" variant="rail" :active="activeComment === it.thread.id" @activate="editor.selectComment(it.thread.id)" />
      </div>
      <div v-if="composerRange" :ref="slot('draft')" class="fl-rail-slot" :style="{ top: `${layout.get('draft') ?? 0}px` }">
        <DraftCard />
      </div>
    </div>
  </Teleport>
</template>
