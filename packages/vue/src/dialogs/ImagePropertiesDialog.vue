<script setup lang="ts">
import type { MessageKey } from '@folioline/core';
import { EMU_PER_PT, emuToField, fieldToEmu, H_RELATIVE, imageLink, naturalSize, rulerUsesMetric, selectedImage, setImageProps, V_RELATIVE, WRAP_KINDS, type WrapKind, wrapKind, wrapLabelKey } from '@folioline/core/views';
import { computed, ref } from 'vue';
import Check from '../controls/Check.vue';
import Modal from '../controls/Modal.vue';
import Row from '../controls/Row.vue';
import Section from '../controls/Section.vue';
import { useT, useUI } from '../context';
import { vNumberValue, vValue } from '../directives';

const t = useT();
const { ui, editor } = useUI();
const img = selectedImage(editor.activeView.state);
const a = img?.node.attrs;
const w = ref(a ? String(Math.round((a.width / EMU_PER_PT) * 10) / 10) : '');
const h = ref(a ? String(Math.round((a.height / EMU_PER_PT) * 10) / 10) : '');
const lock = ref(true);
const title = ref<string>(a?.title ?? '');
const alt = ref<string>(a?.alt ?? '');
const href = ref(img ? imageLink(img.node) : '');
const wrap = ref<WrapKind>(wrapKind(a?.anchor ?? null));
const anchor = a?.anchor ?? null;
const metric = rulerUsesMetric();
const unitKey = metric ? 'common.centimeters' : 'common.inches';
// The position as its fields first show it. The fields hold only what is typed or picked (undefined
// until then), and only that is applied, so a picture placed by an alignment keeps it.
const shown = {
  hOff: anchor?.hOffset !== undefined ? emuToField(anchor.hOffset, metric) : '0',
  vOff: anchor?.vOffset !== undefined ? emuToField(anchor.vOffset, metric) : '0',
  hRel: anchor?.hRelative ?? 'column',
  vRel: anchor?.vRelative ?? 'paragraph',
};
const hOff = ref<string>();
const vOff = ref<string>();
const hRel = ref<string>();
const vRel = ref<string>();
const error = ref('');
const close = () => ui.openModal(null);
const ratio = a ? a.height / a.width : 1;
const setWidth = (v: string) => {
  w.value = v;
  const n = Number(v);
  if (lock.value && n > 0) h.value = String(Math.round(n * ratio * 10) / 10);
};
const setHeight = (v: string) => {
  h.value = v;
  const n = Number(v);
  if (lock.value && n > 0) w.value = String(Math.round((n / ratio) * 10) / 10);
};
const floating = computed(() => wrap.value !== 'inline');
const apply = () => {
  if (!img) return;
  const wn = Number(w.value);
  const hn = Number(h.value);
  if (!(wn > 0 && hn > 0)) {
    error.value = t('imageProps.invalidSize');
    return;
  }
  const patch: Parameters<typeof setImageProps>[2] = { width: wn * EMU_PER_PT, height: hn * EMU_PER_PT, title: title.value, alt: alt.value, wrap: wrap.value, href: href.value };
  if (floating.value && anchor && wrap.value === wrapKind(anchor)) {
    if (hOff.value !== undefined) patch.hOffset = fieldToEmu(hOff.value, metric, anchor.hOffset);
    if (vOff.value !== undefined) patch.vOffset = fieldToEmu(vOff.value, metric, anchor.vOffset);
    if (hRel.value !== undefined) patch.hRelative = hRel.value;
    if (vRel.value !== undefined) patch.vRelative = vRel.value;
  }
  setImageProps(editor.activeView, img.pos, patch);
  close();
  editor.focus();
};
const reset = async () => {
  if (!a) return;
  const n = await naturalSize(a.src || editor.docx.mediaUrl(a.mediaPath));
  if (n) {
    w.value = String(Math.round((n.width / EMU_PER_PT) * 10) / 10);
    h.value = String(Math.round((n.height / EMU_PER_PT) * 10) / 10);
  }
};
const relKey = (r: string) => `imageProps.${r}` as MessageKey;
const value = (e: Event) => (e.target as HTMLInputElement).value;
</script>

<template>
  <Modal v-if="img && a" :title="t('imageProps.title')" test-id="image-props-dialog" @close="close">
    <Section :title="t('imageProps.dimensions')">
      <Row :label="t('imageProps.width')" html-for="ip-w" :unit="t('common.points')"><input id="ip-w" v-number-value="w" class="fl-input" type="number" min="1" data-testid="ip-width" @input="setWidth(value($event))" /></Row>
      <Row :label="t('imageProps.height')" html-for="ip-h" :unit="t('common.points')"><input id="ip-h" v-number-value="h" class="fl-input" type="number" min="1" data-testid="ip-height" @input="setHeight(value($event))" /></Row>
      <Check :label="t('imageProps.lockAspect')" :checked="lock" @change="(v) => (lock = v)" />
      <button type="button" class="fl-link" @click="reset">{{ t('imageProps.reset') }}</button>
    </Section>
    <Section :title="t('imageProps.position')">
      <template v-if="floating && anchor">
        <Row :label="t('imageProps.horizontal')" html-for="ip-ho" :unit="t(unitKey)"><input id="ip-ho" v-number-value="hOff ?? shown.hOff" class="fl-input" type="number" step="0.1" @input="hOff = value($event)" /></Row>
        <Row :label="t('imageProps.relativeH')" html-for="ip-hr">
          <select id="ip-hr" v-value="hRel ?? shown.hRel" class="fl-input" @change="hRel = value($event)"><option v-for="r in H_RELATIVE" :key="r" :value="r">{{ t(relKey(r)) }}</option></select>
        </Row>
        <Row :label="t('imageProps.vertical')" html-for="ip-vo" :unit="t(unitKey)"><input id="ip-vo" v-number-value="vOff ?? shown.vOff" class="fl-input" type="number" step="0.1" @input="vOff = value($event)" /></Row>
        <Row :label="t('imageProps.relativeV')" html-for="ip-vr">
          <select id="ip-vr" v-value="vRel ?? shown.vRel" class="fl-input" @change="vRel = value($event)"><option v-for="r in V_RELATIVE" :key="r" :value="r">{{ t(relKey(r)) }}</option></select>
        </Row>
      </template>
      <p v-else class="fl-note">{{ t('imageProps.positionInline') }}</p>
    </Section>
    <Section :title="t('imageProps.altText')">
      <Row :label="t('imageProps.altTitle')" html-for="ip-title"><input id="ip-title" v-value="title" class="fl-input" @input="title = value($event)" /></Row>
      <Row :label="t('imageProps.description')" html-for="ip-desc"><textarea id="ip-desc" v-value="alt" class="fl-input" rows="3" :placeholder="t('imageProps.descriptionPlaceholder')" data-testid="ip-alt" @input="alt = value($event)" /></Row>
    </Section>
    <Section :title="t('imageProps.hyperlink')">
      <Row :label="t('link.url')" html-for="ip-href"><input id="ip-href" v-value="href" class="fl-input" placeholder="https://example.com" @input="href = value($event)" /></Row>
    </Section>
    <Section :title="t('imageProps.textWrapping')">
      <Row :label="t('image.wrap')" html-for="ip-wrap">
        <select id="ip-wrap" v-value="wrap" class="fl-input" data-testid="ip-wrap" @change="wrap = value($event) as WrapKind">
          <option v-for="k in WRAP_KINDS" :key="k" :value="k">{{ t(wrapLabelKey(k)) }}</option>
        </select>
      </Row>
    </Section>
    <p v-if="error" class="fl-error" role="alert">{{ error }}</p>
    <template #footer>
      <button type="button" class="fl-btn" @click="close">{{ t('common.cancel') }}</button>
      <button type="button" class="fl-btn is-primary" data-testid="image-props-apply" @click="apply">{{ t('common.apply') }}</button>
    </template>
  </Modal>
</template>
