<script setup lang="ts">
/** Phones: the menu bar, editing mode and view options in one sheet. */
import { phoneMenuEntries } from '@folioline/core/views';
import { computed } from 'vue';
import { useT, useUI } from './context';
import Popover from './controls/Popover.vue';
import MenuList from './MenuList.vue';

defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: [] }>();
const t = useT();
const { ui, state, snapshot, options } = useUI();
const entries = computed(() => {
  void state.value;
  void options.value;
  return phoneMenuEntries(ui, snapshot.value);
});
</script>

<template>
  <Popover :anchor="null" :open="open" :title="t('phone.menu')" role="presentation" test-id="phone-menu" @close="emit('close')">
    <MenuList :entries="entries" :label="t('phone.menu')" :auto-focus="false" @close="emit('close')" />
  </Popover>
</template>
