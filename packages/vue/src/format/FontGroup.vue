<script setup lang="ts">
import { FONT_SIZES } from '@folioline/core';
import { cx, fontStack, keepFocus, parseFontSize, setFontFamily, setFontSize } from '@folioline/core/views';
import { computed, ref, watch } from 'vue';
import Popover from '../controls/Popover.vue';
import { useT, useUI } from '../context';
import { vValue } from '../directives';
import Dropdown from './Dropdown.vue';
import FontList from './FontList.vue';
import Labelled from './Labelled.vue';
import { useCursor, useReadOnly, type Variant } from './types';

defineProps<{ variant: Variant }>();
const t = useT();
const { editor } = useUI();
const cursor = useCursor();
const ro = useReadOnly();
const family = computed(() => cursor.value?.fontFamily ?? '');
const size = computed(() => cursor.value?.fontSize ?? null);
const text = ref(size.value ? String(size.value) : '');
const open = ref(false);
const wrap = ref<HTMLSpanElement | null>(null);
watch(size, (s) => (text.value = s ? String(s) : ''));

const apply = (v: string) => {
  const n = parseFontSize(v);
  if (n !== null) setFontSize(editor.activeView, n);
  else text.value = size.value ? String(size.value) : '';
  open.value = false;
  editor.focus();
};
const step = (dir: 1 | -1) => {
  editor.runAction(dir > 0 ? 'fontGrow' : 'fontShrink');
  editor.focus();
};
const pickFont = (f: string, close: () => void) => {
  close();
  setFontFamily(editor.activeView, f);
  editor.focus();
};
const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    apply(text.value);
  } else if (e.key === 'Escape') {
    text.value = size.value ? String(size.value) : '';
    open.value = false;
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    open.value = true;
  }
};
</script>

<template>
  <Labelled :label="t('toolbar.font')" :variant="variant">
    <Dropdown :label="t('toolbar.fontFamily', { font: family || '—' })" :title="t('toolbar.fontFamilyTitle')" :disabled="ro" test-id="tb-font" data-slot="font.family" button-class="fl-picker is-font">
      <template #text><span :style="{ fontFamily: fontStack(family) }">{{ family || '—' }}</span></template>
      <template #default="{ close }"><FontList :value="family" @pick="(f) => pickFont(f, close)" /></template>
    </Dropdown>
  </Labelled>
  <Labelled :label="t('toolbar.fontSize')" :variant="variant">
    <span ref="wrap" class="fl-stepper" role="group" :aria-label="t('toolbar.fontSize')" data-slot="font.size">
      <button type="button" class="fl-stepper-btn" :aria-label="t('toolbar.decreaseFont')" :title="t('toolbar.decreaseFont')" :disabled="ro" data-testid="tb-size-down" @mousedown="keepFocus" @click="step(-1)">−</button>
      <input
        v-value="text"
        class="fl-stepper-value"
        role="combobox"
        :aria-label="t('toolbar.fontSize')"
        :aria-expanded="open"
        aria-haspopup="listbox"
        inputmode="decimal"
        autocomplete="off"
        :disabled="ro"
        data-testid="tb-size"
        @input="text = ($event.target as HTMLInputElement).value"
        @focus="($event.target as HTMLInputElement).select()"
        @click="open = true"
        @keydown="onKey"
      />
      <button type="button" class="fl-stepper-btn" :aria-label="t('toolbar.increaseFont')" :title="t('toolbar.increaseFont')" :disabled="ro" data-testid="tb-size-up" @mousedown="keepFocus" @click="step(1)">+</button>
    </span>
    <Popover :anchor="wrap" :open="open" :title="t('toolbar.fontSizes')" align="center" @close="open = false">
      <div class="fl-listbox fl-size-list" role="listbox" :aria-label="t('toolbar.fontSizes')">
        <button v-for="s in FONT_SIZES" :key="s" type="button" role="option" :aria-selected="s === size" :class="cx('fl-option', s === size && 'is-selected')" :data-testid="`size-${s}`" @mousedown="keepFocus" @click="apply(String(s))">{{ s }}</button>
      </div>
    </Popover>
  </Labelled>
</template>
