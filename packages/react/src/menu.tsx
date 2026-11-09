import { cx, focusMenuItem, keepFocus, type MenuEntry, menuKeyDown, placeSideMenu, pushLayer, topLayer } from '@folioline/core/views';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useUI } from './context';
import { Popover } from './controls';
import { Icon } from './icons';
import { MenuWidgetView } from './MenuWidget';

export type { MenuEntry };

/** A list of menu entries with keyboard navigation and side submenus. */
export function MenuList({ entries, onClose, label, autoFocus = true, testId, className }: {
  entries: MenuEntry[];
  onClose: () => void;
  label?: string;
  autoFocus?: boolean;
  testId?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { mobile } = useUI();
  const [sub, setSub] = useState<{ id: string; rect: DOMRect } | null>(null);
  /** Phones drill into submenus within the sheet. */
  const [drill, setDrill] = useState<string | null>(null);

  useEffect(() => {
    if (autoFocus) focusMenuItem(ref.current, 'first');
  }, [autoFocus, drill]);

  // Only keys pressed in this menu: those of a submenu (rendered elsewhere) reach it too.
  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (ref.current?.contains(e.target as Node)) menuKeyDown(ref.current, e);
  };

  const shown = drill ? (entries.find((x) => x.id === drill && x.type === 'submenu') as Extract<MenuEntry, { type: 'submenu' }> | undefined) : undefined;
  if (mobile && shown) {
    return (
      <div ref={ref} className={cx('fl-menu', className)} role="menu" aria-label={shown.label} onKeyDown={onKeyDown}>
        <button type="button" role="menuitem" className="fl-menuitem fl-menu-back" onClick={() => setDrill(null)}>
          <span className="fl-menuitem-icon"><ChevronLeft size={16} /></span>
          <span className="fl-menuitem-text"><span className="fl-menuitem-label">{shown.label}</span></span>
        </button>
        <div className="fl-menu-sep" role="separator" />
        {Array.isArray(shown.items) ? <MenuList entries={shown.items} onClose={onClose} autoFocus={false} /> : <MenuWidgetView widget={shown.items} close={onClose} />}
      </div>
    );
  }

  return (
    <div ref={ref} className={cx('fl-menu', className)} role="menu" aria-label={label} data-testid={testId} onKeyDown={onKeyDown}>
      {entries.map((entry) => {
        switch (entry.type) {
          case 'separator':
            return <div key={entry.id} className="fl-menu-sep" role="separator" />;
          case 'heading':
            return <div key={entry.id} className="fl-menu-heading">{entry.label}</div>;
          case 'custom':
            return <div key={entry.id} className="fl-menu-custom"><MenuWidgetView widget={entry.widget} close={onClose} /></div>;
          case 'submenu': {
            const open = sub?.id === entry.id;
            return (
              <SubmenuItem
                key={entry.id}
                entry={entry}
                open={open}
                rect={open ? sub!.rect : null}
                onOpen={(rect) => (mobile ? setDrill(entry.id) : setSub({ id: entry.id, rect }))}
                onCloseSub={() => setSub(null)}
                onCloseAll={onClose}
              />
            );
          }
          default: {
            const checkable = entry.checked !== undefined;
            const role = checkable ? (entry.radio ? 'menuitemradio' : 'menuitemcheckbox') : 'menuitem';
            return (
              <button
                key={entry.id}
                type="button"
                role={role}
                aria-checked={checkable ? entry.checked : undefined}
                aria-disabled={entry.disabled || undefined}
                aria-label={[entry.label, entry.hint, entry.shortcut, entry.disabled ? entry.reason : undefined].filter(Boolean).join(' ')}
                title={entry.disabled ? entry.reason : undefined}
                className={cx('fl-menuitem', entry.checked && 'is-checked', entry.disabled && 'is-disabled')}
                data-testid={entry.testId}
                onMouseDown={keepFocus}
                onMouseEnter={() => setSub(null)}
                onClick={() => {
                  if (entry.disabled) return;
                  if (!entry.keepOpen) onClose();
                  entry.onSelect();
                }}
              >
                <span className="fl-menuitem-icon">{checkable && entry.checked ? <Check size={16} /> : entry.icon && <Icon name={entry.icon} />}</span>
                <span className="fl-menuitem-text">
                  <span className="fl-menuitem-label">{entry.label}</span>
                  {entry.hint && <span className="fl-menuitem-hint">{entry.hint}</span>}
                </span>
                {entry.shortcut && <span className="fl-menuitem-shortcut">{entry.shortcut}</span>}
              </button>
            );
          }
        }
      })}
    </div>
  );
}

function SubmenuItem({ entry, open, rect, onOpen, onCloseSub, onCloseAll }: {
  entry: Extract<MenuEntry, { type: 'submenu' }>;
  open: boolean;
  rect: DOMRect | null;
  onOpen: (rect: DOMRect) => void;
  onCloseSub: () => void;
  onCloseAll: () => void;
}) {
  const btn = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openNow = () => {
    if (entry.disabled || !btn.current) return;
    onOpen(btn.current.getBoundingClientRect());
  };
  return (
    <>
      <button
        ref={btn}
        type="button"
        role="menuitem"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-disabled={entry.disabled || undefined}
        data-submenu="1"
        className={cx('fl-menuitem', open && 'is-open', entry.disabled && 'is-disabled')}
        data-testid={entry.testId}
        onMouseDown={keepFocus}
        onMouseEnter={() => {
          timer.current = setTimeout(openNow, 120);
        }}
        onMouseLeave={() => {
          if (timer.current) clearTimeout(timer.current);
        }}
        onClick={openNow}
      >
        <span className="fl-menuitem-icon">{entry.icon && <Icon name={entry.icon} />}</span>
        <span className="fl-menuitem-text"><span className="fl-menuitem-label">{entry.label}</span></span>
        <ChevronRight size={14} className="fl-menuitem-arrow" />
      </button>
      {open && rect && (
        <SideMenu rect={rect} label={entry.label} onClose={() => { onCloseSub(); btn.current?.focus(); }}>
          {Array.isArray(entry.items) ? <MenuList entries={entry.items} onClose={onCloseAll} label={entry.label} /> : <MenuWidgetView widget={entry.items} close={onCloseAll} />}
        </SideMenu>
      )}
    </>
  );
}

/** A submenu placed beside its item (on the other side when there is no room). */
function SideMenu({ rect, label, onClose, children }: { rect: DOMRect; label: string; onClose: () => void; children: ReactNode }) {
  const { layer, rtl } = useUI();
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useLayoutEffect(() => {
    if (ref.current) setPos(placeSideMenu(ref.current, rect, rtl));
  }, [rect, rtl]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const pop = pushLayer(el);
    const key = (e: KeyboardEvent) => {
      if (topLayer() !== el) return;
      if (e.key === 'ArrowLeft' || e.key === 'Escape') {
        e.stopPropagation();
        e.preventDefault();
        closeRef.current();
      }
    };
    document.addEventListener('keydown', key, true);
    return () => {
      pop();
      document.removeEventListener('keydown', key, true);
    };
  }, []);
  return createPortal(
    <div ref={ref} className="fl-popover fl-submenu" role="presentation" aria-label={label} style={{ position: 'fixed', left: pos?.left ?? -9999, top: pos?.top ?? -9999 }}>
      {children}
    </div>,
    layer,
  );
}

/** A button that opens a menu below it. */
export function MenuButton({ label, title, children, className, testId, entries, align, disabled, render, menuLabel, onOpenChange, sheetTitle }: {
  label: string;
  title?: string;
  children: ReactNode;
  className?: string;
  testId?: string;
  entries?: MenuEntry[] | (() => MenuEntry[]);
  render?: (close: () => void) => ReactNode;
  align?: 'start' | 'end' | 'center';
  disabled?: boolean;
  menuLabel?: string;
  onOpenChange?: (open: boolean) => void;
  sheetTitle?: string;
}) {
  const [open, setOpenState] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const setOpen = useCallback((v: boolean) => {
    setOpenState(v);
    onOpenChange?.(v);
  }, [onOpenChange]);
  const close = useCallback(() => setOpen(false), [setOpen]);
  return (
    <>
      <button
        ref={btn}
        type="button"
        className={cx(className, open && 'is-open')}
        aria-label={label}
        title={title ?? label}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        data-testid={testId}
        onMouseDown={keepFocus}
        onClick={() => setOpen(!open)}
      >
        {children}
      </button>
      <Popover anchor={btn.current} open={open} onClose={close} align={align} title={sheetTitle ?? menuLabel ?? label} role="presentation">
        {render ? render(close) : <MenuList entries={typeof entries === 'function' ? entries() : entries ?? []} onClose={close} label={menuLabel ?? label} />}
      </Popover>
    </>
  );
}
