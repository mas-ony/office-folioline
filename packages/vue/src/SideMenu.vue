<script setup lang="ts">
/** A submenu placed beside its item (on the other side when there is no room). */
import { placeSideMenu, pushLayer, topLayer } from '@folioline/core/views';
import { inject, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue';
import { SUBMENU_KEYS, useUI } from './context';

const props = defineProps<{ rect: DOMRect; label: string }>();
const emit = defineEmits<{ close: [] }>();

const { layer, state } = useUI();
const forward = inject(SUBMENU_KEYS, null);
const el = ref<HTMLElement | null>(null);
const pos = shallowRef<{ left: number; top: number } | null>(null);
const place = () => {
  if (el.value) pos.value = placeSideMenu(el.value, props.rect, state.value.rtl);
};
watch(() => [props.rect, state.value.rtl], place, { flush: 'post' });

let pop = () => {};
const key = (e: KeyboardEvent) => {
  if (topLayer() !== el.value) return;
  if (e.key === 'ArrowLeft' || e.key === 'Escape') {
    e.stopPropagation();
    e.preventDefault();
    emit('close');
  }
};
onMounted(() => {
  place();
  if (!el.value) return;
  pop = pushLayer(el.value);
  document.addEventListener('keydown', key, true);
});
onUnmounted(() => {
  pop();
  document.removeEventListener('keydown', key, true);
});
</script>

<template>
  <Teleport :to="layer">
    <div ref="el" class="fl-popover fl-submenu" role="presentation" :aria-label="label" :style="{ position: 'fixed', left: `${pos?.left ?? -9999}px`, top: `${pos?.top ?? -9999}px` }" @keydown="forward?.($event)">
      <slot />
    </div>
  </Teleport>
</template>
