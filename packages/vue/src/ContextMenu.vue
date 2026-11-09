<script setup lang="ts">
/** The document's right-click menu. Phones keep the browser's own selection menu. */
import { contextMenuAt, contextMenuEntries } from '@folioline/core/views';
import { computed, onMounted, onUnmounted, shallowRef } from 'vue';
import Popover from './controls/Popover.vue';
import { useT, useUI } from './context';
import MenuList from './MenuList.vue';

const t = useT();
const { ui, state } = useUI();
const at = shallowRef<{ x: number; y: number } | null>(null);
const onContext = (e: MouseEvent) => {
  const point = contextMenuAt(ui, e);
  if (point) at.value = point;
};
onMounted(() => document.addEventListener('contextmenu', onContext));
onUnmounted(() => document.removeEventListener('contextmenu', onContext));
// Built when the menu renders (it follows the interface's state).
const entries = computed(() => {
  void state.value;
  void at.value;
  return contextMenuEntries(ui);
});
</script>

<template>
  <Popover v-if="at" :anchor="null" :at="at" open :sheet-on-mobile="false" role="presentation" :title="t('context.label')" test-id="context-menu" @close="at = null">
    <MenuList :entries="entries" :label="t('context.label')" @close="at = null" />
  </Popover>
</template>
