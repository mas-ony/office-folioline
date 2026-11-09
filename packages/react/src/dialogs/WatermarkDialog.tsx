import { FONT_GROUPS } from '@folioline/core';
import {
  DEFAULT_TEXT_WATERMARK,
  pictureType,
  renderWatermark,
  type TextWatermark,
  type Watermark,
  WATERMARK_PREVIEW_LINES,
  WATERMARK_PRESETS,
  WATERMARK_SCALES,
  WATERMARK_SIZES,
} from '@folioline/core/views';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useT, useUI } from '../context';
import { Check, cx, Modal, Row } from '../controls';

type Kind = 'none' | 'picture' | 'text';

function Preview({ w }: { w: Watermark | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const { editor } = useUI();
  useEffect(() => {
    if (ref.current) renderWatermark(ref.current, w, { x: 10, y: 14, w: 100, h: 132 }, (p) => editor.docx.mediaUrl(p));
  }, [w, editor]);
  return (
    <div className="fl-wm-preview" aria-hidden="true">
      <div className="fl-wm-page">
        {WATERMARK_PREVIEW_LINES.map((w, i) => <span key={i} className="fl-wm-line" style={{ width: `${w}%` }} />)}
        <div ref={ref} className="dx-watermark fl-wm-layer" />
      </div>
    </div>
  );
}

export function WatermarkDialog() {
  const t = useT();
  const { editor, openModal, toast } = useUI();
  const current = useMemo(() => editor.watermark(), [editor]);
  const [kind, setKind] = useState<Kind>(current?.kind ?? 'none');
  const [text, setText] = useState<TextWatermark>(current?.kind === 'text' ? current : DEFAULT_TEXT_WATERMARK);
  const [picture, setPicture] = useState<{ mediaPath: string; name: string; scale: number | 'auto'; washout: boolean; width?: number; height?: number } | null>(
    current?.kind === 'picture' ? { mediaPath: current.mediaPath, name: t('watermark.noPicture'), scale: current.scale, washout: current.washout, width: current.width, height: current.height } : null,
  );
  const [scale, setScale] = useState<number | 'auto'>(current?.kind === 'picture' ? current.scale : 'auto');
  const [washout, setWashout] = useState(current?.kind === 'picture' ? current.washout : true);
  const fileRef = useRef<HTMLInputElement>(null);
  const preset = WATERMARK_PRESETS.includes(text.text) ? text.text : 'custom';
  const fonts = [...new Set([...FONT_GROUPS.flatMap((g) => g.fonts), text.font])].sort((a, b) => a.localeCompare(b));
  const value: Watermark | null = kind === 'text' ? text : kind === 'picture' && picture ? { kind: 'picture', mediaPath: picture.mediaPath, scale, washout, width: picture.width, height: picture.height } : null;
  const close = () => openModal(null);
  const apply = () => {
    if (kind === 'picture' && !picture) return;
    if (kind === 'text' && !text.text.trim()) return;
    editor.setWatermark(value);
    close();
  };
  const pick = async (file: File) => {
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const type = pictureType(bytes);
      if (!type) throw new Error('type');
      const path = editor.docx.addMedia(bytes, type.mime, type.ext);
      const size = await new Promise<{ w: number; h: number } | null>((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => resolve(null);
        img.src = editor.docx.mediaUrl(path);
      });
      setPicture({ mediaPath: path, name: file.name, scale, washout, width: size ? size.w * 0.75 : undefined, height: size ? size.h * 0.75 : undefined });
      setKind('picture');
    } catch {
      toast(t('watermark.pictureFailed'));
    }
  };
  return (
    <Modal title={t('watermark.title')} onClose={close} testId="watermark-dialog" footer={(
      <>
        <button type="button" className="fl-btn" onClick={close}>{t('common.cancel')}</button>
        <button type="button" className="fl-btn is-primary" data-testid="wm-apply" disabled={(kind === 'picture' && !picture) || (kind === 'text' && !text.text.trim())} onClick={apply}>{t('common.apply')}</button>
      </>
    )}>
      <div className="fl-wm">
        <Preview w={value} />
        <div className="fl-wm-form" role="radiogroup" aria-label={t('watermark.type')}>
          <label className="fl-radio"><input type="radio" name="wm-kind" checked={kind === 'none'} data-testid="wm-none" onChange={() => setKind('none')} /> {t('watermark.none')}</label>
          <label className="fl-radio"><input type="radio" name="wm-kind" checked={kind === 'picture'} data-testid="wm-picture" onChange={() => setKind('picture')} /> {t('watermark.picture')}</label>
          <fieldset className={cx('fl-wm-group', kind !== 'picture' && 'is-disabled')} disabled={kind !== 'picture'} aria-label={t('watermark.picture')}>
            <div className="fl-row-buttons">
              <button type="button" className="fl-btn is-small" onClick={() => fileRef.current?.click()}>{t('watermark.selectPicture')}</button>
              <span className="fl-muted">{picture?.name ?? t('watermark.noPicture')}</span>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/gif" hidden data-testid="wm-file" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void pick(f); }} />
            </div>
            <Row label={t('watermark.scale')} htmlFor="wm-scale">
              <select id="wm-scale" className="fl-input" value={String(scale)} onChange={(e) => setScale(e.target.value === 'auto' ? 'auto' : Number(e.target.value))}>
                <option value="auto">{t('watermark.auto')}</option>
                {WATERMARK_SCALES.map((s) => <option key={s} value={s}>{s}%</option>)}
              </select>
            </Row>
            <Check label={t('watermark.washout')} checked={washout} onChange={setWashout} />
          </fieldset>
          <label className="fl-radio"><input type="radio" name="wm-kind" checked={kind === 'text'} data-testid="wm-text" onChange={() => setKind('text')} /> {t('watermark.text')}</label>
          <fieldset className={cx('fl-wm-group', kind !== 'text' && 'is-disabled')} disabled={kind !== 'text'} aria-label={t('watermark.text')}>
            <Row label={t('watermark.preset')} htmlFor="wm-preset">
              <select id="wm-preset" className="fl-input" value={preset} data-testid="wm-preset" onChange={(e) => { if (e.target.value !== 'custom') setText({ ...text, text: e.target.value }); }}>
                <option value="custom">{t('watermark.custom')}</option>
                {WATERMARK_PRESETS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Row>
            <Row label={t('watermark.textLabel')} htmlFor="wm-textval"><input id="wm-textval" className="fl-input" value={text.text} maxLength={60} data-testid="wm-text-value" onChange={(e) => setText({ ...text, text: e.target.value })} /></Row>
            <Row label={t('watermark.font')} htmlFor="wm-font">
              <select id="wm-font" className="fl-input" value={text.font} onChange={(e) => setText({ ...text, font: e.target.value })}>
                {fonts.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </Row>
            <Row label={t('watermark.size')} htmlFor="wm-size">
              <select id="wm-size" className="fl-input" value={String(text.size)} onChange={(e) => setText({ ...text, size: e.target.value === 'auto' ? 'auto' : Number(e.target.value) })}>
                <option value="auto">{t('watermark.auto')}</option>
                {WATERMARK_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Row>
            <div className="fl-row-checks">
              <Check label={t('watermark.bold')} checked={text.bold} onChange={(v) => setText({ ...text, bold: v })} />
              <Check label={t('watermark.italic')} checked={text.italic} onChange={(v) => setText({ ...text, italic: v })} />
            </div>
            <Row label={t('watermark.transparency')} htmlFor="wm-trans" unit="%">
              <input id="wm-trans" type="range" min="0" max="100" value={text.transparency} onChange={(e) => setText({ ...text, transparency: Number(e.target.value) })} />
              <input type="number" min="0" max="100" className="fl-input is-small" aria-label={t('watermark.transparency')} value={text.transparency} onChange={(e) => setText({ ...text, transparency: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })} />
            </Row>
            <Row label={t('watermark.color')} htmlFor="wm-color">
              <input id="wm-color" type="color" className="fl-color-input" value={`#${text.color}`} onChange={(e) => setText({ ...text, color: e.target.value.slice(1).toUpperCase() })} />
            </Row>
            <Row label={t('watermark.layout')}>
              <label className="fl-radio"><input type="radio" name="wm-layout" checked={text.layout === 'diagonal'} onChange={() => setText({ ...text, layout: 'diagonal' })} /> {t('watermark.diagonal')}</label>
              <label className="fl-radio"><input type="radio" name="wm-layout" checked={text.layout === 'horizontal'} onChange={() => setText({ ...text, layout: 'horizontal' })} /> {t('watermark.horizontal')}</label>
            </Row>
          </fieldset>
        </div>
      </div>
    </Modal>
  );
}
