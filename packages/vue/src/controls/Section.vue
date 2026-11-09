<script setup lang="ts">
/** A small-caps section heading inside a dialog. */
import { cx } from '@folioline/core/views';

defineProps<{ title: string; panelClass?: string }>();
</script>

<template>
  <section :class="cx('fl-section', panelClass)">
    <h3 class="fl-section-title">{{ title }}</h3>
    <slot />
  </section>
</template>
