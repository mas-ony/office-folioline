<script setup lang="ts">
import type { MessageKey } from '@folioline/core';
import { fieldToTwips, PAGE_SIZES, pageSizeLabel, rulerUsesMetric, twipsToField } from '@folioline/core/views';
import { ref, shallowRef } from 'vue';
import Modal from '../controls/Modal.vue';
import Row from '../controls/Row.vue';
import Section from '../controls/Section.vue';
import { useT, useUI } from '../context';
import { vNumberValue, vValue } from '../directives';

type Margin = 'top' | 'bottom' | 'left' | 'right';
const MARGINS: [Margin, MessageKey][] = [['top', 'pageSetup.top'], ['bottom', 'pageSetup.bottom'], ['left', 'pageSetup.left'], ['right', 'pageSetup.right']];

const t = useT();
const { ui, editor } = useUI();
const cur = editor.pageSetup();
const metric = rulerUsesMetric();
const unitKey = metric ? 'common.centimeters' : 'common.inches';
const field = (tw: number) => twipsToField(tw, metric);
const short = Math.min(cur.width, cur.height);
const long = Math.max(cur.width, cur.height);
const match = PAGE_SIZES.find((p) => Math.abs(p.w - short) < 30 && Math.abs(p.h - long) < 30);
const size = ref(match?.id ?? 'custom');
const cw = ref(field(short));
const ch = ref(field(long));
const orient = ref(cur.orient);
const m = shallowRef<Record<Margin, string>>({ top: field(cur.margins.top), bottom: field(cur.margins.bottom), left: field(cur.margins.left), right: field(cur.margins.right) });
const scope = ref<'document' | 'section'>('document');
const error = ref('');
const close = () => ui.openModal(null);
const apply = () => {
  const preset = PAGE_SIZES.find((p) => p.id === size.value);
  const twips = (s: string, original: number) => fieldToTwips(s, metric, original);
  const w = preset ? preset.w : twips(cw.value, short);
  const h = preset ? preset.h : twips(ch.value, long);
  const margins = { top: twips(m.value.top, cur.margins.top), bottom: twips(m.value.bottom, cur.margins.bottom), left: twips(m.value.left, cur.margins.left), right: twips(m.value.right, cur.margins.right) };
  if (![w, h, ...Object.values(margins)].every((v) => Number.isFinite(v) && v >= 0) || w < 1440 || h < 1440) {
    error.value = t('pageSetup.invalid');
    return;
  }
  if (!editor.applyPageSetup({ width: w, height: h, orient: orient.value, margins }, scope.value)) {
    error.value = t('pageSetup.invalid');
    return;
  }
  close();
  editor.focus();
};
const value = (e: Event) => (e.target as HTMLInputElement).value;
</script>

<template>
  <Modal :title="t('pageSetup.title')" test-id="page-setup-dialog" @close="close">
    <Section :title="t('pageSetup.pageSize')">
      <Row :label="t('pageSetup.size')" html-for="ps-size">
        <select id="ps-size" v-value="size" class="fl-input" data-testid="ps-size" @change="size = value($event)">
          <option v-for="p in PAGE_SIZES" :key="p.id" :value="p.id">{{ pageSizeLabel(p, metric, t('common.centimeters')) }}</option>
          <option value="custom">{{ t('pageSetup.custom') }}</option>
        </select>
      </Row>
      <template v-if="size === 'custom'">
        <Row :label="t('pageSetup.width')" html-for="ps-w" :unit="t(unitKey)"><input id="ps-w" v-number-value="cw" type="number" step="0.1" :min="field(1440)" class="fl-input" @input="cw = value($event)" /></Row>
        <Row :label="t('pageSetup.height')" html-for="ps-h" :unit="t(unitKey)"><input id="ps-h" v-number-value="ch" type="number" step="0.1" :min="field(1440)" class="fl-input" @input="ch = value($event)" /></Row>
      </template>
      <Row :label="t('pageSetup.orientation')" html-for="ps-orient">
        <select id="ps-orient" v-value="orient" class="fl-input" data-testid="ps-orientation" @change="orient = value($event) as 'portrait' | 'landscape'">
          <option value="portrait">{{ t('pageSetup.portrait') }}</option>
          <option value="landscape">{{ t('pageSetup.landscape') }}</option>
        </select>
      </Row>
    </Section>
    <Section :title="t('pageSetup.margins')">
      <Row v-for="[k, label] in MARGINS" :key="k" :label="t(label)" :html-for="`ps-${k}`" :unit="t(unitKey)">
        <input :id="`ps-${k}`" v-number-value="m[k]" role="spinbutton" type="number" step="0.1" min="0" class="fl-input" :data-testid="`ps-${k}`" @input="m = { ...m, [k]: value($event) }" />
      </Row>
      <Row :label="t('pageSetup.applyTo')" html-for="ps-scope">
        <select id="ps-scope" v-value="scope" class="fl-input" data-testid="ps-scope" @change="scope = value($event) as 'document' | 'section'">
          <option value="document">{{ t('pageSetup.wholeDocument') }}</option>
          <option value="section">{{ t('pageSetup.thisSection') }}</option>
        </select>
      </Row>
    </Section>
    <p v-if="error" class="fl-error" role="alert">{{ error }}</p>
    <template #footer>
      <button type="button" class="fl-btn" @click="close">{{ t('common.cancel') }}</button>
      <button type="button" class="fl-btn is-primary" data-testid="ps-apply" @click="apply">{{ t('common.apply') }}</button>
    </template>
  </Modal>
</template>
