import { blurWithin, cx, initials, keepFocus, placePopover, type PopoverClosedBy, trackPopover, trapFocus } from '@folioline/core/views';
import { X } from 'lucide-react';
import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useUI } from './context';

export { cx, keepFocus };

// -----------------------------------------------------------------------------------------------
// Popover: anchored panel on desktop, bottom sheet on phones

export interface PopoverProps {
  anchor: HTMLElement | null;
  open: boolean;
  onClose: (by?: PopoverClosedBy) => void;
  children: ReactNode;
  className?: string;
  align?: 'start' | 'end' | 'center';
  /** Render as a bottom sheet on small screens. */
  sheetOnMobile?: boolean;
  title?: string;
  role?: string;
  testId?: string;
  /** Fixed point (context menus) instead of an anchor element. */
  at?: { x: number; y: number } | null;
}

export function Popover({ anchor, open, onClose, children, className, align = 'start', sheetOnMobile = true, title, role = 'dialog', testId, at }: PopoverProps) {
  const { layer, mobile: phone } = useUI();
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties>({ visibility: 'hidden' });
  const mobile = phone && sheetOnMobile;
  // Read when needed, so that the popover keeps its place among the open ones.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const anchorRef = useRef(anchor);
  anchorRef.current = anchor;

  useLayoutEffect(() => {
    if (!open || mobile || (!anchor && !at) || !ref.current) return;
    const place = () => setStyle(placePopover(ref.current!, anchor, at, align));
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [open, anchor, mobile, align, children, at]);

  useEffect(() => {
    if (!open) return;
    return trackPopover(ref.current, () => anchorRef.current, (by) => closeRef.current(by));
  }, [open, mobile]);

  if (!open) return null;
  if (mobile) {
    return createPortal(
      <div ref={ref} className="fl-sheet-backdrop" onPointerDown={(e) => { if (e.target !== e.currentTarget) return; blurWithin(e.currentTarget); onClose(); }}>
        <div className={cx('fl-sheet', className)} role={role} aria-label={title} data-testid={testId}>
          <div className="fl-sheet-grip" aria-hidden="true" />
          {title && (
            <div className="fl-sheet-title">
              <span>{title}</span>
              <button type="button" className="fl-icon-btn" aria-label="Close" onClick={() => onClose()}><X size={18} /></button>
            </div>
          )}
          <div className="fl-sheet-body">{children}</div>
        </div>
      </div>,
      layer,
    );
  }
  return createPortal(
    <div ref={ref} className={cx('fl-popover', className)} style={{ position: 'fixed', ...style }} role={role} aria-label={title} data-testid={testId}>
      {children}
    </div>,
    layer,
  );
}

// -----------------------------------------------------------------------------------------------
// Dialogs

export function Modal({ title, open = true, onClose, children, footer, testId, wide, className, leftFooter }: {
  title: string;
  open?: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  leftFooter?: ReactNode;
  testId?: string;
  wide?: boolean;
  className?: string;
}) {
  const { layer } = useUI();
  const ref = useRef<HTMLDivElement>(null);
  // Read when needed: the dialog keeps its focus while it renders again.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    return trapFocus(ref.current, () => closeRef.current());
  }, [open]);
  if (!open) return null;
  return createPortal(
    <div className="fl-modal-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} className={cx('fl-modal', wide && 'is-wide', className)} role="dialog" aria-modal="true" aria-label={title} data-testid={testId}>
        <div className="fl-modal-head">
          <h2>{title}</h2>
          <button type="button" className="fl-icon-btn fl-modal-close" aria-label="Close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="fl-modal-body">{children}</div>
        {(footer || leftFooter) && (
          <div className="fl-modal-foot">
            {leftFooter && <div className="fl-modal-foot-left">{leftFooter}</div>}
            {footer}
          </div>
        )}
      </div>
    </div>,
    layer,
  );
}

/** A small-caps section heading inside a dialog. */
export function Section({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={cx('fl-section', className)}>
      <h3 className="fl-section-title">{title}</h3>
      {children}
    </section>
  );
}

/** Label and control in one row. */
export function Row({ label, htmlFor, children, unit }: { label: ReactNode; htmlFor?: string; children: ReactNode; unit?: string }) {
  return (
    <div className="fl-row">
      <label className="fl-row-label" htmlFor={htmlFor}>{label}</label>
      <div className="fl-row-control">
        {children}
        {unit && <span className="fl-unit">{unit}</span>}
      </div>
    </div>
  );
}

export function Check({ label, checked, onChange, disabled, hint, testId }: { label: ReactNode; checked: boolean; onChange: (on: boolean) => void; disabled?: boolean; hint?: string; testId?: string }) {
  return (
    <label className={cx('fl-check', disabled && 'is-disabled')}>
      <input type="checkbox" checked={checked} disabled={disabled} data-testid={testId} onChange={(e) => onChange(e.target.checked)} />
      <span>
        {label}
        {hint && <small>{hint}</small>}
      </span>
    </label>
  );
}

/** A message at the bottom; the interface takes it away after a few seconds. */
export function Toast({ message }: { message: string }) {
  const { layer } = useUI();
  return createPortal(<div className="fl-toast" role="status" data-testid="toast">{message}</div>, layer);
}

/** Avatar with an author's initials and colour. */
export function Avatar({ name, color, size = 'md' }: { name: string; color: string; size?: 'sm' | 'md' }) {
  return <span className={cx('fl-avatar', `is-${size}`)} style={{ background: color }} aria-hidden="true">{initials(name)}</span>;
}
