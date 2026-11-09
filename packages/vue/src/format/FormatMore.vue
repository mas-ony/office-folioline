<script setup lang="ts">
/** The More button, and the panel with the groups the bar has no room for. */
import { cx, keepFocus } from '@folioline/core/views';
import { Ellipsis } from '@lucide/vue';
import { ref } from 'vue';
import Popover from '../controls/Popover.vue';
import { useT } from '../context';
import type { Group } from './types';

defineProps<{ groups: Group[]; open: boolean }>();
const emit = defineEmits<{ toggle: []; close: [] }>();
const t = useT();
const btn = ref<HTMLButtonElement | null>(null);
</script>

<template>
  <button
    ref="btn"
    type="button"
    :class="cx('fl-tool', open && 'is-active')"
    :aria-label="t('toolbar.more')"
    :title="t('toolbar.more')"
    aria-haspopup="dialog"
    :aria-expanded="open"
    data-testid="tb-more"
    data-slot="toolbar.more"
    @mousedown="keepFocus"
    @click="emit('toggle')"
  >
    <Ellipsis :size="18" />
  </button>
  <Popover :anchor="btn" :open="open" :title="t('toolbar.more')" align="end" test-id="tb-more-panel" @close="emit('close')">
    <div class="fl-more" role="group" :aria-label="t('toolbar.more')">
      <section v-for="g in groups" :key="g.id" class="fl-more-section" role="group" :aria-label="t(g.title)">
        <h3 class="fl-more-title">{{ t(g.title) }}</h3>
        <div class="fl-more-body"><component :is="g.comp" variant="menu" /></div>
      </section>
    </div>
  </Popover>
</template>
