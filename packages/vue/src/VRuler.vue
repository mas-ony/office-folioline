<script setup lang="ts">
/** Vertical ruler for the page holding the caret, with the top and bottom margins. */
import { setSectionMargins } from '@folioline/core/views';
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue';
import { useSnapshot, useT, useUI } from './context';

const TWIPS_PER_PX = 15;

const t = useT();
const { editor, state } = useUI();
const host = ref<HTMLDivElement | null>(null);
const key = useSnapshot((s) => `${s.layoutVersion}:${s.zoom}:${s.version}`);
const tick = ref(0);
const drag = shallowRef<{ edge: 'top' | 'bottom'; value: number } | null>(null);
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

/** What is drawn, measured again whenever the ruler would render. */
const model = computed(() => {
  void key.value;
  void tick.value;
  void state.value;
  const r = editor.result;
  const el = host.value;
  const canvas = editor.scrollEl.querySelector<HTMLElement>('.dx-canvas');
  if (!r || r.mode !== 'print' || !el || !canvas || !r.pages.length) return null;
  const page = r.pages[editor.pageOfPos(editor.view.state.selection.from)] ?? r.pages[0];
  const sec = r.sections[page.section];
  const z = editor.zoom;
  const y0 = canvas.getBoundingClientRect().top + page.top * z - el.getBoundingClientRect().top;
  const d = drag.value;
  const top = d?.edge === 'top' ? d.value : page.bodyTop - page.top;
  const bottom = d?.edge === 'bottom' ? d.value : page.top + page.height - page.bodyBottom;
  const py = (v: number) => y0 + v * z;
  const steps = 8;
  const ticks: { i: number; cls: string; top: number; label: number | null }[] = [];
  const count = Math.floor(page.height / (96 / steps));
  for (let i = 0; i <= count; i++) {
    const major = i % steps === 0;
    const half = !major && i % (steps / 2) === 0;
    ticks.push({ i, cls: major ? 'fl-vtick is-major' : half ? 'fl-vtick is-half' : 'fl-vtick', top: py((i * 96) / steps), label: major && i > 0 ? i / steps : null });
  }
  return { page, sec, z, top, bottom, py, ticks };
});

function onDown(edge: 'top' | 'bottom', e: PointerEvent) {
  const m = model.value;
  if (!m || editor.readOnly || !m.sec) return;
  const { page, z } = m;
  e.preventDefault();
  const el = e.currentTarget as HTMLElement;
  el.setPointerCapture(e.pointerId);
  const startY = e.clientY;
  const start = edge === 'top' ? m.top : m.bottom;
  const snap = 96 / 16;
  const valueAt = (clientY: number) => {
    const d = ((clientY - startY) / z) * (edge === 'top' ? 1 : -1);
    return Math.max(0, Math.min(page.height / 2 - 48, Math.round((start + d) / snap) * snap));
  };
  const move = (ev: PointerEvent) => (drag.value = { edge, value: valueAt(ev.clientY) });
  const up = (ev: PointerEvent) => {
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerup', up);
    el.removeEventListener('pointercancel', up);
    drag.value = null;
    const tw = Math.round(valueAt(ev.clientY) * TWIPS_PER_PX);
    setSectionMargins(editor.view, edge === 'top' ? { top: tw } : { bottom: tw }, page.startPos);
    editor.focus();
  };
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  drag.value = { edge, value: start };
}
</script>

<template>
  <div ref="host" class="fl-vruler" :aria-hidden="model ? undefined : 'true'" :role="model ? 'group' : undefined" :aria-label="model ? t('ruler.vertical') : undefined" :data-testid="model ? 'vruler' : undefined">
    <template v-if="model">
      <div class="fl-vruler-page" :style="{ top: `${model.py(0)}px`, height: `${model.page.height * model.z}px` }" />
      <span v-for="k in model.ticks" :key="k.i" :class="k.cls" :style="{ top: `${k.top}px` }"><span v-if="k.label !== null" class="fl-vtick-label">{{ k.label }}</span></span>
      <span class="fl-vruler-margin" role="slider" :aria-label="t('ruler.topMargin')" :aria-valuenow="Math.round(model.top)" tabindex="-1" :style="{ top: `${model.py(0)}px`, height: `${model.top * model.z}px` }" @pointerdown="onDown('top', $event)" />
      <span class="fl-vruler-margin" role="slider" :aria-label="t('ruler.bottomMargin')" :aria-valuenow="Math.round(model.bottom)" tabindex="-1" :style="{ top: `${model.py(model.page.height - model.bottom)}px`, height: `${model.bottom * model.z}px` }" @pointerdown="onDown('bottom', $event)" />
    </template>
  </div>
</template>
