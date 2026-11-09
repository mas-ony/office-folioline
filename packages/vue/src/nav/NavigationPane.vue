<script setup lang="ts">
/** Headings, search and bookmarks beside the pages. */
import type { NavTab } from '@folioline/core';
import { cx, keepFocus } from '@folioline/core/views';
import { ArrowLeft } from '@lucide/vue';
import { useT, useUI } from '../context';
import NavBookmarks from './NavBookmarks.vue';
import NavFind from './NavFind.vue';
import NavHeadings from './NavHeadings.vue';

const TABS: { id: NavTab; key: 'nav.headings' | 'nav.find' | 'nav.bookmarks' }[] = [
  { id: 'headings', key: 'nav.headings' },
  { id: 'find', key: 'nav.find' },
  { id: 'bookmarks', key: 'nav.bookmarks' },
];

const t = useT();
const { ui, editor, state } = useUI();
const close = () => {
  ui.setNavOpen(false);
  editor.focus();
};
const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') close();
};
</script>

<template>
  <aside class="fl-nav" role="complementary" :aria-label="t('nav.title')" data-testid="nav-pane" @keydown="onKey">
    <div class="fl-nav-head">
      <button type="button" class="fl-icon-btn" :aria-label="t('nav.close')" :title="t('nav.close')" data-testid="nav-close" @click="close">
        <ArrowLeft :size="18" />
      </button>
      <h2>{{ t('nav.title') }}</h2>
    </div>
    <div class="fl-segmented" role="tablist" :aria-label="t('nav.title')">
      <button v-for="tab in TABS" :key="tab.id" type="button" role="tab" :aria-selected="state.navTab === tab.id" :class="cx(state.navTab === tab.id && 'is-on')" :data-testid="`nav-tab-${tab.id}`" @mousedown="keepFocus" @click="ui.setNavTab(tab.id)">
        {{ t(tab.key) }}
      </button>
    </div>
    <NavHeadings v-if="state.navTab === 'headings'" />
    <NavFind v-if="state.navTab === 'find'" />
    <NavBookmarks v-if="state.navTab === 'bookmarks'" />
  </aside>
</template>
