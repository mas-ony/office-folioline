<script setup lang="ts">
/** The panel at the right: Changes (comments and tracked changes) and Settings. */
import type { SidePanelTab } from '@folioline/core';
import { cx, reviewItems } from '@folioline/core/views';
import { ListChecks, Settings2, X } from '@lucide/vue';
import { type Component, computed } from 'vue';
import ChangesTab from './ChangesTab.vue';
import { useSnapshot, useT, useUI } from './context';
import SettingsTab from './SettingsTab.vue';

const t = useT();
const { ui, editor, state } = useUI();
const version = useSnapshot((s) => `${s.commentsVersion}:${s.changesVersion}`);
const hidden = useSnapshot((s) => s.hiddenReviewers);
const count = computed(() => {
  void version.value;
  return reviewItems(editor, { hidden: hidden.value }).length;
});
const tabs = computed<{ id: SidePanelTab; label: string; icon: Component }[]>(() => [
  { id: 'changes', label: t('panel.changes'), icon: ListChecks },
  { id: 'settings', label: t('panel.settings'), icon: Settings2 },
]);
</script>

<template>
  <aside id="fl-side-panel" :class="cx('fl-panel', state.mobile && 'is-sheet')" :aria-label="t('panel.label')" data-testid="side-panel">
    <div class="fl-panel-head">
      <div class="fl-segmented is-tabs" role="tablist" :aria-label="t('panel.tabs')">
        <button v-for="tab in tabs" :key="tab.id" type="button" role="tab" :aria-selected="state.panelTab === tab.id" :class="cx(state.panelTab === tab.id && 'is-on')" :data-testid="`panel-tab-${tab.id}`" @click="ui.setPanelTab(tab.id)">
          <component :is="tab.icon" :size="15" />
          <span>{{ tab.label }}</span>
          <span v-if="tab.id === 'changes' && count > 0" class="fl-count" data-testid="changes-count">{{ count }}</span>
        </button>
      </div>
      <button v-if="state.mobile" type="button" class="fl-icon-btn" :aria-label="t('common.close')" @click="ui.setPanelOpen(false)"><X :size="18" /></button>
    </div>
    <div role="tabpanel" :aria-label="state.panelTab === 'changes' ? t('panel.changes') : t('panel.settings')" class="fl-panel-scroll">
      <ChangesTab v-if="state.panelTab === 'changes'" />
      <SettingsTab v-else />
    </div>
  </aside>
</template>
