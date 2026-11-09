<script setup lang="ts">
import { bookmarkNameProblem, bookmarkProblemKey, cx, suggestedBookmarkName } from '@folioline/core/views';
import { computed, ref } from 'vue';
import Check from '../controls/Check.vue';
import Modal from '../controls/Modal.vue';
import Row from '../controls/Row.vue';
import { useT, useUI } from '../context';
import { vChecked, vValue } from '../directives';

const t = useT();
const { ui, editor, state } = useUI();
const name = ref(suggestedBookmarkName(editor));
const sort = ref<'name' | 'location'>('name');
const hidden = ref(false);
const picked = ref<string | null>(null);
// Deleting a bookmark changes the document, not this dialog's state.
const tick = ref(0);
const all = computed(() => {
  void tick.value;
  void state.value;
  return editor.bookmarks(hidden.value);
});
const list = computed(() => (sort.value === 'name' ? [...all.value].sort((a, b) => a.name.localeCompare(b.name)) : all.value));
const problem = computed(() => bookmarkNameProblem(name.value));
const message = computed(() => {
  if (!name.value) return '';
  if (problem.value) return t(bookmarkProblemKey(problem.value));
  return all.value.some((b) => b.name === name.value) ? t('bookmark.nameExists') : '';
});
const close = () => ui.openModal(null);
const add = () => {
  if (problem.value) return;
  if (editor.createBookmark(name.value)) {
    ui.toast(t('bookmark.added', { name: name.value }));
    close();
    editor.focus();
  }
};
const remove = () => {
  if (picked.value && editor.deleteBookmark(picked.value)) {
    picked.value = null;
    tick.value++;
  }
};
const goTo = (b: string | null) => {
  if (!b) return;
  close();
  editor.goToBookmark(b);
};
const typeName = (e: Event) => {
  name.value = (e.target as HTMLInputElement).value;
  picked.value = null;
};
const choose = (b: string) => {
  picked.value = b;
  name.value = b;
};
</script>

<template>
  <Modal :title="t('bookmark.title')" test-id="bookmark-dialog" @close="close">
    <Row :label="t('bookmark.name')" html-for="bm-name">
      <input id="bm-name" v-value="name" class="fl-input" data-testid="bookmark-name" @input="typeName" @keydown="(e) => e.key === 'Enter' && add()" />
    </Row>
    <div class="fl-listbox fl-bookmark-list" role="listbox" :aria-label="t('bookmark.list')" data-testid="bookmark-list">
      <button v-for="b in list" :key="b.id" type="button" role="option" :aria-selected="picked === b.name" :class="cx('fl-option', picked === b.name && 'is-selected')" @click="choose(b.name)" @dblclick="goTo(b.name)">
        {{ b.name }}
      </button>
      <div v-if="!list.length" class="fl-empty-small">{{ t('bookmark.empty') }}</div>
    </div>
    <div class="fl-row-inline" role="radiogroup" :aria-label="t('bookmark.sortBy')">
      <span>{{ t('bookmark.sortBy') }}</span>
      <label class="fl-radio"><input v-checked="sort === 'name'" type="radio" name="bm-sort" @change="sort = 'name'" /> {{ t('bookmark.sortName') }}</label>
      <label class="fl-radio"><input v-checked="sort === 'location'" type="radio" name="bm-sort" @change="sort = 'location'" /> {{ t('bookmark.sortLocation') }}</label>
    </div>
    <Check :label="t('bookmark.hidden')" :checked="hidden" @change="(v) => (hidden = v)" />
    <p class="fl-note" role="status">{{ message }}</p>
    <template #footer>
      <button type="button" class="fl-btn is-primary" :disabled="!!problem" data-testid="bookmark-add" @click="add">{{ t('common.add') }}</button>
      <button type="button" class="fl-btn" :disabled="!picked" data-testid="bookmark-delete" @click="remove">{{ t('common.delete') }}</button>
      <button type="button" class="fl-btn" :disabled="!picked" data-testid="bookmark-goto" @click="goTo(picked)">{{ t('bookmark.goTo') }}</button>
      <button type="button" class="fl-btn" @click="close">{{ t('common.cancel') }}</button>
    </template>
  </Modal>
</template>
