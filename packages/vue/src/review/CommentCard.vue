<script setup lang="ts">
/** A comment thread: in the rail beside the page, or in the Changes tab. */
import { cx, dateTime, keepFocus, relativeTime, type ReviewItem } from '@folioline/core/views';
import { Check, RotateCcw, Trash2 } from '@lucide/vue';
import { computed } from 'vue';
import Avatar from '../controls/Avatar.vue';
import { useAuthorColor, useSnapshot, useT, useUI } from '../context';
import ReplyForm from './ReplyForm.vue';

const props = defineProps<{ item: Extract<ReviewItem, { kind: 'comment' }>; active: boolean; variant: 'rail' | 'panel' }>();
const emit = defineEmits<{ activate: [] }>();
const t = useT();
const { editor, state } = useUI();
const authorColor = useAuthorColor();
const ro = useSnapshot((s) => s.editMode === 'viewing');
const th = computed(() => props.item.thread);
const color = computed(() => authorColor(th.value.author));
const actions = computed(() => !ro.value && (props.variant === 'rail' || props.active));
const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && e.target === e.currentTarget) emit('activate');
};
</script>

<template>
  <div
    :class="cx('fl-card', 'is-comment', active && 'is-active', th.done && 'is-resolved', variant === 'rail' && 'is-rail')"
    :style="{ '--author': color }"
    role="button"
    tabindex="0"
    :aria-label="`${t('review.comment')} · ${th.author}`"
    :data-testid="variant === 'rail' ? 'rail-card' : 'review-card'"
    :data-comment-id="th.id"
    @click="emit('activate')"
    @keydown="onKey"
  >
    <div class="fl-card-head">
      <Avatar :name="th.author" :color="color" />
      <div class="fl-card-who">
        <span class="fl-card-author">{{ th.author }}</span>
        <time class="fl-card-time" :datetime="th.date">{{ variant === 'rail' ? dateTime(th.date, state.locale) : relativeTime(th.date, t, state.locale) }}</time>
      </div>
      <span v-if="th.done" class="fl-badge">{{ t('review.resolved') }}</span>
      <div v-if="actions" class="fl-card-actions">
        <button v-if="th.done" type="button" class="fl-icon-btn is-small" :aria-label="t('review.reopen')" :title="t('review.reopen')" data-testid="comment-reopen" @mousedown="keepFocus" @click.stop="editor.resolveComment(th.id, false)"><RotateCcw :size="15" /></button>
        <button v-else type="button" class="fl-icon-btn is-small" :aria-label="t('review.resolve')" :title="t('review.resolve')" data-testid="comment-resolve" @mousedown="keepFocus" @click.stop="editor.resolveComment(th.id, true)"><Check :size="15" /></button>
        <button type="button" class="fl-icon-btn is-small" :aria-label="t('review.deleteComment')" :title="t('review.deleteComment')" data-testid="comment-delete" @mousedown="keepFocus" @click.stop="editor.deleteComment(th.id)"><Trash2 :size="15" /></button>
      </div>
    </div>
    <div class="fl-card-body">
      <span v-if="variant === 'panel'" class="fl-card-verb">{{ t('review.comment') }}</span>
      <span class="fl-card-text" dir="auto">{{ th.text }}</span>
    </div>
    <ul v-if="th.replies.length > 0" class="fl-card-replies">
      <li v-for="r in th.replies" :key="r.id">
        <b>{{ r.author }}</b> <span v-if="variant === 'panel'" class="fl-card-verb">{{ t('review.reply') }}:</span> <span dir="auto">{{ r.text }}</span>
      </li>
    </ul>
    <ReplyForm v-if="!ro && !th.done && (variant === 'rail' || active)" :thread-id="th.id" />
  </div>
</template>
