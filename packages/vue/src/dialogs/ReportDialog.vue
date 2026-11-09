<script setup lang="ts">
import { diagnostics, reportText, shortcut } from '@folioline/core/views';
import { computed, ref } from 'vue';
import Modal from '../controls/Modal.vue';
import { useT, useUI } from '../context';
import { vValue } from '../directives';

const t = useT();
const { ui, editor } = useUI();
const what = ref('');
const details = ref<HTMLTextAreaElement | null>(null);
const info = diagnostics(editor);
const report = computed(() => reportText(what.value, info));
const close = () => ui.openModal(null);
const copy = async () => {
  try {
    if (!navigator.clipboard?.writeText) throw new Error('clipboard');
    await navigator.clipboard.writeText(report.value);
    ui.toast(t('report.copied'));
  } catch {
    details.value?.select();
    ui.toast(t('context.copyBlocked', { shortcut: shortcut('Ctrl+C') }));
  }
};
</script>

<template>
  <Modal :title="t('report.title')" test-id="report-dialog" wide @close="close">
    <p class="fl-note">{{ t('report.intro') }}</p>
    <label class="fl-field-label" for="report-what">{{ t('report.what') }}</label>
    <textarea id="report-what" v-value="what" class="fl-input" rows="4" @input="what = ($event.target as HTMLTextAreaElement).value" />
    <label class="fl-field-label" for="report-details">{{ t('report.details') }}</label>
    <textarea id="report-details" ref="details" v-value="report" class="fl-input fl-mono" rows="8" readonly data-testid="report-details" />
    <template #leftFooter><button type="button" class="fl-btn" @click="ui.files.downloadDocx()">{{ t('report.download') }}</button></template>
    <template #footer>
      <button type="button" class="fl-btn" @click="close">{{ t('common.close') }}</button>
      <button type="button" class="fl-btn is-primary" data-testid="report-copy" @click="copy">{{ t('report.copy') }}</button>
    </template>
  </Modal>
</template>
