<script setup lang="ts">
/** The document's name (renamed in place) and whether it has unsaved changes. */
import { cx } from '@folioline/core/views';
import { computed, ref, watch } from 'vue';
import { useSnapshot, useT, useUI } from './context';
import { vValue } from './directives';

const t = useT();
const { editor, store } = useUI();
const fileName = useSnapshot((s) => s.fileName);
const dirty = useSnapshot((s) => s.dirty);
const base = computed(() => fileName.value.replace(/\.docx$/i, ''));
const text = ref(base.value);
watch(base, (b) => (text.value = b));
const commit = () => {
  const v = text.value.trim();
  if (!v) text.value = base.value;
  else if (v !== base.value) {
    editor.fileName = `${v}.docx`;
    editor.markChanged();
    store.refresh();
  }
};
const key = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    commit();
    editor.focus();
  } else if (e.key === 'Escape') {
    text.value = base.value;
    editor.focus();
  }
};
</script>

<template>
  <div class="fl-docname">
    <input
      v-value="text"
      class="fl-docname-input"
      :aria-label="t('title.documentName')"
      :size="Math.max(4, Math.min(28, text.length + 1))"
      :spellcheck="false"
      data-testid="doc-name"
      @input="text = ($event.target as HTMLInputElement).value"
      @blur="commit"
      @keydown="key"
    />
    <span class="fl-docname-ext">.docx</span>
    <span :class="cx('fl-save-dot', dirty && 'is-dirty')" role="status" :title="dirty ? t('app.unsaved') : t('app.saved')" :aria-label="dirty ? t('app.unsaved') : t('app.saved')" />
  </div>
</template>
