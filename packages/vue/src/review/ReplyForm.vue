<script setup lang="ts">
import { ArrowUp } from '@lucide/vue';
import { ref } from 'vue';
import Avatar from '../controls/Avatar.vue';
import { useAuthorColor, useT, useUI } from '../context';
import { vFocus, vValue } from '../directives';

defineProps<{ threadId: string; autoFocus?: boolean }>();
const t = useT();
const { editor, state } = useUI();
const authorColor = useAuthorColor();
const text = ref('');
const submit = (threadId: string) => {
  const v = text.value.trim();
  if (!v) return;
  editor.replyToComment(threadId, v);
  text.value = '';
};
</script>

<template>
  <form class="fl-reply" @submit.prevent="submit(threadId)" @click.stop>
    <Avatar :name="state.user.name" :color="authorColor(state.user.name)" size="sm" />
    <input
      v-value="text"
      v-focus="autoFocus"
      class="fl-reply-input"
      :placeholder="t('review.replyPlaceholder')"
      :aria-label="t('review.reply')"
      data-testid="reply-input"
      @input="text = ($event.target as HTMLInputElement).value"
      @keydown.stop
    />
    <button type="submit" class="fl-reply-send" :aria-label="t('review.reply')" :title="t('review.reply')" :disabled="!text.trim()" data-testid="reply-send"><ArrowUp :size="15" /></button>
  </form>
</template>
