<script setup lang="ts">
/** Avatar with an author's initials and colour. */
import { cx, initials } from '@folioline/core/views';

withDefaults(defineProps<{ name: string; color: string; size?: 'sm' | 'md' }>(), { size: 'md' });
</script>

<template>
  <span :class="cx('fl-avatar', `is-${size}`)" :style="{ background: color }" aria-hidden="true">{{ initials(name) }}</span>
</template>
