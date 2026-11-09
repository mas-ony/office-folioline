<script setup lang="ts">
import { type FoliolineOptions, FoliolineEditor } from '@folioline/vue';
import { connectShell } from '@folioline/web-shared/shell';

defineProps<{ options: FoliolineOptions }>();
</script>

<template>
  <FoliolineEditor v-bind="options" @ready="connectShell" />
</template>
