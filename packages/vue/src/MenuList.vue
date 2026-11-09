<script setup lang="ts">
/** A list of menu entries with keyboard navigation and side submenus. */
import { cx, focusMenuItem, keepFocus, type MenuEntry, menuKeyDown } from '@folioline/core/views';
import { Check, ChevronLeft } from '@lucide/vue';
import { computed, ref, shallowRef, watchPostEffect } from 'vue';
import { useUI } from './context';
import Icon from './Icon.vue';
import MenuWidget from './MenuWidget.vue';
import SubmenuItem from './SubmenuItem.vue';

type Item = Exclude<MenuEntry, { type: 'submenu' | 'separator' | 'heading' | 'custom' }>;
type Submenu = Extract<MenuEntry, { type: 'submenu' }>;

defineOptions({ name: 'MenuList' });
const props = withDefaults(defineProps<{ entries: MenuEntry[]; label?: string; autoFocus?: boolean; testId?: string; panelClass?: string }>(), {
  autoFocus: true,
  label: undefined,
  testId: undefined,
  panelClass: undefined,
});
const emit = defineEmits<{ close: [] }>();

const { state } = useUI();
const el = ref<HTMLElement | null>(null);
const sub = shallowRef<{ id: string; rect: DOMRect } | null>(null);
/** Phones drill into submenus within the sheet. */
const drill = ref<string | null>(null);

watchPostEffect(() => {
  void drill.value;
  if (props.autoFocus) focusMenuItem(el.value, 'first');
});

// Only keys pressed in this menu (as the React menus do, whose submenus' keys reach them too).
const onKeyDown = (e: KeyboardEvent) => {
  if (el.value?.contains(e.target as Node)) menuKeyDown(el.value, e);
};

const shown = computed(() => (drill.value ? (props.entries.find((x) => x.id === drill.value && x.type === 'submenu') as Submenu | undefined) : undefined));

const role = (entry: Item) => (entry.checked !== undefined ? (entry.radio ? 'menuitemradio' : 'menuitemcheckbox') : 'menuitem');
const ariaLabel = (entry: Item) => [entry.label, entry.hint, entry.shortcut, entry.disabled ? entry.reason : undefined].filter(Boolean).join(' ');
const select = (entry: Item) => {
  if (entry.disabled) return;
  if (!entry.keepOpen) emit('close');
  entry.onSelect();
};
const openSub = (id: string, rect: DOMRect) => {
  if (state.value.mobile) drill.value = id;
  else sub.value = { id, rect };
};
</script>

<template>
  <div v-if="state.mobile && shown" ref="el" :class="cx('fl-menu', panelClass)" role="menu" :aria-label="shown.label" @keydown="onKeyDown">
    <button type="button" role="menuitem" class="fl-menuitem fl-menu-back" @click="drill = null">
      <span class="fl-menuitem-icon"><ChevronLeft :size="16" /></span>
      <span class="fl-menuitem-text"><span class="fl-menuitem-label">{{ shown.label }}</span></span>
    </button>
    <div class="fl-menu-sep" role="separator" />
    <MenuList v-if="Array.isArray(shown.items)" :entries="shown.items" :auto-focus="false" @close="emit('close')" />
    <MenuWidget v-else :widget="shown.items" @close="emit('close')" />
  </div>
  <div v-else ref="el" :class="cx('fl-menu', panelClass)" role="menu" :aria-label="label" :data-testid="testId" @keydown="onKeyDown">
    <template v-for="entry in entries" :key="entry.id">
      <div v-if="entry.type === 'separator'" class="fl-menu-sep" role="separator" />
      <div v-else-if="entry.type === 'heading'" class="fl-menu-heading">{{ entry.label }}</div>
      <div v-else-if="entry.type === 'custom'" class="fl-menu-custom"><MenuWidget :widget="entry.widget" @close="emit('close')" /></div>
      <SubmenuItem
        v-else-if="entry.type === 'submenu'"
        :entry="entry"
        :open="sub?.id === entry.id"
        :rect="sub?.id === entry.id ? sub.rect : null"
        @open="(rect) => openSub(entry.id, rect)"
        @close-sub="sub = null"
        @close-all="emit('close')"
      />
      <button
        v-else
        type="button"
        :role="role(entry)"
        :aria-checked="entry.checked !== undefined ? entry.checked : undefined"
        :aria-disabled="entry.disabled || undefined"
        :aria-label="ariaLabel(entry)"
        :title="entry.disabled ? entry.reason : undefined"
        :class="cx('fl-menuitem', entry.checked && 'is-checked', entry.disabled && 'is-disabled')"
        :data-testid="entry.testId"
        @mousedown="keepFocus"
        @mouseenter="sub = null"
        @click="select(entry)"
      >
        <span class="fl-menuitem-icon"><Check v-if="entry.checked !== undefined && entry.checked" :size="16" /><Icon v-else-if="entry.icon" :name="entry.icon" /></span>
        <span class="fl-menuitem-text">
          <span class="fl-menuitem-label">{{ entry.label }}</span>
          <span v-if="entry.hint" class="fl-menuitem-hint">{{ entry.hint }}</span>
        </span>
        <span v-if="entry.shortcut" class="fl-menuitem-shortcut">{{ entry.shortcut }}</span>
      </button>
    </template>
  </div>
</template>
