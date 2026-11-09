<script setup lang="ts">
/** Options of the header or footer being edited (opened from its bar). */
import { headerFooterEntries, headerFooterOptionsButton, type PopoverClosedBy } from '@folioline/core/views';
import { computed, onMounted, onUnmounted } from 'vue';
import Popover from './controls/Popover.vue';
import { useT, useUI } from './context';
import MenuList from './MenuList.vue';

const props = defineProps<{ at: { x: number; y: number }; pageIndex: number }>();
const emit = defineEmits<{ close: [] }>();
const t = useT();
const { ui, state } = useUI();
const entries = computed(() => {
  void state.value;
  return headerFooterEntries(ui, props.pageIndex);
});
// The bar's Options button, which closes the menu again; it tells that its menu is open.
const button = headerFooterOptionsButton(ui);
onMounted(() => button?.setAttribute('aria-expanded', 'true'));
onUnmounted(() => button?.setAttribute('aria-expanded', 'false'));
// Escape puts the cursor back in the header or footer (what was typed in a distance is dropped).
function close(by?: PopoverClosedBy) {
  emit('close');
  if (by === 'escape') ui.editor?.focus();
}
</script>

<template>
  <Popover :anchor="button" :at="at" open :title="t('hf.options')" role="presentation" test-id="hf-options" @close="close">
    <MenuList :entries="entries" :label="t('hf.options')" @close="emit('close')" />
  </Popover>
</template>
