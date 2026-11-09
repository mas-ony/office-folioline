<script setup lang="ts">
import { shortcut } from '@folioline/core/views';
import { Subscript, Superscript } from '@lucide/vue';
import { useCommands, useT } from '../context';
import Tool from './Tool.vue';
import { ICON, useCursor, useReadOnly, type Variant } from './types';

defineProps<{ variant: Variant }>();
const t = useT();
const cmd = useCommands();
const cursor = useCursor();
const ro = useReadOnly();
</script>

<template>
  <Tool :variant="variant" :label="t('toolbar.superscript')" :title="`${t('toolbar.superscript')} (${shortcut('Ctrl+Shift+=')})`" :active="!!cursor?.superscript" :disabled="ro" test-id="tb-superscript" data-slot="script.superscript" @click="cmd.superscript()"><Superscript :size="ICON" /></Tool>
  <Tool :variant="variant" :label="t('toolbar.subscript')" :title="`${t('toolbar.subscript')} (${shortcut('Ctrl+=')})`" :active="!!cursor?.subscript" :disabled="ro" test-id="tb-subscript" data-slot="script.subscript" @click="cmd.subscript()"><Subscript :size="ICON" /></Tool>
</template>
