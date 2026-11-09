<script setup lang="ts">
import { cx, reviewItems } from '@folioline/core/views';
import { ListChecks, MessageSquarePlus } from '@lucide/vue';
import { computed, onMounted, ref, watch } from 'vue';
import Check from './controls/Check.vue';
import { useAuthorColor, useSnapshot, useT, useUI } from './context';
import ChangeCard from './review/ChangeCard.vue';
import CommentCard from './review/CommentCard.vue';
import DraftCard from './review/DraftCard.vue';

const t = useT();
const { ui, editor, state } = useUI();
const authorColor = useAuthorColor();
const version = useSnapshot((s) => `${s.commentsVersion}:${s.changesVersion}`);
const hidden = useSnapshot((s) => s.hiddenReviewers);
const activeComment = useSnapshot((s) => s.activeComment);
const selected = useSnapshot((s) => !!s.cursor?.textSelected);
const mode = useSnapshot((s) => s.editMode);
const activeChange = ref<string | null>(null);
const showResolved = ref(false);
const body = ref<HTMLDivElement | null>(null);
const reviewers = computed(() => {
  void version.value;
  return editor.reviewers();
});
const items = computed(() => {
  void version.value;
  return reviewItems(editor, { hidden: hidden.value, resolved: showResolved.value });
});
const resolvedCount = computed(() => {
  void version.value;
  return editor.comments().filter((c) => c.done).length;
});
// The active comment is scrolled into view (also when the tab opens).
const reveal = (id: string | null) => {
  if (!id) return;
  body.value?.querySelector(`[data-comment-id="${CSS.escape(id)}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
};
onMounted(() => reveal(activeComment.value));
watch(activeComment, reveal, { flush: 'post' });
const toggle = (name: string) => editor.setHiddenReviewers(hidden.value.includes(name) ? hidden.value.filter((h) => h !== name) : [...hidden.value, name]);
const activateComment = (id: string) => {
  activeChange.value = null;
  editor.selectComment(id);
};
const activateChange = (key: string, change: Parameters<typeof editor.selectChange>[0]) => {
  activeChange.value = key;
  editor.selectComment(null);
  editor.selectChange(change);
};
</script>

<template>
  <div ref="body" class="fl-panel-body" data-testid="changes-tab">
    <div v-if="reviewers.length > 0" class="fl-chips" role="group" :aria-label="t('review.reviewers')">
      <button v-for="name in reviewers" :key="name" type="button" :class="cx('fl-chip', !hidden.includes(name) && 'is-on')" :aria-pressed="!hidden.includes(name)" :data-testid="`chip-${name}`" @click="toggle(name)">
        <span class="fl-chip-dot" :style="{ background: authorColor(name) }" aria-hidden="true" />{{ name }}
      </button>
    </div>
    <DraftCard v-if="state.mobile && state.composerRange" />
    <ul class="fl-card-list" data-testid="review-list">
      <li v-for="it in items" :key="it.key">
        <CommentCard v-if="it.kind === 'comment'" :item="it" variant="panel" :active="activeComment === it.thread.id" @activate="activateComment(it.thread.id)" />
        <ChangeCard v-else :item="it" :active="activeChange === it.key" @activate="activateChange(it.key, it.changes[0])" />
      </li>
    </ul>
    <div v-if="!items.length" class="fl-empty" data-testid="review-empty">
      <ListChecks :size="22" aria-hidden="true" />
      <p><b>{{ t('review.empty') }}</b></p>
      <p>{{ t('review.emptyHint') }}</p>
    </div>
    <div class="fl-panel-foot">
      <Check v-if="resolvedCount > 0" :label="t('review.showResolved')" :checked="showResolved" test-id="show-resolved" @change="(on) => (showResolved = on)" />
      <button v-if="state.mobile && mode !== 'viewing' && !state.composerRange" type="button" class="fl-btn is-small" :disabled="!selected" data-testid="panel-add-comment" @click="ui.openComposer()">
        <MessageSquarePlus :size="15" /> {{ t('review.addComment') }}
      </button>
    </div>
  </div>
</template>
