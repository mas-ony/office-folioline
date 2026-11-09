<script setup lang="ts">
/** A button that opens a menu below it (the `menu` slot replaces the list of entries). */
import { cx, keepFocus, type MenuEntry } from '@folioline/core/views';
import { ref } from 'vue';
import Popover from './controls/Popover.vue';
import MenuList from './MenuList.vue';

const props = withDefaults(defineProps<{
  label: string;
  title?: string;
  buttonClass?: string;
  testId?: string;
  entries?: MenuEntry[] | (() => MenuEntry[]);
  align?: 'start' | 'end' | 'center';
  disabled?: boolean;
  menuLabel?: string;
  sheetTitle?: string;
}>(), { title: undefined, buttonClass: undefined, testId: undefined, entries: undefined, align: undefined, menuLabel: undefined, sheetTitle: undefined });
const emit = defineEmits<{ openChange: [open: boolean] }>();
defineSlots<{ default(): unknown; menu?(props: { close: () => void }): unknown }>();

const open = ref(false);
const btn = ref<HTMLButtonElement | null>(null);
const setOpen = (v: boolean) => {
  open.value = v;
  emit('openChange', v);
};
const close = () => setOpen(false);
const list = () => (typeof props.entries === 'function' ? props.entries() : props.entries ?? []);
</script>

<template>
  <button
    ref="btn"
    type="button"
    :class="cx(buttonClass, open && 'is-open')"
    :aria-label="label"
    :title="title ?? label"
    aria-haspopup="menu"
    :aria-expanded="open"
    :disabled="disabled"
    :data-testid="testId"
    @mousedown="keepFocus"
    @click="setOpen(!open)"
  >
    <slot />
  </button>
  <Popover :anchor="btn" :open="open" :align="align" :title="sheetTitle ?? menuLabel ?? label" role="presentation" @close="close">
    <slot v-if="$slots.menu" name="menu" :close="close" />
    <MenuList v-else :entries="list()" :label="menuLabel ?? label" @close="close" />
  </Popover>
</template>
