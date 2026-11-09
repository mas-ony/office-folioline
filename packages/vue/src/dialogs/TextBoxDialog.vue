<script setup lang="ts">
import { emuToField, fieldToEmu, rulerUsesMetric, TEXT_BOX_MIN, TEXT_BOX_NEW } from '@folioline/core/views';
import { ref } from 'vue';
import Check from '../controls/Check.vue';
import Modal from '../controls/Modal.vue';
import Row from '../controls/Row.vue';
import { useT, useUI } from '../context';
import { vNumberValue, vValue } from '../directives';

const t = useT();
const { ui, editor } = useUI();
const current = editor.textBoxAt();
const text = ref(current?.info.text ?? t('textBox.default'));
const metric = rulerUsesMetric();
const unitKey = metric ? 'common.centimeters' : 'common.inches';
const w = ref(emuToField(current?.info.width ?? TEXT_BOX_NEW.width, metric));
const h = ref(emuToField(current?.info.height ?? TEXT_BOX_NEW.height, metric));
const border = ref(current?.info.border ?? true);
const close = () => ui.openModal(null);
const ok = () => {
  const width = Math.max(TEXT_BOX_MIN.width, fieldToEmu(w.value, metric, current?.info.width) || TEXT_BOX_NEW.width);
  const height = Math.max(TEXT_BOX_MIN.height, fieldToEmu(h.value, metric, current?.info.height) || TEXT_BOX_NEW.height);
  const info = { text: text.value, width, height, border: border.value };
  if (current) editor.updateTextBox(current.pos, info);
  else editor.insertTextBox(info);
  close();
  editor.focus();
};
</script>

<template>
  <Modal :title="current ? t('textBox.editTitle') : t('textBox.title')" test-id="textbox-dialog" @close="close">
    <label class="fl-field-label" for="tb-text">{{ t('textBox.text') }}</label>
    <textarea id="tb-text" v-value="text" class="fl-input" rows="4" data-testid="textbox-text" @input="text = ($event.target as HTMLTextAreaElement).value" />
    <Row :label="t('textBox.width')" html-for="tb-w" :unit="t(unitKey)"><input id="tb-w" v-number-value="w" class="fl-input" type="number" step="0.1" :min="emuToField(TEXT_BOX_MIN.width, metric)" @input="w = ($event.target as HTMLInputElement).value" /></Row>
    <Row :label="t('textBox.height')" html-for="tb-h" :unit="t(unitKey)"><input id="tb-h" v-number-value="h" class="fl-input" type="number" step="0.1" :min="emuToField(TEXT_BOX_MIN.height, metric)" @input="h = ($event.target as HTMLInputElement).value" /></Row>
    <Check :label="t('textBox.border')" :checked="border" @change="(v) => (border = v)" />
    <template #footer>
      <button type="button" class="fl-btn" @click="close">{{ t('common.cancel') }}</button>
      <button type="button" class="fl-btn is-primary" data-testid="textbox-ok" @click="ok">{{ current ? t('common.apply') : t('common.insert') }}</button>
    </template>
  </Modal>
</template>
