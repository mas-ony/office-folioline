import type { MessageKey } from '@folioline/core';
import {
  CHANGED_LINES,
  DEFAULT_MARKUP,
  DELETION_STYLES,
  INSERTION_STYLES,
  MARKUP_BACK_COLORS as BACK_COLORS,
  MARKUP_COLORS,
  MARKUP_TEXT_COLORS as TEXT_COLORS,
  type MarkupColor,
  type RevisionMarkup,
} from '@folioline/core/views';
import { useState } from 'react';
import { useT, useUI } from '../context';
import { Check, Modal } from '../controls';

function styleKey(v: string): MessageKey {
  if (v === 'leftBorder' || v === 'rightBorder' || v === 'outsideBorder') return `track.v.${v}` as MessageKey;
  return `track.v.${v}` as MessageKey;
}

function ColorSelect({ label, value, special, colors, onChange }: { label: string; value: string; special: string[]; colors: MarkupColor[]; onChange: (v: string) => void }) {
  const t = useT();
  const swatch = MARKUP_COLORS[value as MarkupColor];
  return (
    <span className="fl-color-select">
      <span className="fl-swatch is-small" style={{ background: swatch ?? (value === 'byAuthor' ? 'linear-gradient(135deg,#b53a2f 50%,#1f6fb2 50%)' : value === 'auto' ? '#202124' : 'transparent') }} aria-hidden="true" />
      <select className="fl-input" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
        {special.map((s) => <option key={s} value={s}>{t(`track.v.${s}` as MessageKey)}</option>)}
        {colors.map((c) => <option key={c} value={c}>{t(`track.c.${c}` as MessageKey)}</option>)}
      </select>
    </span>
  );
}

export function TrackOptionsDialog() {
  const t = useT();
  const { ui, editor, openModal } = useUI();
  const [o, setO] = useState<RevisionMarkup>(() => editor.revisionMarkup);
  const set = <K extends keyof RevisionMarkup>(k: K, v: RevisionMarkup[K]) => setO((p) => ({ ...p, [k]: v }));
  const close = () => openModal(null);
  const ok = () => {
    ui.setRevisionMarkup(o);
    close();
  };
  const markRow = (kind: 'insertions' | 'deletions' | 'movedFrom' | 'movedTo', name: MessageKey, styles: string[]) => (
    <>
      <div className="fl-track-row">
        <label htmlFor={`to-${kind}`}>{t(name)}</label>
        <select id={`to-${kind}`} className="fl-input" value={o[kind]} data-testid={`to-${kind}`} onChange={(e) => set(kind, e.target.value as never)}>
          {styles.map((s) => <option key={s} value={s}>{t(styleKey(s))}</option>)}
        </select>
        <ColorSelect label={t('track.color', { name: t(name) })} value={o[`${kind}Color`]} special={['byAuthor']} colors={TEXT_COLORS} onChange={(v) => set(`${kind}Color`, v as never)} />
      </div>
      <div className="fl-track-row is-sub">
        <label>{t('track.background', { name: t(name) })}</label>
        <ColorSelect label={t('track.background', { name: t(name) })} value={o[`${kind}Background`]} special={['none']} colors={BACK_COLORS} onChange={(v) => set(`${kind}Background`, v as never)} />
      </div>
    </>
  );
  const cell = (k: 'insertedCells' | 'deletedCells' | 'mergedCells' | 'splitCells', name: MessageKey) => (
    <div className="fl-track-cell">
      <label>{t(name)}</label>
      <ColorSelect label={t(name)} value={o[k]} special={[]} colors={BACK_COLORS} onChange={(v) => set(k, v as MarkupColor)} />
    </div>
  );
  return (
    <Modal title={t('track.title')} onClose={close} testId="track-options-dialog" wide leftFooter={<button type="button" className="fl-btn" data-testid="to-reset" onClick={() => setO({ ...DEFAULT_MARKUP })}>{t('track.reset')}</button>} footer={(
      <>
        <button type="button" className="fl-btn" onClick={close}>{t('common.cancel')}</button>
        <button type="button" className="fl-btn is-primary" data-testid="to-ok" onClick={ok}>{t('common.ok')}</button>
      </>
    )}>
      <fieldset className="fl-fieldset">
        <legend>{t('track.markup')}</legend>
        {markRow('insertions', 'track.insertions', INSERTION_STYLES)}
        {markRow('deletions', 'track.deletions', DELETION_STYLES)}
        <div className="fl-track-row">
          <label htmlFor="to-lines">{t('track.changedLines')}</label>
          <select id="to-lines" className="fl-input" value={o.changedLines} data-testid="to-changed-lines" onChange={(e) => set('changedLines', e.target.value as RevisionMarkup['changedLines'])}>
            {CHANGED_LINES.map((s) => <option key={s} value={s}>{t(styleKey(s))}</option>)}
          </select>
          <ColorSelect label={t('track.color', { name: t('track.changedLines') })} value={o.changedLinesColor} special={['auto', 'byAuthor']} colors={TEXT_COLORS} onChange={(v) => set('changedLinesColor', v as RevisionMarkup['changedLinesColor'])} />
        </div>
      </fieldset>
      <fieldset className="fl-fieldset">
        <legend>{t('track.moves')}</legend>
        <Check label={t('track.trackMoves')} hint={t('track.trackMovesNote')} checked={o.trackMoves} onChange={(v) => set('trackMoves', v)} />
        {markRow('movedFrom', 'track.movedFrom', DELETION_STYLES)}
        {markRow('movedTo', 'track.movedTo', INSERTION_STYLES)}
      </fieldset>
      <fieldset className="fl-fieldset">
        <legend>{t('track.tableCells')}</legend>
        <div className="fl-track-cells">
          {cell('insertedCells', 'track.insertedCells')}
          {cell('deletedCells', 'track.deletedCells')}
          {cell('mergedCells', 'track.mergedCells')}
          {cell('splitCells', 'track.splitCells')}
        </div>
      </fieldset>
      <fieldset className="fl-fieldset">
        <legend>{t('track.formatting')}</legend>
        <Check label={t('track.trackFormatting')} hint={t('track.trackFormattingNote')} checked={o.trackFormatting} onChange={(v) => set('trackFormatting', v)} testId="to-track-formatting" />
      </fieldset>
    </Modal>
  );
}
