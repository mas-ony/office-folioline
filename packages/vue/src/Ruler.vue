<script setup lang="ts">
/** Horizontal ruler for the page holding the caret, with margin and indent markers. */
import { rulerUsesMetric, selectedParagraphs, setSectionMargins, updateParagraphs } from '@folioline/core/views';
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue';
import { useSnapshot, useT, useUI } from './context';

const TWIPS_PER_PX = 15;

type Handle = 'marginLeft' | 'marginRight' | 'firstLine' | 'hanging' | 'indentLeft' | 'indentRight';

interface Geometry {
  /** Page left edge relative to the ruler, in screen px. */
  x: number;
  zoom: number;
  pageW: number;
  marginLeft: number;
  marginRight: number;
  /** Paragraph indents in page px (left, right, first line offset relative to left). */
  left: number;
  right: number;
  first: number;
  sectionPos: number;
}

const t = useT();
const { editor, state } = useUI();
const host = ref<HTMLDivElement | null>(null);
const key = useSnapshot((s) => `${s.layoutVersion}:${s.zoom}:${s.version}`);
const tick = ref(0);
const drag = shallowRef<{ handle: Handle; value: number } | null>(null);
const metric = rulerUsesMetric();

// Draw again once the container exists (geometry is measured against it), and as the pages move.
const on = () => tick.value++;
onMounted(() => {
  on();
  editor.scrollEl.addEventListener('scroll', on, { passive: true });
  window.addEventListener('resize', on);
});
onUnmounted(() => {
  editor.scrollEl.removeEventListener('scroll', on);
  window.removeEventListener('resize', on);
});

function geometry(): Geometry | null {
  const r = editor.result;
  const el = host.value;
  if (!r || r.mode !== 'print' || !el || !r.pages.length) return null;
  const sel = editor.view.state.selection;
  const page = r.pages[editor.pageOfPos(sel.from)] ?? r.pages[0];
  const sec = r.sections[page.section];
  const canvas = editor.scrollEl.querySelector<HTMLElement>('.dx-canvas');
  if (!sec || !canvas) return null;
  const zoom = editor.zoom;
  const x = canvas.getBoundingClientRect().left + page.left * zoom - el.getBoundingClientRect().left;
  const para = selectedParagraphs(editor.view.state)[0]?.node;
  const ind = para ? editor.docx.styles.effectiveParagraph(para.attrs.styleId, { indent: para.attrs.indent ?? undefined }).indent ?? {} : {};
  const left = (ind.left ?? 0) / TWIPS_PER_PX;
  const right = (ind.right ?? 0) / TWIPS_PER_PX;
  const first = ((ind.firstLine ?? 0) - (ind.hanging ?? 0)) / TWIPS_PER_PX;
  return { x, zoom, pageW: sec.pageW, marginLeft: sec.marginLeft, marginRight: sec.marginRight, left, right, first, sectionPos: page.startPos };
}

/** What is drawn, measured again whenever the ruler would render. */
const model = computed(() => {
  void key.value;
  void tick.value;
  void state.value;
  const g = geometry();
  if (!g) return null;
  // Values while dragging.
  let { marginLeft, marginRight, left, right, first } = g;
  const d = drag.value;
  if (d) {
    if (d.handle === 'marginLeft') marginLeft = d.value;
    if (d.handle === 'marginRight') marginRight = d.value;
    if (d.handle === 'indentLeft') left = d.value;
    if (d.handle === 'hanging') {
      first = g.left + g.first - d.value;
      left = d.value;
    }
    if (d.handle === 'firstLine') first = d.value;
    if (d.handle === 'indentRight') right = d.value;
  }
  const z = g.zoom;
  const px = (v: number) => g.x + v * z;
  const unit = metric ? 96 / 2.54 : 96;
  const steps = metric ? 4 : 8;
  const ticks: { i: number; cls: string; left: number; label: number | null }[] = [];
  const count = Math.floor(g.pageW / (unit / steps));
  for (let i = 0; i <= count; i++) {
    const at = (i * unit) / steps;
    const major = i % steps === 0;
    const half = !major && i % (steps / 2) === 0;
    ticks.push({ i, cls: major ? 'fl-tick is-major' : half ? 'fl-tick is-half' : 'fl-tick', left: px(at), label: major && i > 0 ? i / steps : null });
  }
  const contentL = marginLeft;
  const contentR = g.pageW - marginRight;
  return { g, z, px, ticks, marginLeft, marginRight, left, right, first, contentL, contentR };
});

function onDown(handle: Handle, e: PointerEvent) {
  const geo = geometry();
  if (!geo || editor.readOnly) return;
  e.preventDefault();
  e.stopPropagation();
  const el = e.currentTarget as HTMLElement;
  el.setPointerCapture(e.pointerId);
  const box = host.value!.getBoundingClientRect();
  const snap = metric ? 2.5 / 2.54 * 96 / 10 * 2 : 96 / 16;
  const pageX = (clientX: number) => {
    const raw = (clientX - box.left - geo.x) / geo.zoom;
    return Math.round(raw / snap) * snap;
  };
  // Margins move by how far the grey margin area is dragged; markers follow the pointer.
  const startX = e.clientX;
  const dragged = (clientX: number) => Math.round((clientX - startX) / geo.zoom / snap) * snap;
  const valueAt = (clientX: number): number => {
    const p = pageX(clientX);
    const contentL = geo.marginLeft;
    const contentR = geo.pageW - geo.marginRight;
    switch (handle) {
      case 'marginLeft': return Math.max(0, Math.min(geo.marginLeft + dragged(clientX), contentR - 96));
      case 'marginRight': return Math.max(0, Math.min(geo.marginRight - dragged(clientX), geo.pageW - contentL - 96));
      case 'indentLeft':
      case 'hanging': return Math.max(-contentL, Math.min(p - contentL, contentR - contentL - geo.right - 24));
      case 'firstLine': return p - contentL - geo.left;
      case 'indentRight': return Math.max(-geo.marginRight, Math.min(contentR - p, contentR - contentL - geo.left - 24));
    }
  };
  const move = (ev: PointerEvent) => (drag.value = { handle, value: valueAt(ev.clientX) });
  const up = (ev: PointerEvent) => {
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerup', up);
    el.removeEventListener('pointercancel', up);
    drag.value = null;
    const v = valueAt(ev.clientX);
    const tw = Math.round(v * TWIPS_PER_PX);
    const view = editor.view;
    if (handle === 'marginLeft') setSectionMargins(view, { left: tw }, geo.sectionPos);
    else if (handle === 'marginRight') setSectionMargins(view, { right: tw }, geo.sectionPos);
    else {
      updateParagraphs(view, (a) => {
        const cur = { ...((a.indent as Record<string, number>) ?? {}) };
        if (handle === 'indentLeft' || handle === 'hanging') {
          const firstOffset = geo.first;
          cur.left = tw;
          // The first line keeps its position relative to the page while hanging moves.
          if (handle === 'hanging') {
            const firstAbs = geo.left + firstOffset;
            const off = firstAbs - v;
            delete cur.firstLine;
            delete cur.hanging;
            if (off > 0) cur.firstLine = Math.round(off * TWIPS_PER_PX);
            else if (off < 0) cur.hanging = Math.round(-off * TWIPS_PER_PX);
          }
        } else if (handle === 'firstLine') {
          delete cur.firstLine;
          delete cur.hanging;
          if (tw > 0) cur.firstLine = tw;
          else if (tw < 0) cur.hanging = -tw;
        } else if (handle === 'indentRight') cur.right = tw;
        return { ...a, indent: cur };
      }, true);
    }
    editor.focus();
  };
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  drag.value = { handle, value: valueAt(e.clientX) };
}
</script>

<template>
  <div ref="host" class="fl-ruler" data-testid="ruler" :aria-hidden="model ? undefined : 'true'" :role="model ? 'group' : undefined" :aria-label="model ? t('ruler.horizontal') : undefined">
    <template v-if="model">
      <div class="fl-ruler-page" :style="{ left: `${model.px(0)}px`, width: `${model.g.pageW * model.z}px` }" />
      <span v-for="k in model.ticks" :key="k.i" :class="k.cls" :style="{ left: `${k.left}px` }"><span v-if="k.label !== null" class="fl-tick-label">{{ k.label }}</span></span>
      <span class="fl-ruler-margin" role="slider" :aria-label="t('ruler.leftMargin')" :aria-valuenow="Math.round(model.marginLeft)" tabindex="-1" :style="{ left: `${model.px(0)}px`, width: `${model.marginLeft * model.z}px` }" @pointerdown="onDown('marginLeft', $event)" />
      <span class="fl-ruler-margin" role="slider" :aria-label="t('ruler.rightMargin')" :aria-valuenow="Math.round(model.marginRight)" tabindex="-1" :style="{ left: `${model.px(model.contentR)}px`, width: `${model.marginRight * model.z}px` }" @pointerdown="onDown('marginRight', $event)" />
      <span class="fl-indent fl-indent-first" role="slider" :aria-label="t('ruler.firstLine')" :aria-valuenow="Math.round(model.first)" tabindex="-1" :style="{ left: `${model.px(model.contentL + model.left + model.first)}px` }" @pointerdown="onDown('firstLine', $event)" />
      <span class="fl-indent fl-indent-hanging" role="slider" :aria-label="t('ruler.hanging')" :aria-valuenow="Math.round(model.left)" tabindex="-1" :style="{ left: `${model.px(model.contentL + model.left)}px` }" @pointerdown="onDown('hanging', $event)" />
      <span class="fl-indent fl-indent-left" role="slider" :aria-label="t('ruler.left')" :aria-valuenow="Math.round(model.left)" tabindex="-1" :style="{ left: `${model.px(model.contentL + model.left)}px` }" @pointerdown="onDown('indentLeft', $event)" />
      <span class="fl-indent fl-indent-right" role="slider" :aria-label="t('ruler.right')" :aria-valuenow="Math.round(model.right)" tabindex="-1" :style="{ left: `${model.px(model.contentR - model.right)}px` }" @pointerdown="onDown('indentRight', $event)" />
    </template>
  </div>
</template>
