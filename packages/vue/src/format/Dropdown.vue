<script setup lang="ts">
/** A button with a caret opening a panel (the default slot, given `close`). */
import { cx, keepFocus } from '@folioline/core/views';
import { ChevronDown } from '@lucide/vue';
import { ref } from 'vue';
import Popover from '../controls/Popover.vue';

withDefaults(defineProps<{
  label: string;
  title?: string;
  /** The text on the button (or the `text` slot). */
  text?: string;
  testId?: string;
  disabled?: boolean;
  active?: boolean;
  dataSlot?: string;
  align?: 'start' | 'end' | 'center';
  buttonClass?: string;
}>(), { title: undefined, text: undefined, testId: undefined, dataSlot: undefined, align: undefined, buttonClass: undefined });
defineSlots<{ default(props: { close: () => void }): unknown; icon?(): unknown; text?(): unknown }>();

const open = ref(false);
const btn = ref<HTMLButtonElement | null>(null);
const close = () => (open.value = false);
</script>

<template>
  <button
    ref="btn"
    type="button"
    :class="cx('fl-tool fl-tool-drop', (open || active) && 'is-active', buttonClass)"
    :aria-label="label"
    :title="title ?? label"
    aria-haspopup="true"
    :aria-expanded="open"
    :disabled="disabled"
    :data-testid="testId"
    :data-slot="dataSlot"
    @mousedown="keepFocus"
    @click="open = !open"
  >
    <slot name="icon" />
    <span v-if="text !== undefined || $slots.text" class="fl-tool-text"><slot name="text">{{ text }}</slot></span>
    <ChevronDown :size="12" class="fl-caret" />
  </button>
  <Popover :anchor="btn" :open="open" :title="label" :align="align" @close="close">
    <slot :close="close" />
  </Popover>
</template>
