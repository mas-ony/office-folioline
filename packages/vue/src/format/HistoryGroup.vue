<script setup lang="ts">
import { Redo2, Undo2 } from '@lucide/vue';
import { useSnapshot, useT, useUI } from '../context';
import Tool from './Tool.vue';
import { ICON, type Variant } from './types';

defineProps<{ variant: Variant }>();
const t = useT();
const { editor } = useUI();
const canUndo = useSnapshot((s) => s.canUndo);
const canRedo = useSnapshot((s) => s.canRedo);
</script>

<template>
  <Tool :variant="variant" :label="t('toolbar.undo')" :title="canUndo ? t('toolbar.undo') : t('toolbar.nothingToUndo')" :disabled="!canUndo" test-id="tb-undo" data-slot="history.undo" @click="editor.undo()"><Undo2 :size="ICON" /></Tool>
  <Tool :variant="variant" :label="t('toolbar.redo')" :title="canRedo ? t('toolbar.redo') : t('toolbar.nothingToRedo')" :disabled="!canRedo" test-id="tb-redo" data-slot="history.redo" @click="editor.redo()"><Redo2 :size="ICON" /></Tool>
</template>
