<script setup lang="ts">
/** File, Format, Insert, Review and Help. */
import { cx, keepFocus, menuModel } from '@folioline/core/views';
import { computed, provide, ref } from 'vue';
import { SUBMENU_KEYS, useT, useUI } from './context';
import Popover from './controls/Popover.vue';
import MenuList from './MenuList.vue';

const t = useT();
const { ui, state, snapshot, options } = useUI();
const model = computed(() => {
  void state.value;
  void options.value;
  return menuModel(ui, snapshot.value);
});
const open = ref<string | null>(null);
const refs: Record<string, HTMLButtonElement | null> = {};
const current = computed(() => model.value.find((m) => m.id === open.value));

const move = (dir: 1 | -1) => {
  const list = model.value;
  const i = list.findIndex((m) => m.id === open.value);
  const next = list[(i + dir + list.length) % list.length];
  open.value = next.id;
  refs[next.id]?.focus();
};
const onBarKey = (e: KeyboardEvent, id: string) => {
  const list = model.value;
  const i = list.findIndex((m) => m.id === id);
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
    e.preventDefault();
    const next = list[(i + (e.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length];
    refs[next.id]?.focus();
    if (open.value) open.value = next.id;
  } else if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    open.value = id;
  }
};
// Left and right in an open menu, or in one of its submenus, move to the next menu.
const onMenuKey = (e: KeyboardEvent) => {
  const el = document.activeElement as HTMLElement | null;
  if (e.key === 'ArrowRight' && !el?.dataset.submenu) {
    e.preventDefault();
    move(1);
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    move(-1);
  }
};
provide(SUBMENU_KEYS, onMenuKey);
const hover = (id: string) => {
  if (open.value && open.value !== id) open.value = id;
};
</script>

<template>
  <nav class="fl-menubar" role="menubar" :aria-label="t('title.menuBar')" data-testid="menubar">
    <button
      v-for="m in model"
      :key="m.id"
      :ref="(el) => (refs[m.id] = el as HTMLButtonElement | null)"
      type="button"
      role="menuitem"
      aria-haspopup="menu"
      :aria-expanded="open === m.id"
      :class="cx('fl-menubar-item', open === m.id && 'is-open')"
      :data-testid="`menubar-${m.id}`"
      @mousedown="keepFocus"
      @click="open = open === m.id ? null : m.id"
      @mouseenter="hover(m.id)"
      @keydown="onBarKey($event, m.id)"
    >{{ m.label }}</button>
    <Popover v-if="current" :anchor="refs[current.id] ?? null" open role="presentation" :title="current.label" @close="open = null">
      <div @keydown="onMenuKey">
        <MenuList :entries="current.entries" :label="current.label" :test-id="`menu-${current.id}`" @close="open = null" />
      </div>
    </Popover>
  </nav>
</template>
