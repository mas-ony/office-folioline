<script setup lang="ts">
import { cx } from '@folioline/core/views';
import { Search } from '@lucide/vue';
import { computed, onMounted, ref, watch } from 'vue';
import { useSnapshot, useT, useUI } from '../context';
import { vValue } from '../directives';

const t = useT();
const { ui, editor, state } = useUI();
const layoutVersion = useSnapshot((s) => s.layoutVersion);
const selFrom = useSnapshot((s) => (s.cursor ? editor.view.state.selection.from : 0));
const q = ref('');
const headings = computed(() => {
  void layoutVersion.value;
  return editor.headings();
});
const current = computed(() => [...headings.value].reverse().find((h) => h.pos <= selFrom.value)?.pos ?? -1);
const shown = computed(() => headings.value.filter((h) => h.text.toLowerCase().includes(q.value.trim().toLowerCase())));
const min = computed(() => Math.min(...headings.value.map((h) => h.level), 9));
const list = ref<HTMLUListElement | null>(null);
const reveal = () => list.value?.querySelector('.is-current')?.scrollIntoView({ block: 'nearest' });
onMounted(reveal);
watch(current, reveal, { flush: 'post' });
const go = (pos: number) => {
  editor.goToPos(pos + 1);
  if (state.value.mobile) ui.setNavOpen(false);
};
</script>

<template>
  <div class="fl-nav-panel" role="tabpanel" :aria-label="t('nav.headings')">
    <label class="fl-searchbox">
      <Search :size="15" aria-hidden="true" />
      <input v-value="q" type="search" role="searchbox" :aria-label="t('nav.searchDocument')" :placeholder="t('nav.searchDocument')" @input="q = ($event.target as HTMLInputElement).value" />
    </label>
    <ul v-if="headings.length" ref="list" class="fl-nav-list" data-testid="nav-headings">
      <li v-for="h in shown" :key="h.pos">
        <button type="button" :class="cx('fl-nav-heading', h.pos === current && 'is-current')" dir="auto" :style="{ paddingInlineStart: `${8 + (h.level - min) * 14}px` }" :title="h.text" @click="go(h.pos)">{{ h.text }}</button>
      </li>
    </ul>
    <p v-else class="fl-nav-empty">{{ t('nav.noHeadings') }}</p>
  </div>
</template>
