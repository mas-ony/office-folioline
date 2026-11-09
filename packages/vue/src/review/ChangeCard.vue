<script setup lang="ts">
/** A tracked change with Accept and Reject. */
import type { MessageKey } from '@folioline/core';
import { cx, keepFocus, relativeTime, type ReviewItem } from '@folioline/core/views';
import { Check, X } from '@lucide/vue';
import { computed } from 'vue';
import Avatar from '../controls/Avatar.vue';
import { useAuthorColor, useSnapshot, useT, useUI } from '../context';

type ChangeItem = Extract<ReviewItem, { kind: 'change' }>;
const VERBS: Record<ChangeItem['summary']['verb'], MessageKey> = {
  added: 'review.added',
  deleted: 'review.deleted',
  replaced: 'review.replaced',
  formatted: 'review.formatted',
  paragraphAdded: 'review.paragraphAdded',
  paragraphDeleted: 'review.paragraphDeleted',
};

const props = defineProps<{ item: ChangeItem; active: boolean }>();
const emit = defineEmits<{ activate: [] }>();
const t = useT();
const { editor, state } = useUI();
const authorColor = useAuthorColor();
const ro = useSnapshot((s) => s.editMode === 'viewing');
const color = computed(() => authorColor(props.item.author));
const s = computed(() => props.item.summary);
const label = computed(() => t(VERBS[s.value.verb]));
const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && e.target === e.currentTarget) emit('activate');
};
</script>

<template>
  <div
    :class="cx('fl-card', 'is-change', active && 'is-active')"
    :style="{ '--author': color }"
    role="button"
    tabindex="0"
    :aria-label="`${label} · ${item.author}`"
    data-testid="change-card"
    @click="emit('activate')"
    @keydown="onKey"
  >
    <div class="fl-card-head">
      <Avatar :name="item.author" :color="color" />
      <div class="fl-card-who">
        <span class="fl-card-author">{{ item.author }}</span>
        <time class="fl-card-time" :datetime="item.date">{{ relativeTime(item.date, t, state.locale) }}</time>
      </div>
      <div v-if="!ro" class="fl-card-actions is-always">
        <button type="button" class="fl-icon-btn is-small" :aria-label="t('review.accept')" :title="t('review.accept')" data-testid="change-accept" @mousedown="keepFocus" @click.stop="editor.decideChanges(item.changes, true)"><Check :size="15" /></button>
        <button type="button" class="fl-icon-btn is-small" :aria-label="t('review.reject')" :title="t('review.reject')" data-testid="change-reject" @mousedown="keepFocus" @click.stop="editor.decideChanges(item.changes, false)"><X :size="15" /></button>
      </div>
    </div>
    <div class="fl-card-body">
      <span class="fl-card-verb">{{ label }}</span>
      <template v-if="s.verb === 'replaced'">{{ ' ' }}<del class="fl-del" dir="auto">{{ s.text }}</del>{{ ' ' }}<ins class="fl-ins" dir="auto">{{ s.with }}</ins></template>
      <template v-else-if="s.verb === 'deleted'">{{ ' ' }}<del class="fl-del" dir="auto">{{ s.text }}</del></template>
      <template v-else-if="s.verb === 'added'">{{ ' ' }}<ins class="fl-ins" dir="auto">{{ s.text }}</ins></template>
      <template v-else-if="s.verb === 'formatted'">{{ ' ' }}<span class="fl-card-text" dir="auto">{{ s.text }}</span></template>
    </div>
  </div>
</template>
