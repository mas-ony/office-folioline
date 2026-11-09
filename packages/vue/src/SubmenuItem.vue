<script setup lang="ts">
/** A menu item that opens its submenu beside it (on hover after a moment, or at once on click). */
import { cx, keepFocus, type MenuEntry } from '@folioline/core/views';
import { ChevronRight } from '@lucide/vue';
import { ref } from 'vue';
import Icon from './Icon.vue';
import MenuList from './MenuList.vue';
import MenuWidget from './MenuWidget.vue';
import SideMenu from './SideMenu.vue';

const props = defineProps<{ entry: Extract<MenuEntry, { type: 'submenu' }>; open: boolean; rect: DOMRect | null }>();
const emit = defineEmits<{ open: [rect: DOMRect]; closeSub: []; closeAll: [] }>();

const btn = ref<HTMLButtonElement | null>(null);
let timer: ReturnType<typeof setTimeout> | null = null;
const openNow = () => {
  if (props.entry.disabled || !btn.value) return;
  emit('open', btn.value.getBoundingClientRect());
};
const enter = () => {
  timer = setTimeout(openNow, 120);
};
const leave = () => {
  if (timer) clearTimeout(timer);
};
const closeSub = () => {
  emit('closeSub');
  btn.value?.focus();
};
</script>

<template>
  <button
    ref="btn"
    type="button"
    role="menuitem"
    aria-haspopup="menu"
    :aria-expanded="open"
    :aria-disabled="entry.disabled || undefined"
    data-submenu="1"
    :class="cx('fl-menuitem', open && 'is-open', entry.disabled && 'is-disabled')"
    :data-testid="entry.testId"
    @mousedown="keepFocus"
    @mouseenter="enter"
    @mouseleave="leave"
    @click="openNow"
  >
    <span class="fl-menuitem-icon"><Icon v-if="entry.icon" :name="entry.icon" /></span>
    <span class="fl-menuitem-text"><span class="fl-menuitem-label">{{ entry.label }}</span></span>
    <ChevronRight :size="14" class="fl-menuitem-arrow" />
  </button>
  <SideMenu v-if="open && rect" :rect="rect" :label="entry.label" @close="closeSub">
    <MenuList v-if="Array.isArray(entry.items)" :entries="entry.items" :label="entry.label" @close="emit('closeAll')" />
    <MenuWidget v-else :widget="entry.items" @close="emit('closeAll')" />
  </SideMenu>
</template>
