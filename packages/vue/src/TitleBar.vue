<script setup lang="ts">
/** The bar at the top: name, menus, editing mode, Open, New, Export and the side panel. */
import { cx } from '@folioline/core/views';
import { FilePlusCorner, FolderOpen, Menu as MenuIcon, PanelRightClose, PanelRightOpen } from '@lucide/vue';
import { ref } from 'vue';
import AppIcon from './AppIcon.vue';
import { useCommands, useT, useUI } from './context';
import DocumentName from './DocumentName.vue';
import ExportMenu from './ExportMenu.vue';
import MenuBar from './MenuBar.vue';
import ModeMenu from './ModeMenu.vue';
import People from './People.vue';
import PhoneMenu from './PhoneMenu.vue';

const t = useT();
const { ui, state } = useUI();
const cmd = useCommands();
const phoneMenu = ref(false);
</script>

<template>
  <header class="fl-titlebar" data-testid="titlebar">
    <div class="fl-brand" :aria-label="t('app.name')">
      <AppIcon />
      <span v-if="!state.mobile" class="fl-brand-name">{{ t('app.name') }}</span>
    </div>
    <DocumentName />
    <MenuBar v-if="!state.mobile" />
    <div class="fl-title-actions">
      <People />
      <ModeMenu v-if="!state.mobile" />
      <span v-if="!state.mobile" class="fl-title-divider" aria-hidden="true" />
      <template v-if="state.mobile">
        <button type="button" class="fl-icon-btn" :aria-label="t('title.menu')" :title="t('title.menu')" aria-haspopup="menu" :aria-expanded="phoneMenu" data-testid="phone-menu-btn" @click="phoneMenu = true">
          <MenuIcon :size="19" />
        </button>
        <PhoneMenu :open="phoneMenu" @close="phoneMenu = false" />
      </template>
      <template v-else>
        <button type="button" class="fl-btn is-quiet" :title="t('title.openTitle')" data-testid="open-btn" @click="cmd.open()">
          <FolderOpen :size="16" />
          <span>{{ t('title.open') }}</span>
        </button>
        <button type="button" class="fl-btn is-quiet" :title="t('title.newTitle')" data-testid="new-btn" @click="cmd.newDocument()">
          <FilePlusCorner :size="16" />
          <span>{{ t('title.new') }}</span>
        </button>
      </template>
      <ExportMenu :compact="state.mobile" />
      <button
        type="button"
        :class="cx('fl-icon-btn fl-panel-toggle', state.panelOpen && 'is-on')"
        :aria-label="state.panelOpen ? t('title.collapsePanel') : t('title.openPanel')"
        :title="state.panelOpen ? t('title.collapsePanel') : t('title.openPanelTitle')"
        :aria-expanded="state.panelOpen"
        aria-controls="fl-side-panel"
        data-testid="panel-toggle"
        @click="ui.setPanelOpen(!state.panelOpen)"
      >
        <PanelRightClose v-if="state.panelOpen" :size="18" />
        <PanelRightOpen v-else :size="18" />
      </button>
    </div>
  </header>
</template>
