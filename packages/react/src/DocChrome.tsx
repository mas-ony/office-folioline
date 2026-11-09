import { zoomEntries } from '@folioline/core/views';
import { ChevronDown, Minus, Plus, TextAlignStart } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSnapshot, useT, useUI } from './context';
import { cx, keepFocus } from './controls';
import { MenuButton } from './menu';

/** Zoom out, zoom level menu (Automatic, Fit width, fixed levels) and zoom in. */
export function ZoomBar() {
  const t = useT();
  const { ui, editor, store } = useUI();
  const zoom = useSnapshot(store, (s) => s.zoom);
  const viewMode = useSnapshot(store, (s) => s.viewMode);
  if (viewMode !== 'print') return null;
  const pct = Math.round(zoom * 100);
  return (
    <div className="fl-zoombar" role="group" aria-label={t('zoom.label')} data-testid="zoombar">
      <button type="button" className="fl-zoom-btn" aria-label={t('zoom.out')} title={t('zoom.out')} data-testid="zoom-out" onMouseDown={keepFocus} onClick={() => editor.zoomOut()}><Minus size={14} /></button>
      <MenuButton label={t('zoom.levelTitle', { percent: pct })} className="fl-zoom-level" testId="zoom-level" entries={() => zoomEntries(ui, store.getSnapshot())} align="center" menuLabel={t('zoom.label')}>
        <span>{pct}%</span>
        <ChevronDown size={11} className="fl-caret" />
      </MenuButton>
      <button type="button" className="fl-zoom-btn" aria-label={t('zoom.in')} title={t('zoom.in')} data-testid="zoom-in" onMouseDown={keepFocus} onClick={() => editor.zoomIn()}><Plus size={14} /></button>
    </div>
  );
}

/** "3 of 12", shown while the pages scroll. */
export function PageChip() {
  const t = useT();
  const { store } = useUI();
  const page = useSnapshot(store, (s) => s.pageIndex);
  const count = useSnapshot(store, (s) => s.pageCount);
  const viewMode = useSnapshot(store, (s) => s.viewMode);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(true);
    const id = setTimeout(() => setVisible(false), 1600);
    return () => clearTimeout(id);
  }, [page]);
  if (viewMode !== 'print') return null;
  return <div className={cx('fl-pagechip', visible && 'is-visible')} role="status" data-testid="page-indicator">{t('page.indicator', { current: page + 1, total: count })}</div>;
}

/** Round button that opens the navigation pane. */
export function NavToggle() {
  const t = useT();
  const { setNavOpen, navOpen } = useUI();
  if (navOpen) return null;
  return (
    <button type="button" className="fl-nav-toggle" aria-label={t('nav.open')} title={t('nav.open')} data-testid="nav-open" onClick={() => setNavOpen(true)}>
      <TextAlignStart size={18} />
    </button>
  );
}
