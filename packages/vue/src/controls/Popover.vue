<script setup lang="ts">
/** An anchored panel on desktop (or at a point, for context menus), a bottom sheet on phones. */
import { blurWithin, cx, placePopover, type PopoverClosedBy, trackPopover } from '@folioline/core/views';
import { X } from '@lucide/vue';
import { computed, type CSSProperties, onMounted, onUpdated, ref, shallowRef, watch, watchPostEffect } from 'vue';
import { useUI } from '../context';

const props = withDefaults(defineProps<{
  anchor: HTMLElement | null;
  open: boolean;
  panelClass?: string;
  align?: 'start' | 'end' | 'center';
  /** Render as a bottom sheet on small screens. */
  sheetOnMobile?: boolean;
  title?: string;
  role?: string;
  testId?: string;
  /** Fixed point (context menus) instead of an anchor element. */
  at?: { x: number; y: number } | null;
}>(), { align: 'start', sheetOnMobile: true, role: 'dialog', at: null, panelClass: undefined, title: undefined, testId: undefined });
const emit = defineEmits<{ close: [by?: PopoverClosedBy] }>();

const { layer, state } = useUI();
const el = ref<HTMLElement | null>(null);
const pos = shallowRef<{ left: number; top: number; maxHeight: number } | null>(null);
const mobile = computed(() => state.value.mobile && props.sheetOnMobile);
const style = computed<CSSProperties>(() => (pos.value
  ? { position: 'fixed', left: `${pos.value.left}px`, top: `${pos.value.top}px`, maxHeight: `${pos.value.maxHeight}px` }
  : { position: 'fixed', visibility: 'hidden' }));

/** Below the anchor (or at the point), measured again whenever the content renders. */
function place() {
  if (!props.open || mobile.value || (!props.anchor && !props.at) || !el.value) return;
  const p = placePopover(el.value, props.anchor, props.at, props.align);
  const q = pos.value;
  if (!q || p.left !== q.left || p.top !== q.top || p.maxHeight !== q.maxHeight) pos.value = p;
}
onMounted(place);
onUpdated(place);
watch(() => [props.anchor, props.at, props.align], place, { flush: 'post' });

watchPostEffect((onCleanup) => {
  if (!props.open || mobile.value || (!props.anchor && !props.at)) return;
  window.addEventListener('resize', place);
  onCleanup(() => window.removeEventListener('resize', place));
});

watchPostEffect((onCleanup) => {
  if (!props.open) return;
  void mobile.value;
  onCleanup(trackPopover(el.value, () => props.anchor, (by) => emit('close', by)));
});
</script>

<template>
  <Teleport v-if="open" :to="layer">
    <div v-if="mobile" ref="el" class="fl-sheet-backdrop" @pointerdown.self="blurWithin(el); emit('close')">
      <div :class="cx('fl-sheet', panelClass)" :role="role" :aria-label="title" :data-testid="testId">
        <div class="fl-sheet-grip" aria-hidden="true" />
        <div v-if="title" class="fl-sheet-title">
          <span>{{ title }}</span>
          <button type="button" class="fl-icon-btn" aria-label="Close" @click="emit('close')"><X :size="18" /></button>
        </div>
        <div class="fl-sheet-body"><slot /></div>
      </div>
    </div>
    <div v-else ref="el" :class="cx('fl-popover', panelClass)" :style="style" :role="role" :aria-label="title" :data-testid="testId"><slot /></div>
  </Teleport>
</template>
