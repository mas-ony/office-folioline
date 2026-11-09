<script setup lang="ts">
/** Pick a table size by hovering a grid; the grid grows as the pointer reaches its edge. */
import { cx, keepFocus } from '@folioline/core/views';
import { computed, ref } from 'vue';
import { useT } from './context';

defineProps<{ label: string }>();
const emit = defineEmits<{ pick: [rows: number, cols: number] }>();

const t = useT();
const hover = ref({ r: 1, c: 1 });
const rows = computed(() => Math.min(12, Math.max(6, hover.value.r + 1)));
const cols = computed(() => Math.min(12, Math.max(6, hover.value.c + 1)));
</script>

<template>
  <div class="fl-table-grid" data-testid="table-grid">
    <div class="fl-grid" role="grid" :aria-label="label">
      <div v-for="r in rows" :key="r - 1" class="fl-grid-row" role="row">
        <button
          v-for="c in cols"
          :key="c - 1"
          type="button"
          role="gridcell"
          :aria-label="t('table.gridLabel', { cols: c, rows: r })"
          :class="cx('fl-grid-cell', r - 1 < hover.r && c - 1 < hover.c && 'is-on')"
          @mousedown="keepFocus"
          @mouseenter="hover = { r, c }"
          @focus="hover = { r, c }"
          @click="emit('pick', r, c)"
        />
      </div>
    </div>
    <div class="fl-grid-label" aria-live="polite">{{ t('table.gridLabel', { cols: hover.c, rows: hover.r }) }}</div>
  </div>
</template>
