<script setup lang="ts">
/** The new-comment draft for a selection. */
import { ref } from 'vue';
import Avatar from '../controls/Avatar.vue';
import { useAuthorColor, useT, useUI } from '../context';
import { vFocus, vValue } from '../directives';

const emit = defineEmits<{ done: [] }>();
const t = useT();
const { ui, editor, state } = useUI();
const authorColor = useAuthorColor();
const text = ref('');
const submit = () => {
  const v = text.value.trim();
  const range = state.value.composerRange;
  if (!v || !range) return;
  editor.addCommentAt(range, v);
  ui.closeComposer();
  emit('done');
};
const cancel = () => {
  ui.closeComposer();
  emit('done');
  editor.focus();
};
const onKey = (e: KeyboardEvent) => {
  e.stopPropagation();
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit();
  if (e.key === 'Escape') cancel();
};
</script>

<template>
  <form class="fl-card is-draft is-active" :style="{ '--author': authorColor(state.user.name) }" data-testid="comment-draft" @submit.prevent="submit">
    <div class="fl-card-head">
      <Avatar :name="state.user.name" :color="authorColor(state.user.name)" />
      <div class="fl-card-who"><span class="fl-card-author">{{ state.user.name }}</span></div>
    </div>
    <textarea
      v-value="text"
      v-focus
      class="fl-input fl-draft-input"
      :placeholder="t('review.addComment')"
      :aria-label="t('review.addComment')"
      rows="2"
      data-testid="comment-input"
      @input="text = ($event.target as HTMLTextAreaElement).value"
      @keydown="onKey"
    />
    <div class="fl-draft-actions">
      <button type="button" class="fl-btn is-small is-quiet" data-testid="comment-cancel" @click="cancel">{{ t('common.cancel') }}</button>
      <button type="submit" class="fl-btn is-small is-primary" :disabled="!text.trim()" data-testid="comment-submit">{{ t('review.comment') }}</button>
    </div>
  </form>
</template>
