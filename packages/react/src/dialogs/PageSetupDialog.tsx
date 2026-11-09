import type { MessageKey } from '@folioline/core';
import { fieldToTwips, PAGE_SIZES, pageSizeLabel, rulerUsesMetric, twipsToField } from '@folioline/core/views';
import { useMemo, useState } from 'react';
import { useT, useUI } from '../context';
import { Modal, Row, Section } from '../controls';

export function PageSetupDialog() {
  const t = useT();
  const { editor, openModal } = useUI();
  const cur = useMemo(() => editor.pageSetup(), [editor]);
  const metric = rulerUsesMetric();
  const unit = t(metric ? 'common.centimeters' : 'common.inches');
  const field = (tw: number) => twipsToField(tw, metric);
  const short = Math.min(cur.width, cur.height);
  const long = Math.max(cur.width, cur.height);
  const match = PAGE_SIZES.find((p) => Math.abs(p.w - short) < 30 && Math.abs(p.h - long) < 30);
  const [size, setSize] = useState(match?.id ?? 'custom');
  const [cw, setCw] = useState(field(short));
  const [ch, setCh] = useState(field(long));
  const [orient, setOrient] = useState(cur.orient);
  const [m, setM] = useState({ top: field(cur.margins.top), bottom: field(cur.margins.bottom), left: field(cur.margins.left), right: field(cur.margins.right) });
  const [scope, setScope] = useState<'document' | 'section'>('document');
  const [error, setError] = useState('');
  const close = () => openModal(null);
  const apply = () => {
    const preset = PAGE_SIZES.find((p) => p.id === size);
    const twips = (s: string, original: number) => fieldToTwips(s, metric, original);
    const w = preset ? preset.w : twips(cw, short);
    const h = preset ? preset.h : twips(ch, long);
    const margins = { top: twips(m.top, cur.margins.top), bottom: twips(m.bottom, cur.margins.bottom), left: twips(m.left, cur.margins.left), right: twips(m.right, cur.margins.right) };
    if (![w, h, ...Object.values(margins)].every((v) => Number.isFinite(v) && v >= 0) || w < 1440 || h < 1440) {
      setError(t('pageSetup.invalid'));
      return;
    }
    if (!editor.applyPageSetup({ width: w, height: h, orient, margins }, scope)) {
      setError(t('pageSetup.invalid'));
      return;
    }
    close();
    editor.focus();
  };
  const margin = (k: keyof typeof m, label: MessageKey) => (
    <Row label={t(label)} htmlFor={`ps-${k}`} unit={unit}>
      <input id={`ps-${k}`} role="spinbutton" type="number" step="0.1" min="0" className="fl-input" value={m[k]} data-testid={`ps-${k}`} onChange={(e) => setM({ ...m, [k]: e.target.value })} />
    </Row>
  );
  return (
    <Modal title={t('pageSetup.title')} onClose={close} testId="page-setup-dialog" footer={(
      <>
        <button type="button" className="fl-btn" onClick={close}>{t('common.cancel')}</button>
        <button type="button" className="fl-btn is-primary" data-testid="ps-apply" onClick={apply}>{t('common.apply')}</button>
      </>
    )}>
      <Section title={t('pageSetup.pageSize')}>
        <Row label={t('pageSetup.size')} htmlFor="ps-size">
          <select id="ps-size" className="fl-input" value={size} data-testid="ps-size" onChange={(e) => setSize(e.target.value)}>
            {PAGE_SIZES.map((p) => <option key={p.id} value={p.id}>{pageSizeLabel(p, metric, t('common.centimeters'))}</option>)}
            <option value="custom">{t('pageSetup.custom')}</option>
          </select>
        </Row>
        {size === 'custom' && (
          <>
            <Row label={t('pageSetup.width')} htmlFor="ps-w" unit={unit}><input id="ps-w" type="number" step="0.1" min={field(1440)} className="fl-input" value={cw} onChange={(e) => setCw(e.target.value)} /></Row>
            <Row label={t('pageSetup.height')} htmlFor="ps-h" unit={unit}><input id="ps-h" type="number" step="0.1" min={field(1440)} className="fl-input" value={ch} onChange={(e) => setCh(e.target.value)} /></Row>
          </>
        )}
        <Row label={t('pageSetup.orientation')} htmlFor="ps-orient">
          <select id="ps-orient" className="fl-input" value={orient} data-testid="ps-orientation" onChange={(e) => setOrient(e.target.value as 'portrait' | 'landscape')}>
            <option value="portrait">{t('pageSetup.portrait')}</option>
            <option value="landscape">{t('pageSetup.landscape')}</option>
          </select>
        </Row>
      </Section>
      <Section title={t('pageSetup.margins')}>
        {margin('top', 'pageSetup.top')}
        {margin('bottom', 'pageSetup.bottom')}
        {margin('left', 'pageSetup.left')}
        {margin('right', 'pageSetup.right')}
        <Row label={t('pageSetup.applyTo')} htmlFor="ps-scope">
          <select id="ps-scope" className="fl-input" value={scope} data-testid="ps-scope" onChange={(e) => setScope(e.target.value as 'document' | 'section')}>
            <option value="document">{t('pageSetup.wholeDocument')}</option>
            <option value="section">{t('pageSetup.thisSection')}</option>
          </select>
        </Row>
      </Section>
      {error && <p className="fl-error" role="alert">{error}</p>}
    </Modal>
  );
}
