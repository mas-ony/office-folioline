<script setup lang="ts">
/** A message at the bottom; the interface takes it away after a few seconds. */
import { useUI } from '../context';

defineProps<{ message: string }>();
const { layer } = useUI();
</script>

<template>
  <Teleport :to="layer">
    <div class="fl-toast" role="status" data-testid="toast">{{ message }}</div>
  </Teleport>
</template>
