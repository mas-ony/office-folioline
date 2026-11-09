<script setup lang="ts">
import type { MessageKey } from '@folioline/core';
import { CHANGED_LINES, DEFAULT_MARKUP, DELETION_STYLES, INSERTION_STYLES, MARKUP_BACK_COLORS, MARKUP_TEXT_COLORS, type RevisionMarkup } from '@folioline/core/views';
import { shallowRef } from 'vue';
import Check from '../controls/Check.vue';
import Modal from '../controls/Modal.vue';
import { useT, useUI } from '../context';
import { vValue } from '../directives';
import ColorSelect from './ColorSelect.vue';
import TrackMarkRow from './TrackMarkRow.vue';

type Cell = 'insertedCells' | 'deletedCells' | 'mergedCells' | 'splitCells';
const CELLS: [Cell, MessageKey][] = [['insertedCells', 'track.insertedCells'], ['deletedCells', 'track.deletedCells'], ['mergedCells', 'track.mergedCells'], ['splitCells', 'track.splitCells']];

const t = useT();
const { ui, editor } = useUI();
const o = shallowRef<RevisionMarkup>(editor.revisionMarkup);
const set = (k: keyof RevisionMarkup, v: unknown) => (o.value = { ...o.value, [k]: v });
const close = () => ui.openModal(null);
const ok = () => {
  ui.setRevisionMarkup(o.value);
  close();
};
</script>

<template>
  <Modal :title="t('track.title')" test-id="track-options-dialog" wide @close="close">
    <fieldset class="fl-fieldset">
      <legend>{{ t('track.markup') }}</legend>
      <TrackMarkRow kind="insertions" name="track.insertions" :styles="INSERTION_STYLES" :markup="o" @set="set" />
      <TrackMarkRow kind="deletions" name="track.deletions" :styles="DELETION_STYLES" :markup="o" @set="set" />
      <div class="fl-track-row">
        <label for="to-lines">{{ t('track.changedLines') }}</label>
        <select id="to-lines" v-value="o.changedLines" class="fl-input" data-testid="to-changed-lines" @change="set('changedLines', ($event.target as HTMLSelectElement).value)">
          <option v-for="s in CHANGED_LINES" :key="s" :value="s">{{ t(`track.v.${s}` as MessageKey) }}</option>
        </select>
        <ColorSelect :label="t('track.color', { name: t('track.changedLines') })" :value="o.changedLinesColor" :special="['auto', 'byAuthor']" :colors="MARKUP_TEXT_COLORS" @change="(v) => set('changedLinesColor', v)" />
      </div>
    </fieldset>
    <fieldset class="fl-fieldset">
      <legend>{{ t('track.moves') }}</legend>
      <Check :label="t('track.trackMoves')" :hint="t('track.trackMovesNote')" :checked="o.trackMoves" @change="(v) => set('trackMoves', v)" />
      <TrackMarkRow kind="movedFrom" name="track.movedFrom" :styles="DELETION_STYLES" :markup="o" @set="set" />
      <TrackMarkRow kind="movedTo" name="track.movedTo" :styles="INSERTION_STYLES" :markup="o" @set="set" />
    </fieldset>
    <fieldset class="fl-fieldset">
      <legend>{{ t('track.tableCells') }}</legend>
      <div class="fl-track-cells">
        <div v-for="[k, name] in CELLS" :key="k" class="fl-track-cell">
          <label>{{ t(name) }}</label>
          <ColorSelect :label="t(name)" :value="o[k]" :special="[]" :colors="MARKUP_BACK_COLORS" @change="(v) => set(k, v)" />
        </div>
      </div>
    </fieldset>
    <fieldset class="fl-fieldset">
      <legend>{{ t('track.formatting') }}</legend>
      <Check :label="t('track.trackFormatting')" :hint="t('track.trackFormattingNote')" :checked="o.trackFormatting" test-id="to-track-formatting" @change="(v) => set('trackFormatting', v)" />
    </fieldset>
    <template #leftFooter><button type="button" class="fl-btn" data-testid="to-reset" @click="o = { ...DEFAULT_MARKUP }">{{ t('track.reset') }}</button></template>
    <template #footer>
      <button type="button" class="fl-btn" @click="close">{{ t('common.cancel') }}</button>
      <button type="button" class="fl-btn is-primary" data-testid="to-ok" @click="ok">{{ t('common.ok') }}</button>
    </template>
  </Modal>
</template>
