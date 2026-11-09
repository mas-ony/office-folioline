import { exportEntries, menuModel, MODE_ICONS, modeEntries } from '@folioline/core/views';
import {
  ChevronDown,
  Download,
  FilePlusCorner,
  FolderOpen,
  Menu as MenuIcon,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { useCommands, useSnapshot, useT, useUI } from './context';
import { Avatar, cx, keepFocus, Popover } from './controls';
import { Icon } from './icons';
import { MenuButton, MenuList } from './menu';
import { PhoneMenu } from './PhoneMenu';

export function AppIcon({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="fl-app-icon">
      <rect x="2" y="2" width="28" height="28" rx="7" fill="var(--fl-brand, #1f5f4a)" />
      <path d="M10 8h9l4 4v12a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 9 24V9.5A1.5 1.5 0 0 1 10.5 8Z" fill="#fff" />
      <path d="M19 8v3.2c0 .5.3.8.8.8H23" fill="none" stroke="var(--fl-brand, #1f5f4a)" strokeWidth="1.2" />
      <path d="M12 15h8M12 18h8M12 21h5" stroke="var(--fl-brand, #1f5f4a)" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function ModeMenu({ compact }: { compact?: boolean }) {
  const t = useT();
  const { ui, store } = useUI();
  const mode = useSnapshot(store, (s) => s.editMode);
  return (
    <MenuButton label={t('mode.label')} title={t('mode.label')} className={cx('fl-mode-btn', compact && 'is-compact', `is-${mode}`)} testId="mode-menu" entries={() => modeEntries(ui, store.getSnapshot())} align="end" menuLabel={t('mode.label')}>
      <Icon name={MODE_ICONS[mode]} />
      {!compact && <span>{t(`mode.${mode}`)}</span>}
      {!compact && <ChevronDown size={13} className="fl-caret" />}
    </MenuButton>
  );
}

export function ExportMenu({ compact }: { compact?: boolean }) {
  const t = useT();
  const { ui } = useUI();
  return (
    <MenuButton label={t('title.export')} className={cx('fl-btn is-dark', compact && 'is-compact')} testId="export-menu" entries={() => exportEntries(ui)} align="end" menuLabel={t('title.export')}>
      <Download size={16} />
      {!compact && <span>{t('title.export')}</span>}
      <ChevronDown size={13} className="fl-caret" />
    </MenuButton>
  );
}

/** File, Format, Insert, Review and Help. */
function MenuBar() {
  const t = useT();
  const { ui, store } = useUI();
  const snap = useSnapshot(store, (s) => s);
  const model = menuModel(ui, snap);
  const [open, setOpen] = useState<string | null>(null);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const current = model.find((m) => m.id === open);

  const move = (dir: 1 | -1) => {
    const i = model.findIndex((m) => m.id === open);
    const next = model[(i + dir + model.length) % model.length];
    setOpen(next.id);
    refs.current[next.id]?.focus();
  };
  const onBarKey = (e: KeyboardEvent, id: string) => {
    const i = model.findIndex((m) => m.id === id);
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const next = model[(i + (e.key === 'ArrowRight' ? 1 : -1) + model.length) % model.length];
      refs.current[next.id]?.focus();
      if (open) setOpen(next.id);
    } else if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(id);
    }
  };
  return (
    <nav className="fl-menubar" role="menubar" aria-label={t('title.menuBar')} data-testid="menubar">
      {model.map((m) => (
        <button
          key={m.id}
          ref={(el) => {
            refs.current[m.id] = el;
          }}
          type="button"
          role="menuitem"
          aria-haspopup="menu"
          aria-expanded={open === m.id}
          className={cx('fl-menubar-item', open === m.id && 'is-open')}
          data-testid={`menubar-${m.id}`}
          onMouseDown={keepFocus}
          onClick={() => setOpen(open === m.id ? null : m.id)}
          onMouseEnter={() => open && open !== m.id && setOpen(m.id)}
          onKeyDown={(e) => onBarKey(e, m.id)}
        >
          {m.label}
        </button>
      ))}
      {current && (
        <Popover anchor={refs.current[current.id] ?? null} open onClose={() => setOpen(null)} role="presentation" title={current.label}>
          <div
            onKeyDown={(e) => {
              const el = document.activeElement as HTMLElement | null;
              if (e.key === 'ArrowRight' && !el?.dataset.submenu) {
                e.preventDefault();
                move(1);
              } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                move(-1);
              }
            }}
          >
            <MenuList entries={current.entries} onClose={() => setOpen(null)} label={current.label} testId={`menu-${current.id}`} />
          </div>
        </Popover>
      )}
    </nav>
  );
}

function DocumentName() {
  const t = useT();
  const { editor, store } = useUI();
  const fileName = useSnapshot(store, (s) => s.fileName);
  const dirty = useSnapshot(store, (s) => s.dirty);
  const base = fileName.replace(/\.docx$/i, '');
  const [text, setText] = useState(base);
  useEffect(() => setText(base), [base]);
  const commit = () => {
    const v = text.trim();
    if (!v) setText(base);
    else if (v !== base) {
      editor.fileName = `${v}.docx`;
      editor.markChanged();
      store.refresh();
    }
  };
  return (
    <div className="fl-docname">
      <input
        className="fl-docname-input"
        aria-label={t('title.documentName')}
        value={text}
        size={Math.max(4, Math.min(28, text.length + 1))}
        spellCheck={false}
        data-testid="doc-name"
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commit();
            editor.focus();
          } else if (e.key === 'Escape') {
            setText(base);
            editor.focus();
          }
        }}
      />
      <span className="fl-docname-ext">.docx</span>
      <span className={cx('fl-save-dot', dirty && 'is-dirty')} role="status" title={dirty ? t('app.unsaved') : t('app.saved')} aria-label={dirty ? t('app.unsaved') : t('app.saved')} />
    </div>
  );
}

function People() {
  const t = useT();
  const { collab, authorColor } = useUI();
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  if (!collab || collab.participants.length < 2) return null;
  const list = collab.participants;
  return (
    <>
      <button ref={setAnchor} type="button" className="fl-people" aria-label={t('title.people')} title={t('title.people')} data-testid="people" onClick={() => setOpen(!open)}>
        {list.slice(0, 3).map((p) => <Avatar key={p.clientID} name={p.name} color={p.color || authorColor(p.name)} size="sm" />)}
        {list.length > 3 && <span className="fl-people-more">+{list.length - 3}</span>}
      </button>
      <Popover anchor={anchor} open={open} onClose={() => setOpen(false)} align="end" title={t('title.people')}>
        <ul className="fl-people-list">
          {list.map((p) => (
            <li key={p.clientID}><Avatar name={p.name} color={p.color} size="sm" /> {p.name}{p.self ? ` (${t('settings.you')})` : ''}</li>
          ))}
        </ul>
      </Popover>
    </>
  );
}

export function TitleBar() {
  const t = useT();
  const { mobile, panelOpen, setPanelOpen } = useUI();
  const cmd = useCommands();
  const [phoneMenu, setPhoneMenu] = useState(false);
  const menuBtn = useRef<HTMLButtonElement>(null);
  return (
    <header className="fl-titlebar" data-testid="titlebar">
      <div className="fl-brand" aria-label={t('app.name')}>
        <AppIcon />
        {!mobile && <span className="fl-brand-name">{t('app.name')}</span>}
      </div>
      <DocumentName />
      {!mobile && <MenuBar />}
      <div className="fl-title-actions">
        <People />
        {!mobile && <ModeMenu />}
        {!mobile && <span className="fl-title-divider" aria-hidden="true" />}
        {mobile ? (
          <>
            <button ref={menuBtn} type="button" className="fl-icon-btn" aria-label={t('title.menu')} title={t('title.menu')} aria-haspopup="menu" aria-expanded={phoneMenu} data-testid="phone-menu-btn" onClick={() => setPhoneMenu(true)}>
              <MenuIcon size={19} />
            </button>
            <PhoneMenu open={phoneMenu} onClose={() => setPhoneMenu(false)} />
          </>
        ) : (
          <>
            <button type="button" className="fl-btn is-quiet" title={t('title.openTitle')} data-testid="open-btn" onClick={cmd.open}>
              <FolderOpen size={16} />
              <span>{t('title.open')}</span>
            </button>
            <button type="button" className="fl-btn is-quiet" title={t('title.newTitle')} data-testid="new-btn" onClick={cmd.newDocument}>
              <FilePlusCorner size={16} />
              <span>{t('title.new')}</span>
            </button>
          </>
        )}
        <ExportMenu compact={mobile} />
        <button
          type="button"
          className={cx('fl-icon-btn fl-panel-toggle', panelOpen && 'is-on')}
          aria-label={panelOpen ? t('title.collapsePanel') : t('title.openPanel')}
          title={panelOpen ? t('title.collapsePanel') : t('title.openPanelTitle')}
          aria-expanded={panelOpen}
          aria-controls="fl-side-panel"
          data-testid="panel-toggle"
          onClick={() => setPanelOpen(!panelOpen)}
        >
          {panelOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
        </button>
      </div>
    </header>
  );
}
