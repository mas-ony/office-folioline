<script setup lang="ts">
/** Folioline's icon. */
withDefaults(defineProps<{ size?: number }>(), { size: 26 });
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 32 32" aria-hidden="true" class="fl-app-icon">
    <rect x="2" y="2" width="28" height="28" rx="7" fill="var(--fl-brand, #1f5f4a)" />
    <path d="M10 8h9l4 4v12a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 9 24V9.5A1.5 1.5 0 0 1 10.5 8Z" fill="#fff" />
    <path d="M19 8v3.2c0 .5.3.8.8.8H23" fill="none" stroke="var(--fl-brand, #1f5f4a)" stroke-width="1.2" />
    <path d="M12 15h8M12 18h8M12 21h5" stroke="var(--fl-brand, #1f5f4a)" stroke-width="1.4" stroke-linecap="round" />
  </svg>
</template>
