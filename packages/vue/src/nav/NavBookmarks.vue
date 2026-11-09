<script setup lang="ts">
import { cx } from '@folioline/core/views';
import { Bookmark, Plus, Search } from '@lucide/vue';
import { computed, ref } from 'vue';
import { useSnapshot, useT, useUI } from '../context';
import { vValue } from '../directives';

const t = useT();
const { ui, editor, state } = useUI();
const version = useSnapshot((s) => s.version);
const ro = useSnapshot(() => editor.readOnly);
const q = ref('');
const all = computed(() => {
  void version.value;
  return editor.bookmarks();
});
const shown = computed(() => all.value.filter((b) => b.name.toLowerCase().includes(q.value.trim().toLowerCase())));
const selFrom = computed(() => {
  void version.value;
  return editor.view.state.selection.from;
});
const here = (b: { pos: number; text: string }) => selFrom.value >= b.pos && selFrom.value <= b.pos + b.text.length + 2;
const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && shown.value[0]) editor.goToBookmark(shown.value[0].name);
};
const go = (name: string) => {
  editor.goToBookmark(name);
  if (state.value.mobile) ui.setNavOpen(false);
};
</script>

<template>
  <div class="fl-nav-panel" role="tabpanel" :aria-label="t('nav.bookmarks')">
    <label class="fl-searchbox">
      <Search :size="15" aria-hidden="true" />
      <input v-value="q" type="search" role="searchbox" :aria-label="t('nav.searchBookmarks')" :placeholder="t('nav.searchBookmarks')" @input="q = ($event.target as HTMLInputElement).value" @keydown="onKey" />
    </label>
    <template v-if="all.length">
      <div v-if="q" class="fl-nav-meta">{{ t('nav.countFiltered', { shown: shown.length, total: all.length }) }}</div>
      <ul class="fl-nav-list" data-testid="nav-bookmarks">
        <li v-for="b in shown" :key="b.id">
          <button type="button" :class="cx('fl-nav-bookmark', here(b) && 'is-current')" :title="here(b) ? t('nav.atCaret') : b.text" @click="go(b.name)">
            <Bookmark :size="14" aria-hidden="true" />
            <span class="fl-nav-bookmark-name">{{ b.name }}</span>
            <span v-if="b.text" class="fl-nav-bookmark-text">{{ b.text }}</span>
          </button>
        </li>
      </ul>
      <p v-if="!shown.length" class="fl-nav-empty">{{ t('nav.noBookmarkMatches') }}</p>
    </template>
    <div v-else class="fl-nav-empty">
      <Bookmark :size="22" aria-hidden="true" />
      <p><b>{{ t('nav.noBookmarks') }}</b></p>
      <p>{{ t('nav.noBookmarksHint') }}</p>
    </div>
    <button v-if="!ro" type="button" class="fl-btn is-small fl-nav-add" data-testid="nav-add-bookmark" @click="ui.openModal('bookmark')">
      <Plus :size="14" /> {{ t('nav.addBookmark') }}
    </button>
  </div>
</template>
