<script setup lang="ts">
import { splitCellInto, splitLimits } from '@folioline/core/views';
import { computed, ref } from 'vue';
import Modal from '../controls/Modal.vue';
import Row from '../controls/Row.vue';
import { useT, useUI } from '../context';
import { vNumberValue } from '../directives';

const t = useT();
const { ui, editor } = useUI();
const lim = splitLimits(editor.activeView.state);
const cols = ref(lim && lim.cell.colspan > 1 ? String(lim.cell.colspan) : '2');
const rows = ref(lim && lim.cell.rowspan > 1 ? String(lim.cell.rowspan) : '1');
const close = () => ui.openModal(null);
const check = computed(() => {
  if (!lim) return { c: 0, r: 0, colsOk: false, rowsOk: false, ok: false };
  const c = Number(cols.value);
  const r = Number(rows.value);
  const colsOk = Number.isInteger(c) && c >= 1 && c <= lim.maxCols && (lim.cell.colspan === 1 || lim.cell.colspan % c === 0);
  const rowsOk = Number.isInteger(r) && r >= 1 && r <= lim.maxRows && (lim.cell.rowspan === 1 || lim.cell.rowspan % r === 0);
  return { c, r, colsOk, rowsOk, ok: colsOk && rowsOk && (c > 1 || r > 1) };
});
const submit = () => {
  if (!lim) return;
  if (!splitCellInto(editor.activeView, check.value.r, check.value.c)) ui.toast(t('splitCell.range', { max: lim.maxCols }));
  close();
  editor.focus();
};
</script>

<template>
  <Modal v-if="lim" :title="t('splitCell.title')" test-id="split-cell-dialog" @close="close">
    <Row :label="t('splitCell.columns')" html-for="sc-cols"><input id="sc-cols" v-number-value="cols" class="fl-input" type="number" min="1" :max="lim.maxCols" data-testid="split-cols" @input="cols = ($event.target as HTMLInputElement).value" /></Row>
    <Row :label="t('splitCell.rows')" html-for="sc-rows"><input id="sc-rows" v-number-value="rows" class="fl-input" type="number" min="1" :max="lim.maxRows" data-testid="split-rows" @input="rows = ($event.target as HTMLInputElement).value" /></Row>
    <p v-if="!check.colsOk" class="fl-error">{{ t('splitCell.range', { max: lim.maxCols }) }}</p>
    <p v-if="check.colsOk && !check.rowsOk" class="fl-error">{{ t('splitCell.range', { max: lim.maxRows }) }}</p>
    <template #footer>
      <button type="button" class="fl-btn" @click="close">{{ t('common.cancel') }}</button>
      <button type="button" class="fl-btn is-primary" :disabled="!check.ok" data-testid="split-submit" @click="submit">{{ t('splitCell.submit') }}</button>
    </template>
  </Modal>
</template>
