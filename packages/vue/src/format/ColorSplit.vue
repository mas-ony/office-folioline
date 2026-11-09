<script setup lang="ts">
/** Main button applying the last colour, with a caret opening the colour panel (the `panel` slot). */
import { cx, keepFocus } from '@folioline/core/views';
import { ChevronDown } from '@lucide/vue';
import { ref } from 'vue';
import Popover from '../controls/Popover.vue';

defineProps<{ label: string; color: string; testId: string; disabled?: boolean; dataSlot: string }>();
const emit = defineEmits<{ apply: [] }>();
defineSlots<{ icon(): unknown; panel(props: { close: () => void }): unknown }>();

const open = ref(false);
const wrap = ref<HTMLSpanElement | null>(null);
const close = () => (open.value = false);
</script>

<template>
  <span ref="wrap" class="fl-colorsplit" :data-slot="dataSlot">
    <button type="button" class="fl-tool fl-colorsplit-main" :aria-label="label" :title="label" :disabled="disabled" :data-testid="testId" @mousedown="keepFocus" @click="emit('apply')">
      <slot name="icon" />
      <span class="fl-colorsplit-bar" :style="{ background: color }" aria-hidden="true" />
    </button>
    <button type="button" :class="cx('fl-tool fl-colorsplit-caret', open && 'is-active')" :aria-label="label" :title="label" aria-haspopup="dialog" :aria-expanded="open" :disabled="disabled" :data-testid="`${testId}-caret`" @mousedown="keepFocus" @click="open = !open">
      <ChevronDown :size="11" />
    </button>
    <Popover :anchor="wrap" :open="open" :title="label" @close="close">
      <slot name="panel" :close="close" />
    </Popover>
  </span>
</template>
