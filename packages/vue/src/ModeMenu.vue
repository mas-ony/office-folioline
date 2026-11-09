<script setup lang="ts">
/** Editing, Suggesting or Viewing. */
import { cx, MODE_ICONS, modeEntries } from '@folioline/core/views';
import { ChevronDown } from '@lucide/vue';
import { useSnapshot, useT, useUI } from './context';
import Icon from './Icon.vue';
import MenuButton from './MenuButton.vue';

defineProps<{ compact?: boolean }>();
const t = useT();
const { ui, store } = useUI();
const mode = useSnapshot((s) => s.editMode);
const entries = () => modeEntries(ui, store.getSnapshot());
</script>

<template>
  <MenuButton :label="t('mode.label')" :title="t('mode.label')" :button-class="cx('fl-mode-btn', compact && 'is-compact', `is-${mode}`)" test-id="mode-menu" :entries="entries" align="end" :menu-label="t('mode.label')">
    <Icon :name="MODE_ICONS[mode]" />
    <span v-if="!compact">{{ t(`mode.${mode}`) }}</span>
    <ChevronDown v-if="!compact" :size="13" class="fl-caret" />
  </MenuButton>
</template>
