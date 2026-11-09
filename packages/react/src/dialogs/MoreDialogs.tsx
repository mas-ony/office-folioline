import type { MessageKey } from '@folioline/core';
import {
  ABOUT_VERSION,
  applyLink,
  bookmarkNameProblem,
  bookmarkProblemKey,
  diagnostics,
  EMU_PER_PT,
  emuToField,
  fieldToEmu,
  H_RELATIVE,
  imageLink,
  isMac,
  linkRange,
  linkUrl,
  naturalSize,
  removeLink,
  reportText,
  rulerUsesMetric,
  selectedImage,
  setImageProps,
  shortcut,
  SHORTCUT_LIST,
  splitCellInto,
  splitLimits,
  suggestedBookmarkName,
  TEXT_BOX_MIN,
  TEXT_BOX_NEW,
  V_RELATIVE,
  WRAP_KINDS,
  type WrapKind,
  wrapKind,
  wrapLabelKey,
} from '@folioline/core/views';
import { useMemo, useRef, useState } from 'react';
import { useI18n, useT, useUI } from '../context';
import { Check, cx, Modal, Row, Section } from '../controls';

// -----------------------------------------------------------------------------------------------

export function BookmarkDialog() {
  const t = useT();
  const { editor, openModal, toast } = useUI();
  const [name, setName] = useState(() => suggestedBookmarkName(editor));
  const [sort, setSort] = useState<'name' | 'location'>('name');
  const [hidden, setHidden] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [, rerender] = useState(0);
  const all = editor.bookmarks(hidden);
  const list = useMemo(() => (sort === 'name' ? [...all].sort((a, b) => a.name.localeCompare(b.name)) : all), [all, sort]);
  const problem = bookmarkNameProblem(name);
  const exists = all.some((b) => b.name === name);
  const message = !name ? '' : problem ? t(bookmarkProblemKey(problem)) : exists ? t('bookmark.nameExists') : '';
  const close = () => openModal(null);
  const add = () => {
    if (problem) return;
    if (editor.createBookmark(name)) {
      toast(t('bookmark.added', { name }));
      close();
      editor.focus();
    }
  };
  return (
    <Modal title={t('bookmark.title')} onClose={close} testId="bookmark-dialog" footer={(
      <>
        <button type="button" className="fl-btn is-primary" disabled={!!problem} data-testid="bookmark-add" onClick={add}>{t('common.add')}</button>
        <button type="button" className="fl-btn" disabled={!picked} data-testid="bookmark-delete" onClick={() => { if (picked && editor.deleteBookmark(picked)) { setPicked(null); rerender((n) => n + 1); } }}>{t('common.delete')}</button>
        <button type="button" className="fl-btn" disabled={!picked} data-testid="bookmark-goto" onClick={() => { if (picked) { close(); editor.goToBookmark(picked); } }}>{t('bookmark.goTo')}</button>
        <button type="button" className="fl-btn" onClick={close}>{t('common.cancel')}</button>
      </>
    )}>
      <Row label={t('bookmark.name')} htmlFor="bm-name">
        <input id="bm-name" className="fl-input" value={name} data-testid="bookmark-name" onChange={(e) => { setName(e.target.value); setPicked(null); }} onKeyDown={(e) => { if (e.key === 'Enter') add(); }} />
      </Row>
      <div className="fl-listbox fl-bookmark-list" role="listbox" aria-label={t('bookmark.list')} data-testid="bookmark-list">
        {list.map((b) => (
          <button key={b.id} type="button" role="option" aria-selected={picked === b.name} className={cx('fl-option', picked === b.name && 'is-selected')} onClick={() => { setPicked(b.name); setName(b.name); }} onDoubleClick={() => { close(); editor.goToBookmark(b.name); }}>
            {b.name}
          </button>
        ))}
        {!list.length && <div className="fl-empty-small">{t('bookmark.empty')}</div>}
      </div>
      <div className="fl-row-inline" role="radiogroup" aria-label={t('bookmark.sortBy')}>
        <span>{t('bookmark.sortBy')}</span>
        <label className="fl-radio"><input type="radio" name="bm-sort" checked={sort === 'name'} onChange={() => setSort('name')} /> {t('bookmark.sortName')}</label>
        <label className="fl-radio"><input type="radio" name="bm-sort" checked={sort === 'location'} onChange={() => setSort('location')} /> {t('bookmark.sortLocation')}</label>
      </div>
      <Check label={t('bookmark.hidden')} checked={hidden} onChange={setHidden} />
      <p className="fl-note" role="status">{message}</p>
    </Modal>
  );
}

// -----------------------------------------------------------------------------------------------

export function ImagePropertiesDialog() {
  const t = useT();
  const { editor, openModal } = useUI();
  const img = useMemo(() => selectedImage(editor.activeView.state), [editor]);
  const a = img?.node.attrs;
  const [w, setW] = useState(a ? String(Math.round((a.width / EMU_PER_PT) * 10) / 10) : '');
  const [h, setH] = useState(a ? String(Math.round((a.height / EMU_PER_PT) * 10) / 10) : '');
  const [lock, setLock] = useState(true);
  const [title, setTitle] = useState<string>(a?.title ?? '');
  const [alt, setAlt] = useState<string>(a?.alt ?? '');
  const [href, setHref] = useState(img ? imageLink(img.node) : '');
  const [wrap, setWrap] = useState<WrapKind>(wrapKind(a?.anchor ?? null));
  const anchor = a?.anchor ?? null;
  const metric = rulerUsesMetric();
  const unit = t(metric ? 'common.centimeters' : 'common.inches');
  const [hOff, setHOff] = useState(anchor?.hOffset !== undefined ? emuToField(anchor.hOffset, metric) : '0');
  const [vOff, setVOff] = useState(anchor?.vOffset !== undefined ? emuToField(anchor.vOffset, metric) : '0');
  const [hRel, setHRel] = useState<string>(anchor?.hRelative ?? 'column');
  const [vRel, setVRel] = useState<string>(anchor?.vRelative ?? 'paragraph');
  const [error, setError] = useState('');
  const close = () => openModal(null);
  if (!img || !a) return null;
  const ratio = a.height / a.width;
  const setWidth = (v: string) => {
    setW(v);
    const n = Number(v);
    if (lock && n > 0) setH(String(Math.round(n * ratio * 10) / 10));
  };
  const setHeight = (v: string) => {
    setH(v);
    const n = Number(v);
    if (lock && n > 0) setW(String(Math.round((n / ratio) * 10) / 10));
  };
  const floating = wrap !== 'inline';
  const apply = () => {
    const wn = Number(w);
    const hn = Number(h);
    if (!(wn > 0 && hn > 0)) {
      setError(t('imageProps.invalidSize'));
      return;
    }
    const patch: Parameters<typeof setImageProps>[2] = { width: wn * EMU_PER_PT, height: hn * EMU_PER_PT, title, alt, wrap, href };
    if (floating && anchor && wrap === wrapKind(anchor)) {
      patch.hOffset = fieldToEmu(hOff, metric, anchor.hOffset);
      patch.vOffset = fieldToEmu(vOff, metric, anchor.vOffset);
      patch.hRelative = hRel;
      patch.vRelative = vRel;
    }
    setImageProps(editor.activeView, img.pos, patch);
    close();
    editor.focus();
  };
  const relKey = (r: string) => `imageProps.${r}` as MessageKey;
  return (
    <Modal title={t('imageProps.title')} onClose={close} testId="image-props-dialog" footer={(
      <>
        <button type="button" className="fl-btn" onClick={close}>{t('common.cancel')}</button>
        <button type="button" className="fl-btn is-primary" data-testid="image-props-apply" onClick={apply}>{t('common.apply')}</button>
      </>
    )}>
      <Section title={t('imageProps.dimensions')}>
        <Row label={t('imageProps.width')} htmlFor="ip-w" unit={t('common.points')}><input id="ip-w" className="fl-input" type="number" min="1" value={w} data-testid="ip-width" onChange={(e) => setWidth(e.target.value)} /></Row>
        <Row label={t('imageProps.height')} htmlFor="ip-h" unit={t('common.points')}><input id="ip-h" className="fl-input" type="number" min="1" value={h} data-testid="ip-height" onChange={(e) => setHeight(e.target.value)} /></Row>
        <Check label={t('imageProps.lockAspect')} checked={lock} onChange={setLock} />
        <button type="button" className="fl-link" onClick={async () => {
          const n = await naturalSize(a.src || editor.docx.mediaUrl(a.mediaPath));
          if (n) {
            setW(String(Math.round((n.width / EMU_PER_PT) * 10) / 10));
            setH(String(Math.round((n.height / EMU_PER_PT) * 10) / 10));
          }
        }}>{t('imageProps.reset')}</button>
      </Section>
      <Section title={t('imageProps.position')}>
        {floating && anchor ? (
          <>
            <Row label={t('imageProps.horizontal')} htmlFor="ip-ho" unit={unit}><input id="ip-ho" className="fl-input" type="number" step="0.1" value={hOff} onChange={(e) => setHOff(e.target.value)} /></Row>
            <Row label={t('imageProps.relativeH')} htmlFor="ip-hr">
              <select id="ip-hr" className="fl-input" value={hRel} onChange={(e) => setHRel(e.target.value)}>{H_RELATIVE.map((r) => <option key={r} value={r}>{t(relKey(r))}</option>)}</select>
            </Row>
            <Row label={t('imageProps.vertical')} htmlFor="ip-vo" unit={unit}><input id="ip-vo" className="fl-input" type="number" step="0.1" value={vOff} onChange={(e) => setVOff(e.target.value)} /></Row>
            <Row label={t('imageProps.relativeV')} htmlFor="ip-vr">
              <select id="ip-vr" className="fl-input" value={vRel} onChange={(e) => setVRel(e.target.value)}>{V_RELATIVE.map((r) => <option key={r} value={r}>{t(relKey(r))}</option>)}</select>
            </Row>
          </>
        ) : (
          <p className="fl-note">{t('imageProps.positionInline')}</p>
        )}
      </Section>
      <Section title={t('imageProps.altText')}>
        <Row label={t('imageProps.altTitle')} htmlFor="ip-title"><input id="ip-title" className="fl-input" value={title} onChange={(e) => setTitle(e.target.value)} /></Row>
        <Row label={t('imageProps.description')} htmlFor="ip-desc"><textarea id="ip-desc" className="fl-input" rows={3} placeholder={t('imageProps.descriptionPlaceholder')} value={alt} data-testid="ip-alt" onChange={(e) => setAlt(e.target.value)} /></Row>
      </Section>
      <Section title={t('imageProps.hyperlink')}>
        <Row label={t('link.url')} htmlFor="ip-href"><input id="ip-href" className="fl-input" placeholder="https://example.com" value={href} onChange={(e) => setHref(e.target.value)} /></Row>
      </Section>
      <Section title={t('imageProps.textWrapping')}>
        <Row label={t('image.wrap')} htmlFor="ip-wrap">
          <select id="ip-wrap" className="fl-input" value={wrap} data-testid="ip-wrap" onChange={(e) => setWrap(e.target.value as WrapKind)}>
            {WRAP_KINDS.map((k) => <option key={k} value={k}>{t(wrapLabelKey(k))}</option>)}
          </select>
        </Row>
      </Section>
      {error && <p className="fl-error" role="alert">{error}</p>}
    </Modal>
  );
}

export function AltTextDialog() {
  const t = useT();
  const { editor, openModal } = useUI();
  const img = useMemo(() => selectedImage(editor.activeView.state), [editor]);
  const [title, setTitle] = useState<string>(img?.node.attrs.title ?? '');
  const [alt, setAlt] = useState<string>(img?.node.attrs.alt ?? '');
  const close = () => openModal(null);
  if (!img) return null;
  return (
    <Modal title={t('image.altText')} onClose={close} testId="alt-text-dialog" footer={(
      <>
        <button type="button" className="fl-btn" onClick={close}>{t('common.cancel')}</button>
        <button type="button" className="fl-btn is-primary" data-testid="alt-apply" onClick={() => { setImageProps(editor.activeView, img.pos, { title, alt }); close(); editor.focus(); }}>{t('common.apply')}</button>
      </>
    )}>
      <Row label={t('imageProps.altTitle')} htmlFor="alt-title"><input id="alt-title" className="fl-input" value={title} onChange={(e) => setTitle(e.target.value)} /></Row>
      <Row label={t('imageProps.description')} htmlFor="alt-desc"><textarea id="alt-desc" className="fl-input" rows={4} placeholder={t('imageProps.descriptionPlaceholder')} value={alt} data-testid="alt-description" onChange={(e) => setAlt(e.target.value)} /></Row>
    </Modal>
  );
}

// -----------------------------------------------------------------------------------------------

export function LinkDialog() {
  const t = useT();
  const { editor, openModal, toast } = useUI();
  const v = editor.activeView;
  const existing = useMemo(() => linkRange(v.state), [v]);
  const sel = v.state.selection;
  const [text, setText] = useState(() => (existing ? v.state.doc.textBetween(existing.from, existing.to) : v.state.doc.textBetween(sel.from, sel.to, ' ')));
  const [href, setHref] = useState<string>(existing?.mark.attrs.href || (existing?.mark.attrs.anchor ? `#${existing.mark.attrs.anchor}` : ''));
  const close = () => openModal(null);
  const apply = () => {
    if (!href.trim()) return;
    const url = linkUrl(href);
    if (!url) {
      toast(t('link.invalid'));
      return;
    }
    applyLink(v, editor.docx, url, text.trim() || undefined);
    close();
    editor.focus();
  };
  return (
    <Modal title={existing ? t('link.editTitle') : t('link.insertTitle')} onClose={close} testId="link-dialog" leftFooter={existing ? <button type="button" className="fl-btn" data-testid="link-remove-btn" onClick={() => { removeLink(v); close(); editor.focus(); }}>{t('link.remove')}</button> : undefined} footer={(
      <>
        <button type="button" className="fl-btn" onClick={close}>{t('common.cancel')}</button>
        <button type="button" className="fl-btn is-primary" disabled={!href.trim()} data-testid="link-apply" onClick={apply}>{t('common.apply')}</button>
      </>
    )}>
      <Row label={t('link.text')} htmlFor="link-text"><input id="link-text" className="fl-input" placeholder={t('link.text')} value={text} data-testid="link-text" onChange={(e) => setText(e.target.value)} /></Row>
      <Row label={t('link.url')} htmlFor="link-url"><input id="link-url" className="fl-input" placeholder="https://example.com" value={href} data-autofocus data-testid="link-url" onChange={(e) => setHref(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') apply(); }} /></Row>
    </Modal>
  );
}

// -----------------------------------------------------------------------------------------------

export function SplitCellDialog() {
  const t = useT();
  const { editor, openModal, toast } = useUI();
  const lim = useMemo(() => splitLimits(editor.activeView.state), [editor]);
  const [cols, setCols] = useState(lim && lim.cell.colspan > 1 ? String(lim.cell.colspan) : '2');
  const [rows, setRows] = useState(lim && lim.cell.rowspan > 1 ? String(lim.cell.rowspan) : '1');
  const close = () => openModal(null);
  if (!lim) return null;
  const c = Number(cols);
  const r = Number(rows);
  const colsOk = Number.isInteger(c) && c >= 1 && c <= lim.maxCols && (lim.cell.colspan === 1 || lim.cell.colspan % c === 0);
  const rowsOk = Number.isInteger(r) && r >= 1 && r <= lim.maxRows && (lim.cell.rowspan === 1 || lim.cell.rowspan % r === 0);
  const ok = colsOk && rowsOk && (c > 1 || r > 1);
  return (
    <Modal title={t('splitCell.title')} onClose={close} testId="split-cell-dialog" footer={(
      <>
        <button type="button" className="fl-btn" onClick={close}>{t('common.cancel')}</button>
        <button type="button" className="fl-btn is-primary" disabled={!ok} data-testid="split-submit" onClick={() => { if (!splitCellInto(editor.activeView, r, c)) toast(t('splitCell.range', { max: lim.maxCols })); close(); editor.focus(); }}>{t('splitCell.submit')}</button>
      </>
    )}>
      <Row label={t('splitCell.columns')} htmlFor="sc-cols"><input id="sc-cols" className="fl-input" type="number" min="1" max={lim.maxCols} value={cols} data-testid="split-cols" onChange={(e) => setCols(e.target.value)} /></Row>
      <Row label={t('splitCell.rows')} htmlFor="sc-rows"><input id="sc-rows" className="fl-input" type="number" min="1" max={lim.maxRows} value={rows} data-testid="split-rows" onChange={(e) => setRows(e.target.value)} /></Row>
      {!colsOk && <p className="fl-error">{t('splitCell.range', { max: lim.maxCols })}</p>}
      {colsOk && !rowsOk && <p className="fl-error">{t('splitCell.range', { max: lim.maxRows })}</p>}
    </Modal>
  );
}

// -----------------------------------------------------------------------------------------------

export function NoteDialog() {
  const t = useT();
  const { editor, openModal, modalData } = useUI();
  const key = modalData.key as string | undefined;
  const kind = (modalData.kind as 'footnote' | 'endnote' | undefined) ?? (key?.startsWith('endnote:') ? 'endnote' : 'footnote');
  const [text, setText] = useState(() => (key ? editor.noteText(key) : ''));
  const close = () => openModal(null);
  const save = () => {
    if (key) editor.setNoteText(key, text);
    else editor.insertNote(kind, text);
    close();
    editor.focus();
  };
  const title = key ? t(kind === 'endnote' ? 'note.editEndnote' : 'note.editFootnote') : t(kind === 'endnote' ? 'note.insertEndnote' : 'note.insertFootnote');
  return (
    <Modal title={title} onClose={close} testId="note-dialog" footer={(
      <>
        <button type="button" className="fl-btn" onClick={close}>{t('common.cancel')}</button>
        <button type="button" className="fl-btn is-primary" data-testid="note-save" onClick={save}>{key ? t('common.save') : t('common.insert')}</button>
      </>
    )}>
      <label className="fl-field-label" htmlFor="note-text">{t('note.text')}</label>
      <textarea id="note-text" className="fl-input" rows={4} value={text} autoFocus data-testid="note-text" onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) save(); }} />
      {!key && <p className="fl-note">{t('note.hint')}</p>}
    </Modal>
  );
}

// -----------------------------------------------------------------------------------------------

export function TextBoxDialog() {
  const t = useT();
  const { editor, openModal } = useUI();
  const current = useMemo(() => editor.textBoxAt(), [editor]);
  const [text, setText] = useState(current?.info.text ?? t('textBox.default'));
  const metric = rulerUsesMetric();
  const unit = t(metric ? 'common.centimeters' : 'common.inches');
  const [w, setW] = useState(emuToField(current?.info.width ?? TEXT_BOX_NEW.width, metric));
  const [h, setH] = useState(emuToField(current?.info.height ?? TEXT_BOX_NEW.height, metric));
  const [border, setBorder] = useState(current?.info.border ?? true);
  const close = () => openModal(null);
  const ok = () => {
    const width = Math.max(TEXT_BOX_MIN.width, fieldToEmu(w, metric, current?.info.width) || TEXT_BOX_NEW.width);
    const height = Math.max(TEXT_BOX_MIN.height, fieldToEmu(h, metric, current?.info.height) || TEXT_BOX_NEW.height);
    const info = { text, width, height, border };
    if (current) editor.updateTextBox(current.pos, info);
    else editor.insertTextBox(info);
    close();
    editor.focus();
  };
  return (
    <Modal title={current ? t('textBox.editTitle') : t('textBox.title')} onClose={close} testId="textbox-dialog" footer={(
      <>
        <button type="button" className="fl-btn" onClick={close}>{t('common.cancel')}</button>
        <button type="button" className="fl-btn is-primary" data-testid="textbox-ok" onClick={ok}>{current ? t('common.apply') : t('common.insert')}</button>
      </>
    )}>
      <label className="fl-field-label" htmlFor="tb-text">{t('textBox.text')}</label>
      <textarea id="tb-text" className="fl-input" rows={4} value={text} data-testid="textbox-text" onChange={(e) => setText(e.target.value)} />
      <Row label={t('textBox.width')} htmlFor="tb-w" unit={unit}><input id="tb-w" className="fl-input" type="number" step="0.1" min={emuToField(TEXT_BOX_MIN.width, metric)} value={w} onChange={(e) => setW(e.target.value)} /></Row>
      <Row label={t('textBox.height')} htmlFor="tb-h" unit={unit}><input id="tb-h" className="fl-input" type="number" step="0.1" min={emuToField(TEXT_BOX_MIN.height, metric)} value={h} onChange={(e) => setH(e.target.value)} /></Row>
      <Check label={t('textBox.border')} checked={border} onChange={setBorder} />
    </Modal>
  );
}

// -----------------------------------------------------------------------------------------------

export function ReportDialog() {
  const t = useT();
  const { editor, openModal, toast, files } = useUI();
  const [what, setWhat] = useState('');
  const details = useRef<HTMLTextAreaElement>(null);
  const info = useMemo(() => diagnostics(editor), [editor]);
  const report = reportText(what, info);
  const close = () => openModal(null);
  const copy = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard');
      await navigator.clipboard.writeText(report);
      toast(t('report.copied'));
    } catch {
      details.current?.select();
      toast(t('context.copyBlocked', { shortcut: shortcut('Ctrl+C') }));
    }
  };
  return (
    <Modal title={t('report.title')} onClose={close} testId="report-dialog" wide leftFooter={<button type="button" className="fl-btn" onClick={files.downloadDocx}>{t('report.download')}</button>} footer={(
      <>
        <button type="button" className="fl-btn" onClick={close}>{t('common.close')}</button>
        <button type="button" className="fl-btn is-primary" data-testid="report-copy" onClick={copy}>{t('report.copy')}</button>
      </>
    )}>
      <p className="fl-note">{t('report.intro')}</p>
      <label className="fl-field-label" htmlFor="report-what">{t('report.what')}</label>
      <textarea id="report-what" className="fl-input" rows={4} value={what} onChange={(e) => setWhat(e.target.value)} />
      <label className="fl-field-label" htmlFor="report-details">{t('report.details')}</label>
      <textarea ref={details} id="report-details" className="fl-input fl-mono" rows={8} readOnly value={report} data-testid="report-details" />
    </Modal>
  );
}

export function ShortcutsDialog() {
  const t = useT();
  const { openModal } = useUI();
  return (
    <Modal title={t('shortcuts.title')} onClose={() => openModal(null)} testId="shortcuts-dialog">
      <table className="fl-shortcuts">
        <tbody>
          {SHORTCUT_LIST.map(([k, d]) => (
            <tr key={k}><td><kbd>{isMac ? shortcut(k) : k}</kbd></td><td>{t(d)}</td></tr>
          ))}
        </tbody>
      </table>
    </Modal>
  );
}

export function AboutDialog() {
  const t = useT();
  const { openModal } = useUI();
  return (
    <Modal title={t('about.title')} onClose={() => openModal(null)} testId="about-dialog">
      <p>{t('about.body')}</p>
      <p className="fl-note">{ABOUT_VERSION}</p>
    </Modal>
  );
}

export function OpenFailureDialog() {
  const { t } = useI18n();
  const { openModal, modalData } = useUI();
  const reason = (modalData.reason as string) ?? 'unknown';
  const name = (modalData.name as string) ?? '';
  const code = (modalData.code as string) ?? 'open.unknown';
  const key = (reason === 'legacy' ? 'openFailure.legacy' : `openFailure.${reason}`) as MessageKey;
  return (
    <Modal title={t('openFailure.title')} onClose={() => openModal(null)} testId="open-failure-dialog" footer={<button type="button" className="fl-btn is-primary" onClick={() => openModal(null)}>{t('common.close')}</button>}>
      <p>{t(key, { name })}</p>
      <p className="fl-note">{t('openFailure.code', { code })}</p>
    </Modal>
  );
}
