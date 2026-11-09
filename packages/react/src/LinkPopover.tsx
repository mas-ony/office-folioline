import { linkRange, removeLink } from '@folioline/core/views';
import { Copy, ExternalLink, Pencil, Unlink } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSnapshot, useT, useUI } from './context';
import { keepFocus } from './controls';

/** Address of the link at the caret with copy, edit, remove and open. */
export function LinkPopover() {
  const t = useT();
  const { editor, store, layer, openModal, toast, modal } = useUI();
  const href = useSnapshot(store, (s) => (s.cursor?.textSelected ? null : s.cursor?.link ?? null));
  const stream = useSnapshot(store, (s) => s.stream);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const on = () => setFocused(editor.activeView.hasFocus());
    document.addEventListener('focusin', on);
    document.addEventListener('focusout', on);
    return () => {
      document.removeEventListener('focusin', on);
      document.removeEventListener('focusout', on);
    };
  }, [editor]);

  useEffect(() => {
    if (!href) {
      setPos(null);
      return;
    }
    const v = editor.activeView;
    const r = linkRange(v.state);
    if (!r) return;
    try {
      const c = v.coordsAtPos(r.from);
      setPos({ left: Math.max(8, Math.min(c.left, window.innerWidth - 340)), top: c.bottom + 6 });
    } catch {
      setPos(null);
    }
    const hide = () => setPos(null);
    editor.scrollEl.addEventListener('scroll', hide, { passive: true, once: true });
    return () => editor.scrollEl.removeEventListener('scroll', hide);
  }, [href, editor, stream]);

  if (!href || !pos || modal || (!focused && !document.activeElement?.closest('.fl-linkpop'))) return null;
  const v = editor.activeView;
  const mark = linkRange(v.state)?.mark;
  const internal = !!mark?.attrs.anchor && !mark?.attrs.href;
  const external = /^(https?:|mailto:)/i.test(href);
  const copy = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard');
      await navigator.clipboard.writeText(href);
      toast(t('link.copied'));
    } catch {
      toast(t('context.copyBlocked', { shortcut: 'Ctrl+C' }));
    }
  };
  return createPortal(
    <div className="fl-linkpop" style={{ left: pos.left, top: pos.top }} role="dialog" aria-label={t('link.editTitle')} data-testid="link-popover" onMouseDown={keepFocus}>
      {internal ? (
        <span className="fl-linkpop-url">{t('link.internal')}</span>
      ) : external ? (
        <a className="fl-linkpop-url" href={href} target="_blank" rel="noopener noreferrer" title={t('link.open')}>{href}</a>
      ) : (
        <span className="fl-linkpop-url">{href}</span>
      )}
      <span className="fl-linkpop-actions">
        {!internal && <button type="button" className="fl-icon-btn is-small" aria-label={t('link.copy')} title={t('link.copy')} onClick={copy}><Copy size={15} /></button>}
        {!editor.readOnly && <button type="button" className="fl-icon-btn is-small" aria-label={t('link.edit')} title={t('link.edit')} data-testid="link-edit" onClick={() => openModal('link')}><Pencil size={15} /></button>}
        {!editor.readOnly && <button type="button" className="fl-icon-btn is-small" aria-label={t('link.remove')} title={t('link.remove')} data-testid="link-remove" onClick={() => { removeLink(editor.activeView); editor.focus(); }}><Unlink size={15} /></button>}
        {external && <a className="fl-icon-btn is-small" href={href} target="_blank" rel="noopener noreferrer" aria-label={t('link.open')} title={t('link.open')}><ExternalLink size={15} /></a>}
      </span>
    </div>,
    layer,
  );
}
