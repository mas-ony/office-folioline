<script setup lang="ts">
/** Controls inside a menu: the table size grid, or the header and footer distances. */
import type { MenuWidget } from '@folioline/core/views';
import DistanceField from './DistanceField.vue';
import TableGrid from './TableGrid.vue';

const props = defineProps<{ widget: MenuWidget }>();
const emit = defineEmits<{ close: [] }>();

const pick = (rows: number, cols: number) => {
  if (props.widget.kind !== 'tableGrid') return;
  emit('close');
  props.widget.onPick(rows, cols);
};
</script>

<template>
  <TableGrid v-if="widget.kind === 'tableGrid'" :label="widget.label" @pick="pick" />
  <div v-else class="fl-menu-fields" @click.stop>
    <DistanceField v-for="f in widget.fields" :key="f.testId" :field="f" />
  </div>
</template>
