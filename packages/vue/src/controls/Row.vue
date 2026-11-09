<script setup lang="ts">
/** Label and control in one row. */
defineProps<{ label: string; htmlFor?: string; unit?: string }>();
</script>

<template>
  <div class="fl-row">
    <label class="fl-row-label" :for="htmlFor">{{ label }}</label>
    <div class="fl-row-control">
      <slot />
      <span v-if="unit" class="fl-unit">{{ unit }}</span>
    </div>
  </div>
</template>
