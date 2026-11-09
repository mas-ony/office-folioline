<script setup lang="ts">
import { cx } from '@folioline/core/views';
import { ChevronDown, ChevronUp, Search, X } from '@lucide/vue';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import Check from '../controls/Check.vue';
import { useSnapshot, useT, useUI } from '../context';
import { vValue } from '../directives';

const t = useT();
const { ui, editor, state } = useUI();
const search = useSnapshot((s) => s.search);
const ro = useSnapshot(() => editor.readOnly);
const query = ref(editor.searchResults()?.query ?? '');
const caseSensitive = ref(false);
const wholeWord = ref(false);
const replaceOn = ref(false);
const replaceWith = ref('');
const input = ref<HTMLInputElement | null>(null);
const list = ref<HTMLUListElement | null>(null);
onMounted(() => {
  input.value?.focus();
  input.value?.select();
});
// Searched a moment after typing stops. Enter and the buttons first run a search that is still
// waiting, so they never act on the previous query.
let pending: (() => void) | null = null;
watch([query, caseSensitive, wholeWord], ([q, c, w], _, onCleanup) => {
  const run = () => {
    clearTimeout(id);
    pending = null;
    editor.search({ query: q, caseSensitive: c, wholeWord: w, regex: false });
  };
  const id = setTimeout(run, 120);
  pending = run;
  onCleanup(() => {
    clearTimeout(id);
    pending = null;
  });
}, { immediate: true });
const step = (dir: 1 | -1) => {
  pending?.();
  editor.searchStep(dir);
};
const replaceOne = () => {
  pending?.();
  editor.replace(replaceWith.value);
};
const replaceAll = () => {
  pending?.();
  ui.toast(t('nav.replaced', { count: editor.replaceAll(replaceWith.value) }));
};
onUnmounted(() => editor.clearSearch());
const results = computed(() => {
  void search.value;
  return editor.searchResults()?.results ?? [];
});
const reveal = () => list.value?.querySelector('.is-current')?.scrollIntoView({ block: 'nearest' });
onMounted(reveal);
watch(() => search.value.index, reveal, { flush: 'post' });
const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    step(e.shiftKey ? -1 : 1);
  }
};
const clear = () => {
  query.value = '';
  input.value?.focus();
};
const pick = (i: number) => {
  editor.search({ index: i });
  if (state.value.mobile) ui.setNavOpen(false);
};
</script>

<template>
  <div class="fl-nav-panel" role="tabpanel" :aria-label="t('nav.find')">
    <label class="fl-searchbox">
      <Search :size="15" aria-hidden="true" />
      <input
        ref="input"
        v-value="query"
        type="search"
        role="searchbox"
        :aria-label="t('nav.searchDocument')"
        :placeholder="t('nav.searchDocument')"
        data-testid="find-input"
        @input="query = ($event.target as HTMLInputElement).value"
        @keydown="onKey"
      />
      <button v-if="query" type="button" class="fl-icon-btn is-small" :aria-label="t('nav.clearSearch')" @click="clear">
        <X :size="14" />
      </button>
    </label>
    <div class="fl-find-options" role="group" :aria-label="t('nav.searchOptions')">
      <Check :label="t('nav.matchCase')" :checked="caseSensitive" test-id="find-case" @change="(on) => (caseSensitive = on)" />
      <Check :label="t('nav.wholeWords')" :checked="wholeWord" test-id="find-whole" @change="(on) => (wholeWord = on)" />
    </div>
    <div class="fl-find-bar">
      <span class="fl-find-count" role="status" data-testid="find-count">{{ query ? (search.count ? t('nav.results', { count: search.count }) : t('nav.noResults')) : '' }}</span>
      <button type="button" class="fl-icon-btn" :aria-label="t('nav.previous')" :title="t('nav.previous')" :disabled="!search.count" data-testid="find-prev" @click="step(-1)"><ChevronUp :size="16" /></button>
      <button type="button" class="fl-icon-btn" :aria-label="t('nav.next')" :title="t('nav.next')" :disabled="!search.count" data-testid="find-next" @click="step(1)"><ChevronDown :size="16" /></button>
      <button v-if="!ro" type="button" :class="cx('fl-btn is-small is-quiet', replaceOn && 'is-active')" :aria-pressed="replaceOn" data-testid="find-replace-toggle" @click="replaceOn = !replaceOn">{{ t('nav.replace') }}</button>
    </div>
    <div v-if="replaceOn && !ro" class="fl-replace">
      <input v-value="replaceWith" class="fl-input" :aria-label="t('nav.replaceWith')" :placeholder="t('nav.replaceWith')" data-testid="replace-input" @input="replaceWith = ($event.target as HTMLInputElement).value" />
      <div class="fl-replace-actions">
        <button type="button" class="fl-btn is-small" :disabled="!search.count" data-testid="replace-one" @click="replaceOne">{{ t('nav.replaceOne') }}</button>
        <button type="button" class="fl-btn is-small" :disabled="!search.count" data-testid="replace-all" @click="replaceAll">{{ t('nav.replaceAll') }}</button>
      </div>
    </div>
    <ul ref="list" class="fl-nav-list fl-find-results" :aria-label="t('nav.resultsList')" data-testid="find-results">
      <li v-for="(r, i) in results.slice(0, 500)" :key="`${r.from}-${i}`">
        <button type="button" :class="cx('fl-find-result', i === search.index && 'is-current')" dir="auto" @click="pick(i)">{{ r.context.slice(0, r.matchStart) }}<mark>{{ r.context.slice(r.matchStart, r.matchEnd) }}</mark>{{ r.context.slice(r.matchEnd) }}</button>
      </li>
    </ul>
  </div>
</template>
