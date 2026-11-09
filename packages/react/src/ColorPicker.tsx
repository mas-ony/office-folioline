import { type DocxDocument, HIGHLIGHTS, STANDARD_COLORS, themeSwatches } from '@folioline/core/views';
import { useState } from 'react';
import { useT } from './context';
import { cx, keepFocus } from './controls';

function Swatch({ hex, label, selected, onPick }: { hex: string; label: string; selected: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      className={cx('fl-swatch', selected && 'is-selected', hex === 'FFFFFF' && 'is-light')}
      style={{ background: `#${hex}` }}
      aria-label={label}
      title={label}
      onMouseDown={keepFocus}
      onClick={onPick}
    />
  );
}

/** Font colour: Automatic, theme colours with tints and shades, standard colours, custom. */
export function ColorPicker({ value, onPick, docx, label }: { value: string | null; onPick: (hex: string | null) => void; docx: DocxDocument | null; label: string }) {
  const t = useT();
  const swatches = themeSwatches(docx, t);
  const cur = value && value !== 'auto' ? value.replace('#', '').toUpperCase() : null;
  const [custom, setCustom] = useState('');
  const valid = /^#?[0-9a-f]{6}$/i.test(custom.trim());
  return (
    <div className="fl-colors" role="group" aria-label={label} data-testid="color-picker">
      <button type="button" className="fl-color-auto" onMouseDown={keepFocus} onClick={() => onPick(null)}>
        <span className="fl-swatch is-auto" aria-hidden="true" />
        {t('color.automatic')}
      </button>
      <div className="fl-color-title">{t('color.themeColors')}</div>
      <div className="fl-color-grid is-theme" role="group">
        {swatches.theme.map((s) => <Swatch key={s.key} hex={s.hex} label={s.label} selected={cur === s.hex} onPick={() => onPick(s.hex)} />)}
      </div>
      <div className="fl-color-grid is-shades" role="group">
        {swatches.shades.map((s) => <Swatch key={s.key} hex={s.hex} label={s.label} selected={cur === s.hex} onPick={() => onPick(s.hex)} />)}
      </div>
      <div className="fl-color-title">{t('color.standardColors')}</div>
      <div className="fl-color-grid" role="group">
        {STANDARD_COLORS.map((c) => <Swatch key={c.hex} hex={c.hex} label={t(c.key)} selected={cur === c.hex} onPick={() => onPick(c.hex)} />)}
      </div>
      <div className="fl-color-title">{t('color.customColor')}</div>
      <form className="fl-color-custom" onSubmit={(e) => { e.preventDefault(); if (valid) onPick(custom.trim().replace('#', '').toUpperCase()); }}>
        <span aria-hidden="true">#</span>
        <input aria-label={t('color.customColor')} value={custom} maxLength={7} placeholder={cur ?? ''} spellCheck={false} onChange={(e) => setCustom(e.target.value)} />
        <input type="color" aria-label={t('color.customColor')} value={`#${valid ? custom.replace('#', '') : cur ?? '000000'}`} onChange={(e) => setCustom(e.target.value.slice(1).toUpperCase())} />
        <button type="submit" className="fl-btn is-small" disabled={!valid}>{t('common.apply')}</button>
      </form>
    </div>
  );
}

/** Text highlight: No Color and Word's highlight colours. */
export function HighlightPicker({ value, onPick, label }: { value: string | null; onPick: (name: string | null) => void; label: string }) {
  const t = useT();
  return (
    <div className="fl-colors" role="group" aria-label={label} data-testid="highlight-picker">
      <button type="button" className="fl-color-auto" onMouseDown={keepFocus} onClick={() => onPick(null)}>
        <span className="fl-swatch is-none" aria-hidden="true" />
        {t('color.noColor')}
      </button>
      <div className="fl-color-title">{t('color.highlightColors')}</div>
      <div className="fl-color-grid is-highlight" role="group">
        {HIGHLIGHTS.map((h) => <Swatch key={h.name} hex={h.hex} label={t(h.key)} selected={value === h.name} onPick={() => onPick(h.name)} />)}
      </div>
    </div>
  );
}
