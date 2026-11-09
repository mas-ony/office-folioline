<script setup lang="ts">
import { markupEntries, markupLabels } from '@folioline/core/views';
import { ChevronDown, Eye, MessageSquarePlus, MessagesSquare } from '@lucide/vue';
import { computed } from 'vue';
import { useCommands, useSnapshot, useT, useUI } from '../context';
import MenuButton from '../MenuButton.vue';
import Tool from './Tool.vue';
import { ICON, useReadOnly, type Variant } from './types';

// Always in the bar (the bar gives every group its variant).
defineProps<{ variant?: Variant }>();
const t = useT();
const { ui, store, state } = useUI();
const cmd = useCommands();
const selected = useSnapshot((s) => !!s.cursor?.textSelected);
const ro = useReadOnly();
const markup = useSnapshot((s) => s.markup);
const labels = computed(() => markupLabels(t));
const entries = () => markupEntries(ui, store.getSnapshot());
const commentsOn = computed(() => (state.value.mobile ? state.value.panelOpen : state.value.railOpen));
const toggle = () => {
  const { mobile, panelOpen, railOpen } = state.value;
  if (mobile) {
    ui.setPanelTab('changes');
    ui.setPanelOpen(!panelOpen);
    return;
  }
  // The cards beside the pages repeat the panel's list; without room for both, the panel closes.
  if (!railOpen && panelOpen && window.innerWidth < 1600) ui.setPanelOpen(false);
  ui.setRailOpen(!railOpen);
};
</script>

<template>
  <Tool variant="bar" :label="t('toolbar.comment')" :title="selected ? t('toolbar.comment') : t('review.selectFirst')" :disabled="ro || !selected" test-id="tb-comment" data-slot="review.comment" @click="cmd.comment()"><MessageSquarePlus :size="ICON" /></Tool>
  <MenuButton :label="labels[markup]" :title="t('toolbar.markup', { mode: labels[markup] })" button-class="fl-tool fl-tool-drop" test-id="tb-markup" :entries="entries" :menu-label="t('menu.displayForReview')">
    <Eye :size="ICON" />
    <ChevronDown :size="12" class="fl-caret" />
  </MenuButton>
  <Tool variant="bar" :label="t('toolbar.showComments')" :active="commentsOn" test-id="tb-show-comments" data-slot="review.showComments" @click="toggle"><MessagesSquare :size="ICON" /></Tool>
</template>
