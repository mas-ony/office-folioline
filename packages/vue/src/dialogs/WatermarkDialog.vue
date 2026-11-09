<script setup lang="ts">
import { FONT_GROUPS } from '@folioline/core';
import { cx, DEFAULT_TEXT_WATERMARK, pictureType, type TextWatermark, type Watermark, WATERMARK_PRESETS, WATERMARK_SCALES, WATERMARK_SIZES } from '@folioline/core/views';
import { computed, ref, shallowRef } from 'vue';
import Check from '../controls/Check.vue';
import Modal from '../controls/Modal.vue';
import Row from '../controls/Row.vue';
import { useT, useUI } from '../context';
import { vChecked, vNumberValue, vValue } from '../directives';
import WatermarkPreview from './WatermarkPreview.vue';

type Kind = 'none' | 'picture' | 'text';
interface Picture { mediaPath: string; name: string; scale: number | 'auto'; washout: boolean; width?: number; height?: number }

const t = useT();
const { ui, editor } = useUI();
const current = editor.watermark();
const kind = ref<Kind>(current?.kind ?? 'none');
const text = shallowRef<TextWatermark>(current?.kind === 'text' ? current : DEFAULT_TEXT_WATERMARK);
const picture = shallowRef<Picture | null>(
  current?.kind === 'picture' ? { mediaPath: current.mediaPath, name: t('watermark.noPicture'), scale: current.scale, washout: current.washout, width: current.width, height: current.height } : null,
);
const scale = ref<number | 'auto'>(current?.kind === 'picture' ? current.scale : 'auto');
const washout = ref(current?.kind === 'picture' ? current.washout : true);
const file = ref<HTMLInputElement | null>(null);
const preset = computed(() => (WATERMARK_PRESETS.includes(text.value.text) ? text.value.text : 'custom'));
const fonts = computed(() => [...new Set([...FONT_GROUPS.flatMap((g) => g.fonts), text.value.font])].sort((a, b) => a.localeCompare(b)));
const value = computed<Watermark | null>(() => {
  const p = picture.value;
  return kind.value === 'text' ? text.value : kind.value === 'picture' && p ? { kind: 'picture', mediaPath: p.mediaPath, scale: scale.value, washout: washout.value, width: p.width, height: p.height } : null;
});
const blocked = computed(() => (kind.value === 'picture' && !picture.value) || (kind.value === 'text' && !text.value.text.trim()));
const close = () => ui.openModal(null);
const apply = () => {
  if (kind.value === 'picture' && !picture.value) return;
  if (kind.value === 'text' && !text.value.text.trim()) return;
  editor.setWatermark(value.value);
  close();
};
const pick = async (f: File) => {
  try {
    const bytes = new Uint8Array(await f.arrayBuffer());
    const type = pictureType(bytes);
    if (!type) throw new Error('type');
    const path = editor.docx.addMedia(bytes, type.mime, type.ext);
    const size = await new Promise<{ w: number; h: number } | null>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve(null);
      img.src = editor.docx.mediaUrl(path);
    });
    picture.value = { mediaPath: path, name: f.name, scale: scale.value, washout: washout.value, width: size ? size.w * 0.75 : undefined, height: size ? size.h * 0.75 : undefined };
    kind.value = 'picture';
  } catch {
    ui.toast(t('watermark.pictureFailed'));
  }
};
const onFile = (e: Event) => {
  const input = e.target as HTMLInputElement;
  const f = input.files?.[0];
  input.value = '';
  if (f) void pick(f);
};
const setText = (patch: Partial<TextWatermark>) => (text.value = { ...text.value, ...patch });
const target = (e: Event) => e.target as HTMLInputElement;
</script>

<template>
  <Modal :title="t('watermark.title')" test-id="watermark-dialog" @close="close">
    <div class="fl-wm">
      <WatermarkPreview :w="value" />
      <div class="fl-wm-form" role="radiogroup" :aria-label="t('watermark.type')">
        <label class="fl-radio"><input v-checked="kind === 'none'" type="radio" name="wm-kind" data-testid="wm-none" @change="kind = 'none'" /> {{ t('watermark.none') }}</label>
        <label class="fl-radio"><input v-checked="kind === 'picture'" type="radio" name="wm-kind" data-testid="wm-picture" @change="kind = 'picture'" /> {{ t('watermark.picture') }}</label>
        <fieldset :class="cx('fl-wm-group', kind !== 'picture' && 'is-disabled')" :disabled="kind !== 'picture'" :aria-label="t('watermark.picture')">
          <div class="fl-row-buttons">
            <button type="button" class="fl-btn is-small" @click="file?.click()">{{ t('watermark.selectPicture') }}</button>
            <span class="fl-muted">{{ picture?.name ?? t('watermark.noPicture') }}</span>
            <input ref="file" type="file" accept="image/png,image/jpeg,image/gif" hidden data-testid="wm-file" @change="onFile" />
          </div>
          <Row :label="t('watermark.scale')" html-for="wm-scale">
            <select id="wm-scale" v-value="String(scale)" class="fl-input" @change="scale = target($event).value === 'auto' ? 'auto' : Number(target($event).value)">
              <option value="auto">{{ t('watermark.auto') }}</option>
              <option v-for="s in WATERMARK_SCALES" :key="s" :value="s">{{ s }}%</option>
            </select>
          </Row>
          <Check :label="t('watermark.washout')" :checked="washout" @change="(v) => (washout = v)" />
        </fieldset>
        <label class="fl-radio"><input v-checked="kind === 'text'" type="radio" name="wm-kind" data-testid="wm-text" @change="kind = 'text'" /> {{ t('watermark.text') }}</label>
        <fieldset :class="cx('fl-wm-group', kind !== 'text' && 'is-disabled')" :disabled="kind !== 'text'" :aria-label="t('watermark.text')">
          <Row :label="t('watermark.preset')" html-for="wm-preset">
            <select id="wm-preset" v-value="preset" class="fl-input" data-testid="wm-preset" @change="target($event).value !== 'custom' && setText({ text: target($event).value })">
              <option value="custom">{{ t('watermark.custom') }}</option>
              <option v-for="p in WATERMARK_PRESETS" :key="p" :value="p">{{ p }}</option>
            </select>
          </Row>
          <Row :label="t('watermark.textLabel')" html-for="wm-textval"><input id="wm-textval" v-value="text.text" class="fl-input" maxlength="60" data-testid="wm-text-value" @input="setText({ text: target($event).value })" /></Row>
          <Row :label="t('watermark.font')" html-for="wm-font">
            <select id="wm-font" v-value="text.font" class="fl-input" @change="setText({ font: target($event).value })">
              <option v-for="f in fonts" :key="f" :value="f">{{ f }}</option>
            </select>
          </Row>
          <Row :label="t('watermark.size')" html-for="wm-size">
            <select id="wm-size" v-value="String(text.size)" class="fl-input" @change="setText({ size: target($event).value === 'auto' ? 'auto' : Number(target($event).value) })">
              <option value="auto">{{ t('watermark.auto') }}</option>
              <option v-for="s in WATERMARK_SIZES" :key="s" :value="s">{{ s }}</option>
            </select>
          </Row>
          <div class="fl-row-checks">
            <Check :label="t('watermark.bold')" :checked="text.bold" @change="(v) => setText({ bold: v })" />
            <Check :label="t('watermark.italic')" :checked="text.italic" @change="(v) => setText({ italic: v })" />
          </div>
          <Row :label="t('watermark.transparency')" html-for="wm-trans" unit="%">
            <input id="wm-trans" v-value="text.transparency" type="range" min="0" max="100" @input="setText({ transparency: Number(target($event).value) })" />
            <input v-number-value="text.transparency" type="number" min="0" max="100" class="fl-input is-small" :aria-label="t('watermark.transparency')" @input="setText({ transparency: Math.max(0, Math.min(100, Number(target($event).value) || 0)) })" />
          </Row>
          <Row :label="t('watermark.color')" html-for="wm-color">
            <input id="wm-color" v-value="`#${text.color}`" type="color" class="fl-color-input" @input="setText({ color: target($event).value.slice(1).toUpperCase() })" />
          </Row>
          <Row :label="t('watermark.layout')">
            <label class="fl-radio"><input v-checked="text.layout === 'diagonal'" type="radio" name="wm-layout" @change="setText({ layout: 'diagonal' })" /> {{ t('watermark.diagonal') }}</label>
            <label class="fl-radio"><input v-checked="text.layout === 'horizontal'" type="radio" name="wm-layout" @change="setText({ layout: 'horizontal' })" /> {{ t('watermark.horizontal') }}</label>
          </Row>
        </fieldset>
      </div>
    </div>
    <template #footer>
      <button type="button" class="fl-btn" @click="close">{{ t('common.cancel') }}</button>
      <button type="button" class="fl-btn is-primary" data-testid="wm-apply" :disabled="blocked" @click="apply">{{ t('common.apply') }}</button>
    </template>
  </Modal>
</template>
