<script setup lang="ts">
import type { MessageKey } from '@folioline/core';
import { applyBorders, BORDER_PRESETS, BORDER_STYLES, BORDER_WIDTHS, type BorderPen, canRunTableAction, cx, keepFocus, PRESET_KEYS, repaintBorders, setCellBackground, tableMoreEntries } from '@folioline/core/views';
import { ChevronDown, Grid2x2, PaintBucket, Pencil, TableCellsMerge, TableCellsSplit, TableProperties } from '@lucide/vue';
import { computed, ref } from 'vue';
import ColorPicker from '../ColorPicker.vue';
import { useSnapshot, useT, useUI } from '../context';
import MenuButton from '../MenuButton.vue';
import BorderIcon from './BorderIcon.vue';
import ColorSplit from './ColorSplit.vue';
import Dropdown from './Dropdown.vue';
import Labelled from './Labelled.vue';
import StyleSample from './StyleSample.vue';
import Tool from './Tool.vue';
import { ICON, useReadOnly, type Variant } from './types';

defineProps<{ variant: Variant }>();
const t = useT();
const { ui, editor } = useUI();
const ro = useReadOnly();
const version = useSnapshot((s) => s.version);
const canMerge = computed(() => {
  void version.value;
  return canRunTableAction(editor.activeView.state, 'mergeCells');
});
// The border pen is the interface's (not reactive): shown again after a change.
const tick = ref(0);
const pen = computed(() => {
  void tick.value;
  void version.value;
  return ui.tools.pen;
});
const setPen = (p: Partial<BorderPen>) => {
  ui.tools.pen = { ...pen.value, ...p };
  tick.value++;
  repaintBorders(editor.activeView, ui.tools.pen);
  editor.focus();
};
const borders = (p: (typeof BORDER_PRESETS)[number], close: () => void) => {
  close();
  applyBorders(editor.activeView, p, pen.value);
  editor.focus();
};
const fill = (hex: string | null, close?: () => void) => {
  close?.();
  setCellBackground(editor.activeView, hex);
  editor.focus();
};
const merge = () => {
  editor.tableAction('mergeCells');
  editor.focus();
};
const styleLabel = (s: string) => t(`table.${s === 'single' ? 'solid' : s}` as MessageKey);
</script>

<template>
  <Labelled :label="t('table.borders')" :variant="variant">
    <Dropdown :label="t('table.borders')" :disabled="ro" test-id="tb-borders" data-slot="table.borders">
      <template #icon><Grid2x2 :size="ICON" /></template>
      <template #default="{ close }">
        <div class="fl-icon-grid" role="group" :aria-label="t('table.borders')">
          <button v-for="p in BORDER_PRESETS" :key="p" type="button" class="fl-tool" :aria-label="t(PRESET_KEYS[p])" :title="t(PRESET_KEYS[p])" :data-testid="`borders-${p}`" @mousedown="keepFocus" @click="borders(p, close)">
            <BorderIcon :preset="p" />
          </button>
        </div>
      </template>
    </Dropdown>
  </Labelled>
  <Labelled :label="t('table.borderColor')" :variant="variant">
    <ColorSplit data-slot="table.borderColor" :label="t('table.borderColor')" :color="`#${pen.color}`" test-id="tb-border-color" :disabled="ro" @apply="setPen({})">
      <template #icon><Pencil :size="ICON" /></template>
      <template #panel="{ close }"><ColorPicker :label="t('table.borderColor')" :value="pen.color" :docx="editor.docx" @pick="(hex) => { close(); setPen({ color: hex ?? '000000' }); }" /></template>
    </ColorSplit>
  </Labelled>
  <Labelled :label="t('table.borderStyle')" :variant="variant">
    <Dropdown :label="t('table.borderStyle')" :disabled="ro" test-id="tb-border-style" data-slot="table.borderStyle" button-class="fl-tool-sample">
      <template #icon><StyleSample :line="pen.style" /></template>
      <template #default="{ close }">
        <div class="fl-listbox" role="listbox" :aria-label="t('table.borderStyle')">
          <button v-for="s in BORDER_STYLES" :key="s" type="button" role="option" :aria-selected="pen.style === s" :aria-label="styleLabel(s)" :class="cx('fl-option', pen.style === s && 'is-selected')" @mousedown="keepFocus" @click="close(); setPen({ style: s });">
            <StyleSample :line="s" />
          </button>
        </div>
      </template>
    </Dropdown>
  </Labelled>
  <Labelled :label="t('table.borderWidth')" :variant="variant">
    <Dropdown :label="t('table.borderWidth')" :disabled="ro" test-id="tb-border-width" data-slot="table.borderWidth" button-class="fl-tool-sample">
      <template #icon><StyleSample line="single" :width="pen.width * 1.4" /></template>
      <template #default="{ close }">
        <div class="fl-listbox" role="listbox" :aria-label="t('table.borderWidth')">
          <button v-for="w in BORDER_WIDTHS" :key="w" type="button" role="option" :aria-selected="pen.width === w" :class="cx('fl-option fl-width-option', pen.width === w && 'is-selected')" @mousedown="keepFocus" @click="close(); setPen({ width: w });">
            <StyleSample line="single" :width="w * 1.4" /> <span>{{ w }} pt</span>
          </button>
        </div>
      </template>
    </Dropdown>
  </Labelled>
  <Labelled :label="t('table.cellFill')" :variant="variant">
    <ColorSplit data-slot="table.cellFill" :label="t('table.cellFill')" color="#FFF2CC" test-id="tb-cell-fill" :disabled="ro" @apply="fill('FFF2CC')">
      <template #icon><PaintBucket :size="ICON" /></template>
      <template #panel="{ close }"><ColorPicker :label="t('table.cellFill')" :value="null" :docx="editor.docx" @pick="(hex) => fill(hex, close)" /></template>
    </ColorSplit>
  </Labelled>
  <Tool :variant="variant" :label="t('table.mergeCells')" :title="canMerge ? t('table.mergeCells') : t('table.mergeNeedsSelection')" :disabled="ro || !canMerge" test-id="tb-merge" data-slot="table.merge" @click="merge"><TableCellsMerge :size="ICON" /></Tool>
  <Tool :variant="variant" :label="t('table.splitCell')" :disabled="ro" test-id="tb-split" data-slot="table.split" @click="ui.openModal('splitCell')"><TableCellsSplit :size="ICON" /></Tool>
  <Labelled :label="t('table.moreOptions')" :variant="variant">
    <MenuButton :label="t('table.moreOptions')" button-class="fl-tool fl-tool-drop" test-id="tb-table-more" :disabled="ro" :entries="() => tableMoreEntries(ui)">
      <TableProperties :size="ICON" />
      <ChevronDown :size="12" class="fl-caret" />
    </MenuButton>
  </Labelled>
</template>
