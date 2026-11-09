<script setup lang="ts">
import { lineSpacingEntries } from '@folioline/core/views';
import { ChevronDown, List, ListChevronsUpDown, ListIndentDecrease, ListIndentIncrease, ListOrdered } from '@lucide/vue';
import { useCommands, useT, useUI } from '../context';
import MenuButton from '../MenuButton.vue';
import MenuList from '../MenuList.vue';
import Labelled from './Labelled.vue';
import Tool from './Tool.vue';
import { ICON, useCursor, useReadOnly, type Variant } from './types';

defineProps<{ variant: Variant }>();
const t = useT();
const { ui, snapshot } = useUI();
const cmd = useCommands();
const cursor = useCursor();
const ro = useReadOnly();
</script>

<template>
  <Tool :variant="variant" :label="t('toolbar.bulletList')" :active="cursor?.listKind === 'bullet'" :disabled="ro" test-id="tb-bullets" data-slot="lists.bullet" @click="cmd.bulletList()"><List :size="ICON" /></Tool>
  <Tool :variant="variant" :label="t('toolbar.numberedList')" :active="cursor?.listKind === 'ordered'" :disabled="ro" test-id="tb-numbers" data-slot="lists.numbered" @click="cmd.numberedList()"><ListOrdered :size="ICON" /></Tool>
  <Tool :variant="variant" :label="t('toolbar.decreaseIndent')" :disabled="ro || !cursor?.canOutdent" test-id="tb-outdent" data-slot="lists.outdent" @click="cmd.outdent()"><ListIndentDecrease :size="ICON" /></Tool>
  <Tool :variant="variant" :label="t('toolbar.increaseIndent')" :disabled="ro" test-id="tb-indent" data-slot="lists.indent" @click="cmd.indent()"><ListIndentIncrease :size="ICON" /></Tool>
  <Labelled :label="t('toolbar.lineSpacing')" :variant="variant">
    <MenuButton :label="t('toolbar.lineSpacing')" button-class="fl-tool fl-tool-drop" test-id="tb-line-spacing" :disabled="ro">
      <ListChevronsUpDown :size="ICON" />
      <ChevronDown :size="12" class="fl-caret" />
      <template #menu="{ close }"><MenuList :entries="lineSpacingEntries(ui, snapshot)" :label="t('toolbar.lineSpacing')" @close="close" /></template>
    </MenuButton>
  </Labelled>
</template>
