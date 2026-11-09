<script setup lang="ts">
/** An icon button in the bar, or an icon-and-label row in a menu (the icon is the slot). */
import { cx, keepFocus } from '@folioline/core/views';
import type { Variant } from './types';

// `active` left out is not "not pressed" (no aria-pressed), so it is not cast to false.
withDefaults(defineProps<{ label: string; title?: string; active?: boolean; disabled?: boolean; testId?: string; variant: Variant; dataSlot?: string }>(), { active: undefined });
const emit = defineEmits<{ click: [] }>();
</script>

<template>
  <button
    type="button"
    :class="cx(variant === 'bar' ? 'fl-tool' : 'fl-tool-row', active && 'is-active')"
    :aria-label="label"
    :title="title ?? label"
    :aria-pressed="active === undefined ? undefined : active"
    :disabled="disabled"
    :data-testid="testId"
    :data-slot="dataSlot"
    @mousedown="keepFocus"
    @click="emit('click')"
  >
    <slot />
    <span v-if="variant === 'menu'" class="fl-tool-label">{{ label }}</span>
  </button>
</template>
