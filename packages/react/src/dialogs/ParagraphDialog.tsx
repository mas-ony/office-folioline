import { fieldNumber as num, paragraphLimit, type ParagraphSettings, rulerUsesMetric, type TabAlign, type TabLeader } from '@folioline/core/views';
import { X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useT, useUI } from '../context';
import { Check, Modal, Row, Section } from '../controls';

export function ParagraphDialog() {
  const t = useT();
  const { editor, openModal } = useUI();
  const metric = rulerUsesMetric();
  const limit = paragraphLimit(metric);
  const unit = t(metric ? 'common.centimeters' : 'common.inches');
  const initial = useMemo(() => editor.paragraphSettings(metric), [editor, metric]);
  const [s, setS] = useState<ParagraphSettings>(initial.settings);
  const [text, setText] = useState(() => ({
    left: String(initial.settings.left),
    right: String(initial.settings.right),
    by: String(initial.settings.by),
    before: String(initial.settings.before),
    after: String(initial.settings.after),
    lineValue: String(initial.settings.lineValue),
  }));
  const [tabPos, setTabPos] = useState('0');
  const [tabAlign, setTabAlign] = useState<TabAlign>('left');
  const [tabLeader, setTabLeader] = useState<TabLeader>('none');
  const mixed = initial.mixed;
  const set = <K extends keyof ParagraphSettings>(k: K, v: ParagraphSettings[K]) => setS((prev) => ({ ...prev, [k]: v }));
  const field = (k: keyof typeof text, min = -limit) => ({
    value: text[k],
    onChange: (e: { target: { value: string } }) => setText({ ...text, [k]: e.target.value }),
    onBlur: () => set(k, Math.max(min, num(text[k], s[k] as number)) as never),
  });
  const close = () => openModal(null);
  const ok = () => {
    const next: ParagraphSettings = {
      ...s,
      left: num(text.left, s.left),
      right: num(text.right, s.right),
      by: Math.max(0, num(text.by, s.by)),
      before: Math.max(0, num(text.before, s.before)),
      after: Math.max(0, num(text.after, s.after)),
      lineValue: Math.max(0.06, num(text.lineValue, s.lineValue)),
    };
    editor.applyParagraphSettings(initial.settings, next, metric);
    close();
    editor.focus();
  };
  const addTab = () => {
    const pos = num(tabPos, NaN);
    if (!Number.isFinite(pos) || pos < 0 || pos > limit) return;
    set('tabs', [...s.tabs.filter((tb) => Math.abs(tb.pos - pos) > 0.005), { pos: Math.round(pos * 100) / 100, align: tabAlign, leader: tabLeader }].sort((a, b) => a.pos - b.pos));
  };
  const mixedHint = (k: keyof ParagraphSettings) => (mixed.has(k) ? t('paragraph.mixed') : undefined);
  return (
    <Modal title={t('paragraph.title')} onClose={close} testId="paragraph-dialog" wide footer={(
      <>
        <button type="button" className="fl-btn" onClick={close}>{t('common.cancel')}</button>
        <button type="button" className="fl-btn is-primary" data-testid="paragraph-ok" onClick={ok}>{t('common.ok')}</button>
      </>
    )}>
      <div className="fl-dialog-columns">
        <div>
          <Section title={t('paragraph.general')}>
            <Row label={t('paragraph.alignment')} htmlFor="pd-align">
              <select id="pd-align" className="fl-input" value={s.align} title={mixedHint('align')} data-testid="pd-align" onChange={(e) => set('align', e.target.value as ParagraphSettings['align'])}>
                <option value="left">{t('paragraph.left')}</option>
                <option value="center">{t('paragraph.centered')}</option>
                <option value="right">{t('paragraph.right')}</option>
                <option value="both">{t('paragraph.justified')}</option>
              </select>
            </Row>
            <Row label={t('paragraph.direction')} htmlFor="pd-dir">
              <select id="pd-dir" className="fl-input" value={s.rtl ? 'rtl' : 'ltr'} onChange={(e) => set('rtl', e.target.value === 'rtl')}>
                <option value="ltr">{t('paragraph.ltr')}</option>
                <option value="rtl">{t('paragraph.rtl')}</option>
              </select>
            </Row>
          </Section>
          <Section title={t('paragraph.indentation')}>
            <Row label={t('paragraph.beforeText')} htmlFor="pd-left" unit={unit}><input id="pd-left" role="spinbutton" type="number" step="0.1" className="fl-input" data-testid="pd-left" {...field('left')} /></Row>
            <Row label={t('paragraph.afterText')} htmlFor="pd-right" unit={unit}><input id="pd-right" role="spinbutton" type="number" step="0.1" className="fl-input" {...field('right')} /></Row>
            <Row label={t('paragraph.special')} htmlFor="pd-special">
              <select id="pd-special" className="fl-input" value={s.special} data-testid="pd-special" onChange={(e) => set('special', e.target.value as ParagraphSettings['special'])}>
                <option value="none">{t('paragraph.specialNone')}</option>
                <option value="firstLine">{t('paragraph.firstLine')}</option>
                <option value="hanging">{t('paragraph.hanging')}</option>
              </select>
            </Row>
            {s.special !== 'none' && (
              <Row label={t('paragraph.by')} htmlFor="pd-by" unit={unit}><input id="pd-by" role="spinbutton" type="number" step="0.1" min="0" className="fl-input" data-testid="pd-by" {...field('by', 0)} /></Row>
            )}
          </Section>
          <Section title={t('paragraph.tabStops')}>
            {s.tabs.length ? (
              <ul className="fl-tab-list" data-testid="pd-tabs">
                {s.tabs.map((tb) => (
                  <li key={tb.pos}>
                    <span>{t(metric ? 'paragraph.tabAtCentimeters' : 'paragraph.tabAt', { position: tb.pos })}</span>
                    <span className="fl-muted">{t(`paragraph.tab${tb.align[0].toUpperCase()}${tb.align.slice(1)}` as 'paragraph.tabLeft')}{tb.leader !== 'none' ? ` · ${t(`paragraph.leader${tb.leader === 'dot' ? 'Dot' : tb.leader === 'hyphen' ? 'Hyphen' : 'Underscore'}`)}` : ''}</span>
                    <button type="button" className="fl-icon-btn is-small" aria-label={t('paragraph.clear')} title={t('paragraph.clear')} onClick={() => set('tabs', s.tabs.filter((x) => x !== tb))}><X size={14} /></button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="fl-note">{t('paragraph.noTabs')}</p>
            )}
            <Row label={t('paragraph.position')} htmlFor="pd-tabpos" unit={unit}><input id="pd-tabpos" role="spinbutton" type="number" step="0.25" min="0" className="fl-input" value={tabPos} data-testid="pd-tab-pos" onChange={(e) => setTabPos(e.target.value)} /></Row>
            <Row label={t('paragraph.tabAlignment')} htmlFor="pd-tabalign">
              <select id="pd-tabalign" className="fl-input" value={tabAlign} onChange={(e) => setTabAlign(e.target.value as TabAlign)}>
                <option value="left">{t('paragraph.tabLeft')}</option>
                <option value="center">{t('paragraph.tabCenter')}</option>
                <option value="right">{t('paragraph.tabRight')}</option>
                <option value="decimal">{t('paragraph.tabDecimal')}</option>
              </select>
            </Row>
            <Row label={t('paragraph.leader')} htmlFor="pd-leader">
              <select id="pd-leader" className="fl-input" value={tabLeader} onChange={(e) => setTabLeader(e.target.value as TabLeader)}>
                <option value="none">{t('paragraph.leaderNone')}</option>
                <option value="dot">{t('paragraph.leaderDot')}</option>
                <option value="hyphen">{t('paragraph.leaderHyphen')}</option>
                <option value="underscore">{t('paragraph.leaderUnderscore')}</option>
              </select>
            </Row>
            <div className="fl-row-buttons">
              <button type="button" className="fl-btn is-small" data-testid="pd-tab-set" onClick={addTab}>{t('paragraph.set')}</button>
              <button type="button" className="fl-btn is-small" disabled={!s.tabs.length} onClick={() => set('tabs', [])}>{t('paragraph.clearAll')}</button>
            </div>
          </Section>
        </div>
        <div>
          <Section title={t('paragraph.spacing')}>
            <Row label={t('paragraph.before')} htmlFor="pd-before" unit={t('common.points')}><input id="pd-before" role="spinbutton" type="number" step="6" min="0" className="fl-input" data-testid="pd-before" {...field('before', 0)} /></Row>
            <Row label={t('paragraph.after')} htmlFor="pd-after" unit={t('common.points')}><input id="pd-after" role="spinbutton" type="number" step="6" min="0" className="fl-input" data-testid="pd-after" {...field('after', 0)} /></Row>
            <Row label={t('paragraph.lineSpacing')} htmlFor="pd-rule">
              <select id="pd-rule" className="fl-input" value={s.lineRule} data-testid="pd-line-rule" onChange={(e) => {
                const rule = e.target.value as ParagraphSettings['lineRule'];
                const v = rule === 'multiple' ? '1' : '12';
                setText({ ...text, lineValue: v });
                setS({ ...s, lineRule: rule, lineValue: Number(v) });
              }}>
                <option value="multiple">{t('paragraph.multiple')}</option>
                <option value="atLeast">{t('paragraph.atLeast')}</option>
                <option value="exactly">{t('paragraph.exactly')}</option>
              </select>
            </Row>
            <Row label={t('paragraph.at')} htmlFor="pd-at" unit={s.lineRule === 'multiple' ? undefined : t('common.points')}><input id="pd-at" role="spinbutton" type="number" step={s.lineRule === 'multiple' ? 0.05 : 1} min="0" className="fl-input" data-testid="pd-line-value" {...field('lineValue', 0.06)} /></Row>
            <Check label={t('paragraph.contextual')} checked={s.contextual} onChange={(v) => set('contextual', v)} />
          </Section>
          <Section title={t('paragraph.pagination')}>
            <Check label={t('paragraph.keepNext')} checked={s.keepNext} onChange={(v) => set('keepNext', v)} testId="pd-keep-next" />
            <Check label={t('paragraph.widowControl')} checked={s.widowControl} onChange={(v) => set('widowControl', v)} />
            <Check label={t('paragraph.keepLines')} checked={s.keepLines} onChange={(v) => set('keepLines', v)} />
            <Check label={t('paragraph.pageBreakBefore')} checked={s.pageBreakBefore} onChange={(v) => set('pageBreakBefore', v)} testId="pd-page-break-before" />
          </Section>
        </div>
      </div>
    </Modal>
  );
}
