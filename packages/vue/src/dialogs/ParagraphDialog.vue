<script setup lang="ts">
import type { MessageKey } from '@folioline/core';
import { fieldNumber as num, paragraphLimit, type ParagraphSettings, rulerUsesMetric, type TabAlign, type TabLeader } from '@folioline/core/views';
import { X } from '@lucide/vue';
import { ref, shallowRef } from 'vue';
import Check from '../controls/Check.vue';
import Modal from '../controls/Modal.vue';
import Row from '../controls/Row.vue';
import Section from '../controls/Section.vue';
import { useT, useUI } from '../context';
import { vNumberValue, vValue } from '../directives';

type Field = 'left' | 'right' | 'by' | 'before' | 'after' | 'lineValue';

const t = useT();
const { ui, editor } = useUI();
const metric = rulerUsesMetric();
const limit = paragraphLimit(metric);
const unitKey = metric ? 'common.centimeters' : 'common.inches';
const initial = editor.paragraphSettings(metric);
const s = shallowRef<ParagraphSettings>(initial.settings);
const text = shallowRef<Record<Field, string>>({
  left: String(initial.settings.left),
  right: String(initial.settings.right),
  by: String(initial.settings.by),
  before: String(initial.settings.before),
  after: String(initial.settings.after),
  lineValue: String(initial.settings.lineValue),
});
const tabPos = ref('0');
const tabAlign = ref<TabAlign>('left');
const tabLeader = ref<TabLeader>('none');
const mixed = initial.mixed;
const set = <K extends keyof ParagraphSettings>(k: K, v: ParagraphSettings[K]) => (s.value = { ...s.value, [k]: v });
const type = (k: Field, e: Event) => (text.value = { ...text.value, [k]: (e.target as HTMLInputElement).value });
const blur = (k: Field, min = -limit) => set(k, Math.max(min, num(text.value[k], s.value[k])));
const close = () => ui.openModal(null);
const ok = () => {
  const cur = s.value;
  const tx = text.value;
  const next: ParagraphSettings = {
    ...cur,
    left: num(tx.left, cur.left),
    right: num(tx.right, cur.right),
    by: Math.max(0, num(tx.by, cur.by)),
    before: Math.max(0, num(tx.before, cur.before)),
    after: Math.max(0, num(tx.after, cur.after)),
    lineValue: Math.max(0.06, num(tx.lineValue, cur.lineValue)),
  };
  editor.applyParagraphSettings(initial.settings, next, metric);
  close();
  editor.focus();
};
const addTab = () => {
  const pos = num(tabPos.value, NaN);
  if (!Number.isFinite(pos) || pos < 0 || pos > limit) return;
  set('tabs', [...s.value.tabs.filter((tb) => Math.abs(tb.pos - pos) > 0.005), { pos: Math.round(pos * 100) / 100, align: tabAlign.value, leader: tabLeader.value }].sort((a, b) => a.pos - b.pos));
};
const mixedHint = (k: keyof ParagraphSettings) => (mixed.has(k) ? t('paragraph.mixed') : undefined);
const setRule = (e: Event) => {
  const rule = (e.target as HTMLSelectElement).value as ParagraphSettings['lineRule'];
  const v = rule === 'multiple' ? '1' : '12';
  text.value = { ...text.value, lineValue: v };
  s.value = { ...s.value, lineRule: rule, lineValue: Number(v) };
};
const tabLabel = (tb: ParagraphSettings['tabs'][number]) =>
  `${t(`paragraph.tab${tb.align[0].toUpperCase()}${tb.align.slice(1)}` as 'paragraph.tabLeft')}${tb.leader !== 'none' ? ` · ${t(`paragraph.leader${tb.leader === 'dot' ? 'Dot' : tb.leader === 'hyphen' ? 'Hyphen' : 'Underscore'}` as MessageKey)}` : ''}`;
const value = (e: Event) => (e.target as HTMLInputElement).value;
</script>

<template>
  <Modal :title="t('paragraph.title')" test-id="paragraph-dialog" wide @close="close">
    <div class="fl-dialog-columns">
      <div>
        <Section :title="t('paragraph.general')">
          <Row :label="t('paragraph.alignment')" html-for="pd-align">
            <select id="pd-align" v-value="s.align" class="fl-input" :title="mixedHint('align')" data-testid="pd-align" @change="set('align', value($event) as ParagraphSettings['align'])">
              <option value="left">{{ t('paragraph.left') }}</option>
              <option value="center">{{ t('paragraph.centered') }}</option>
              <option value="right">{{ t('paragraph.right') }}</option>
              <option value="both">{{ t('paragraph.justified') }}</option>
            </select>
          </Row>
          <Row :label="t('paragraph.direction')" html-for="pd-dir">
            <select id="pd-dir" v-value="s.rtl ? 'rtl' : 'ltr'" class="fl-input" @change="set('rtl', value($event) === 'rtl')">
              <option value="ltr">{{ t('paragraph.ltr') }}</option>
              <option value="rtl">{{ t('paragraph.rtl') }}</option>
            </select>
          </Row>
        </Section>
        <Section :title="t('paragraph.indentation')">
          <Row :label="t('paragraph.beforeText')" html-for="pd-left" :unit="t(unitKey)"><input id="pd-left" v-number-value="text.left" role="spinbutton" type="number" step="0.1" class="fl-input" data-testid="pd-left" @input="type('left', $event)" @blur="blur('left')" /></Row>
          <Row :label="t('paragraph.afterText')" html-for="pd-right" :unit="t(unitKey)"><input id="pd-right" v-number-value="text.right" role="spinbutton" type="number" step="0.1" class="fl-input" @input="type('right', $event)" @blur="blur('right')" /></Row>
          <Row :label="t('paragraph.special')" html-for="pd-special">
            <select id="pd-special" v-value="s.special" class="fl-input" data-testid="pd-special" @change="set('special', value($event) as ParagraphSettings['special'])">
              <option value="none">{{ t('paragraph.specialNone') }}</option>
              <option value="firstLine">{{ t('paragraph.firstLine') }}</option>
              <option value="hanging">{{ t('paragraph.hanging') }}</option>
            </select>
          </Row>
          <Row v-if="s.special !== 'none'" :label="t('paragraph.by')" html-for="pd-by" :unit="t(unitKey)"><input id="pd-by" v-number-value="text.by" role="spinbutton" type="number" step="0.1" min="0" class="fl-input" data-testid="pd-by" @input="type('by', $event)" @blur="blur('by', 0)" /></Row>
        </Section>
        <Section :title="t('paragraph.tabStops')">
          <ul v-if="s.tabs.length" class="fl-tab-list" data-testid="pd-tabs">
            <li v-for="tb in s.tabs" :key="tb.pos">
              <span>{{ t(metric ? 'paragraph.tabAtCentimeters' : 'paragraph.tabAt', { position: tb.pos }) }}</span>
              <span class="fl-muted">{{ tabLabel(tb) }}</span>
              <button type="button" class="fl-icon-btn is-small" :aria-label="t('paragraph.clear')" :title="t('paragraph.clear')" @click="set('tabs', s.tabs.filter((x) => x !== tb))"><X :size="14" /></button>
            </li>
          </ul>
          <p v-else class="fl-note">{{ t('paragraph.noTabs') }}</p>
          <Row :label="t('paragraph.position')" html-for="pd-tabpos" :unit="t(unitKey)"><input id="pd-tabpos" v-number-value="tabPos" role="spinbutton" type="number" step="0.25" min="0" class="fl-input" data-testid="pd-tab-pos" @input="tabPos = value($event)" /></Row>
          <Row :label="t('paragraph.tabAlignment')" html-for="pd-tabalign">
            <select id="pd-tabalign" v-value="tabAlign" class="fl-input" @change="tabAlign = value($event) as TabAlign">
              <option value="left">{{ t('paragraph.tabLeft') }}</option>
              <option value="center">{{ t('paragraph.tabCenter') }}</option>
              <option value="right">{{ t('paragraph.tabRight') }}</option>
              <option value="decimal">{{ t('paragraph.tabDecimal') }}</option>
            </select>
          </Row>
          <Row :label="t('paragraph.leader')" html-for="pd-leader">
            <select id="pd-leader" v-value="tabLeader" class="fl-input" @change="tabLeader = value($event) as TabLeader">
              <option value="none">{{ t('paragraph.leaderNone') }}</option>
              <option value="dot">{{ t('paragraph.leaderDot') }}</option>
              <option value="hyphen">{{ t('paragraph.leaderHyphen') }}</option>
              <option value="underscore">{{ t('paragraph.leaderUnderscore') }}</option>
            </select>
          </Row>
          <div class="fl-row-buttons">
            <button type="button" class="fl-btn is-small" data-testid="pd-tab-set" @click="addTab">{{ t('paragraph.set') }}</button>
            <button type="button" class="fl-btn is-small" :disabled="!s.tabs.length" @click="set('tabs', [])">{{ t('paragraph.clearAll') }}</button>
          </div>
        </Section>
      </div>
      <div>
        <Section :title="t('paragraph.spacing')">
          <Row :label="t('paragraph.before')" html-for="pd-before" :unit="t('common.points')"><input id="pd-before" v-number-value="text.before" role="spinbutton" type="number" step="6" min="0" class="fl-input" data-testid="pd-before" @input="type('before', $event)" @blur="blur('before', 0)" /></Row>
          <Row :label="t('paragraph.after')" html-for="pd-after" :unit="t('common.points')"><input id="pd-after" v-number-value="text.after" role="spinbutton" type="number" step="6" min="0" class="fl-input" data-testid="pd-after" @input="type('after', $event)" @blur="blur('after', 0)" /></Row>
          <Row :label="t('paragraph.lineSpacing')" html-for="pd-rule">
            <select id="pd-rule" v-value="s.lineRule" class="fl-input" data-testid="pd-line-rule" @change="setRule">
              <option value="multiple">{{ t('paragraph.multiple') }}</option>
              <option value="atLeast">{{ t('paragraph.atLeast') }}</option>
              <option value="exactly">{{ t('paragraph.exactly') }}</option>
            </select>
          </Row>
          <Row :label="t('paragraph.at')" html-for="pd-at" :unit="s.lineRule === 'multiple' ? undefined : t('common.points')"><input id="pd-at" v-number-value="text.lineValue" role="spinbutton" type="number" :step="s.lineRule === 'multiple' ? 0.05 : 1" min="0" class="fl-input" data-testid="pd-line-value" @input="type('lineValue', $event)" @blur="blur('lineValue', 0.06)" /></Row>
          <Check :label="t('paragraph.contextual')" :checked="s.contextual" @change="(v) => set('contextual', v)" />
        </Section>
        <Section :title="t('paragraph.pagination')">
          <Check :label="t('paragraph.keepNext')" :checked="s.keepNext" test-id="pd-keep-next" @change="(v) => set('keepNext', v)" />
          <Check :label="t('paragraph.widowControl')" :checked="s.widowControl" @change="(v) => set('widowControl', v)" />
          <Check :label="t('paragraph.keepLines')" :checked="s.keepLines" @change="(v) => set('keepLines', v)" />
          <Check :label="t('paragraph.pageBreakBefore')" :checked="s.pageBreakBefore" test-id="pd-page-break-before" @change="(v) => set('pageBreakBefore', v)" />
        </Section>
      </div>
    </div>
    <template #footer>
      <button type="button" class="fl-btn" @click="close">{{ t('common.cancel') }}</button>
      <button type="button" class="fl-btn is-primary" data-testid="paragraph-ok" @click="ok">{{ t('common.ok') }}</button>
    </template>
  </Modal>
</template>
