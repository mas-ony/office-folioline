<script setup lang="ts">
/** A check box with its label (and a note under it). */
import { cx } from '@folioline/core/views';
import { vChecked } from '../directives';

defineProps<{ label: string; checked: boolean; disabled?: boolean; hint?: string; testId?: string }>();
const emit = defineEmits<{ change: [on: boolean] }>();
</script>

<template>
  <label :class="cx('fl-check', disabled && 'is-disabled')">
    <input v-checked="checked" type="checkbox" :disabled="disabled" :data-testid="testId" @change="emit('change', ($event.target as HTMLInputElement).checked)" />
    <span>{{ label }}<small v-if="hint">{{ hint }}</small></span>
  </label>
</template>
