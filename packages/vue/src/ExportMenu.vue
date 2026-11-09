<script setup lang="ts">
/** Word document, PDF, Markdown, Print (and Share where the browser can share files). */
import { cx, exportEntries } from '@folioline/core/views';
import { ChevronDown, Download } from '@lucide/vue';
import { useT, useUI } from './context';
import MenuButton from './MenuButton.vue';

defineProps<{ compact?: boolean }>();
const t = useT();
const { ui } = useUI();
const entries = () => exportEntries(ui);
</script>

<template>
  <MenuButton :label="t('title.export')" :button-class="cx('fl-btn is-dark', compact && 'is-compact')" test-id="export-menu" :entries="entries" align="end" :menu-label="t('title.export')">
    <Download :size="16" />
    <span v-if="!compact">{{ t('title.export') }}</span>
    <ChevronDown :size="13" class="fl-caret" />
  </MenuButton>
</template>
