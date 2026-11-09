<script setup lang="ts">
import { Paintbrush, RemoveFormatting } from '@lucide/vue';
import { useCommands, useSnapshot, useT } from '../context';
import Tool from './Tool.vue';
import { ICON, useReadOnly, type Variant } from './types';

defineProps<{ variant: Variant }>();
const t = useT();
const cmd = useCommands();
const painter = useSnapshot((s) => s.painter);
const ro = useReadOnly();
</script>

<template>
  <Tool :variant="variant" :label="t('toolbar.formatPainter')" :active="painter" :disabled="ro" test-id="tb-painter" data-slot="format.painter" @click="cmd.formatPainter()"><Paintbrush :size="ICON" /></Tool>
  <Tool :variant="variant" :label="t('toolbar.clearFormatting')" :disabled="ro" test-id="tb-clear" data-slot="format.clear" @click="cmd.clearFormatting()"><RemoveFormatting :size="ICON" /></Tool>
</template>
