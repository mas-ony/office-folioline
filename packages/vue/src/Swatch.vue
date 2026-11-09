<script setup lang="ts">
/** A colour to pick. */
import { cx, keepFocus } from '@folioline/core/views';

defineProps<{ hex: string; label: string; selected: boolean }>();
const emit = defineEmits<{ pick: [] }>();
</script>

<template>
  <button
    type="button"
    :class="cx('fl-swatch', selected && 'is-selected', hex === 'FFFFFF' && 'is-light')"
    :style="{ background: `#${hex}` }"
    :aria-label="label"
    :title="label"
    @mousedown="keepFocus"
    @click="emit('pick')"
  />
</template>
