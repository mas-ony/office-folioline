<script setup lang="ts">
import { highlightCss, setHighlight, setTextColor } from '@folioline/core/views';
import { Baseline, Bold, Highlighter, Italic, Link2, Strikethrough, Underline } from '@lucide/vue';
import { computed, ref } from 'vue';
import ColorPicker from '../ColorPicker.vue';
import { useCommands, useT, useUI } from '../context';
import HighlightPicker from '../HighlightPicker.vue';
import ColorSplit from './ColorSplit.vue';
import Labelled from './Labelled.vue';
import Tool from './Tool.vue';
import { ICON, useCursor, useReadOnly, type Variant } from './types';

defineProps<{ variant: Variant }>();
const t = useT();
const { ui, editor } = useUI();
const cmd = useCommands();
const cursor = useCursor();
const ro = useReadOnly();
// The last colours used are the interface's (not reactive): shown again after a pick or a move.
const tick = ref(0);
const tools = computed(() => {
  void tick.value;
  void cursor.value;
  return { color: ui.tools.color, highlight: ui.tools.highlight };
});
const marks = computed(() => [
  { icon: Bold, label: t('toolbar.bold'), active: !!cursor.value?.bold, testId: 'tb-bold', slot: 'text.bold', run: cmd.bold },
  { icon: Italic, label: t('toolbar.italic'), active: !!cursor.value?.italic, testId: 'tb-italic', slot: 'text.italic', run: cmd.italic },
  { icon: Underline, label: t('toolbar.underline'), active: !!cursor.value?.underline, testId: 'tb-underline', slot: 'text.underline', run: cmd.underline },
  { icon: Strikethrough, label: t('toolbar.strikethrough'), active: !!cursor.value?.strike, testId: 'tb-strike', slot: 'text.strike', run: cmd.strike },
]);

const applyColor = () => {
  setTextColor(editor.activeView, ui.tools.color);
  editor.focus();
};
const pickColor = (hex: string | null, close: () => void) => {
  close();
  if (hex) ui.tools.color = hex;
  tick.value++;
  setTextColor(editor.activeView, hex);
  editor.focus();
};
const applyHighlight = () => {
  setHighlight(editor.activeView, ui.tools.highlight);
  editor.focus();
};
const pickHighlight = (name: string | null, close: () => void) => {
  close();
  if (name) ui.tools.highlight = name;
  tick.value++;
  setHighlight(editor.activeView, name);
  editor.focus();
};
</script>

<template>
  <div v-if="variant === 'menu'" class="fl-tool-line">
    <Tool v-for="m in marks" :key="m.testId" variant="bar" :label="m.label" :active="m.active" :disabled="ro" :test-id="m.testId" :data-slot="m.slot" @click="m.run()"><component :is="m.icon" :size="ICON" /></Tool>
  </div>
  <Tool v-for="m in marks" v-else :key="m.testId" variant="bar" :label="m.label" :active="m.active" :disabled="ro" :test-id="m.testId" :data-slot="m.slot" @click="m.run()"><component :is="m.icon" :size="ICON" /></Tool>
  <Labelled :label="t('toolbar.fontColor')" :variant="variant">
    <ColorSplit data-slot="text.color" :label="t('toolbar.fontColor')" :color="`#${tools.color}`" test-id="tb-color" :disabled="ro" @apply="applyColor">
      <template #icon><Baseline :size="ICON" /></template>
      <template #panel="{ close }"><ColorPicker :label="t('toolbar.fontColor')" :value="cursor?.color ?? null" :docx="editor.docx" @pick="(hex) => pickColor(hex, close)" /></template>
    </ColorSplit>
  </Labelled>
  <Labelled :label="t('toolbar.highlight')" :variant="variant">
    <ColorSplit data-slot="text.highlight" :label="t('toolbar.highlight')" :color="highlightCss(tools.highlight)" test-id="tb-highlight" :disabled="ro" @apply="applyHighlight">
      <template #icon><Highlighter :size="ICON" /></template>
      <template #panel="{ close }"><HighlightPicker :label="t('toolbar.highlight')" :value="cursor?.highlight ?? null" @pick="(name) => pickHighlight(name, close)" /></template>
    </ColorSplit>
  </Labelled>
  <Tool :variant="variant" :label="t('toolbar.insertLink')" :active="!!cursor?.link" :disabled="ro" test-id="tb-link" data-slot="text.link" @click="cmd.link()"><Link2 :size="ICON" /></Tool>
</template>
