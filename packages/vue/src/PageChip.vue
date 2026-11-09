<script setup lang="ts">
/** "3 of 12", shown while the pages scroll. */
import { cx } from '@folioline/core/views';
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { useSnapshot, useT } from './context';

const t = useT();
const page = useSnapshot((s) => s.pageIndex);
const count = useSnapshot((s) => s.pageCount);
const viewMode = useSnapshot((s) => s.viewMode);
const visible = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;
const show = () => {
  visible.value = true;
  clearTimeout(timer);
  timer = setTimeout(() => (visible.value = false), 1600);
};
onMounted(show);
watch(page, show);
onUnmounted(() => clearTimeout(timer));
</script>

<template>
  <div v-if="viewMode === 'print'" :class="cx('fl-pagechip', visible && 'is-visible')" role="status" data-testid="page-indicator">{{ t('page.indicator', { current: page + 1, total: count }) }}</div>
</template>
