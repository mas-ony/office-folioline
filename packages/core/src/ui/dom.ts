/**
 * DOM behaviour shared by the React and Vue interfaces: media queries, popover stacking and
 * dismissal, the placement of floating panels and the dialog focus trap.
 */

export function cx(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(' ');
}

/** Keep the editor's selection (and the phone keyboard) when pressing toolbar controls. */
export const keepFocus = (e: { preventDefault(): void }) => e.preventDefault();

/** Phones and small landscape screens get the phone layout. */
export const MOBILE_QUERY = '(max-width: 767px), (max-height: 500px) and (pointer: coarse)';

/** Narrow windows, where the side panel is not remembered as open. */
export const NARROW_QUERY = '(max-width: 767px)';

export function matchesMedia(query: string): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : false;
}

/** Calls `fn` with the query's result whenever it changes; returns the unsubscribe function. */
export function watchMedia(query: string, fn: (matches: boolean) => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => undefined;
  const mq = window.matchMedia(query);
  const on = () => fn(mq.matches);
  mq.addEventListener('change', on);
  return () => mq.removeEventListener('change', on);
}

export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

/** Show a shortcut with the platform's modifier names. */
export function shortcut(s: string): string {
  return isMac ? s.replace(/Ctrl\+/g, '⌘').replace(/Alt\+/g, '⌥').replace(/Shift\+/g, '⇧') : s;
}

/** Initials for an avatar. */
export function initials(name: string): string {
  const parts = name.trim().split(/[\s_.-]+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// -----------------------------------------------------------------------------------------------
// Popovers

/** Open popovers and submenus on the page, oldest first. Only the topmost one reacts to outside clicks and Escape. */
const popoverStack: HTMLElement[] = [];

/** Register a floating layer (e.g. a submenu) so the popovers below treat it as their own. */
export function pushLayer(el: HTMLElement): () => void {
  popoverStack.push(el);
  return () => {
    const i = popoverStack.indexOf(el);
    if (i >= 0) popoverStack.splice(i, 1);
  };
}

export function topLayer(): HTMLElement | undefined {
  return popoverStack[popoverStack.length - 1];
}

/** Whether a popover or submenu is open (dialogs leave Escape to it). */
export function hasOpenLayer(): boolean {
  return popoverStack.length > 0;
}

function isAbove(el: HTMLElement, target: Node): boolean {
  const idx = popoverStack.indexOf(el);
  return popoverStack.slice(idx + 1).some((p) => p.contains(target));
}

/**
 * Leaves the field being edited inside `el`, if there is one, so that what was typed in it applies
 * as on a press anywhere else. Called on a press outside `el` (or on its anchor) before it
 * closes: a field removed while focused does not apply it.
 */
export function blurWithin(el: Element | null): void {
  const focused = document.activeElement;
  if (el && focused instanceof HTMLElement && el.contains(focused)) focused.blur();
}

/** What closed a popover: a press outside it, or Escape. */
export type PopoverClosedBy = 'press' | 'escape';

/**
 * Closes an open popover on a pointer press outside it and its anchor (unless inside a popover
 * opened above it), or on Escape when it is the topmost one, then returning the focus to the
 * anchor unless closing moved it. A press outside or on the anchor first leaves a field being
 * edited in the popover. `onClose` and `anchor` are read when needed. Returns the function that
 * stops tracking.
 */
export function trackPopover(self: HTMLElement | null, anchor: () => HTMLElement | null, onClose: (by: PopoverClosedBy) => void): () => void {
  if (self) popoverStack.push(self);
  const down = (e: PointerEvent) => {
    const t = e.target as Node;
    if (!self || self.contains(t) || isAbove(self, t)) return;
    blurWithin(self);
    // A press on the anchor is the anchor's to handle (its button opens and closes the popover).
    if (anchor()?.contains(t)) return;
    onClose('press');
  };
  const key = (e: KeyboardEvent) => {
    if (e.key !== 'Escape' || !self || popoverStack[popoverStack.length - 1] !== self) return;
    e.stopPropagation();
    e.preventDefault();
    const focused = document.activeElement;
    onClose('escape');
    if (document.activeElement === focused) anchor()?.focus();
  };
  document.addEventListener('pointerdown', down, true);
  document.addEventListener('keydown', key, true);
  return () => {
    document.removeEventListener('pointerdown', down, true);
    document.removeEventListener('keydown', key, true);
    const i = self ? popoverStack.indexOf(self) : -1;
    if (i >= 0) popoverStack.splice(i, 1);
  };
}

/**
 * Position of a popover below its anchor (above when there is no room) or at a point (context
 * menus), kept inside the window. Start and end follow the anchor's writing direction.
 */
export function placePopover(
  el: HTMLElement,
  anchor: HTMLElement | null,
  at: { x: number; y: number } | null | undefined,
  align: 'start' | 'end' | 'center',
): { left: number; top: number; maxHeight: number } {
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let left: number;
  let top: number;
  if (at) {
    left = at.x;
    top = at.y;
    if (left + w > vw - 8) left = Math.max(8, at.x - w);
    if (top + h > vh - 8) top = Math.max(8, vh - h - 8);
  } else {
    const a = anchor!.getBoundingClientRect();
    const rtl = getComputedStyle(anchor!).direction === 'rtl';
    const side = align === 'center' ? 'center' : (align === 'end') !== rtl ? 'right' : 'left';
    left = side === 'right' ? a.right - w : side === 'center' ? a.left + a.width / 2 - w / 2 : a.left;
    top = a.bottom + 6;
    if (top + h > vh - 8 && a.top - h - 6 > 8) top = a.top - h - 6;
  }
  left = Math.max(8, Math.min(left, vw - w - 8));
  top = Math.max(8, Math.min(top, vh - h - 8));
  return { left, top, maxHeight: vh - 16 };
}

/** A submenu beside its item in the reading direction, or on the other side when there is no room. */
export function placeSideMenu(el: HTMLElement, rect: DOMRect, rtl: boolean): { left: number; top: number } {
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  const after = rect.right + 2;
  const before = rect.left - w - 2;
  let left = rtl ? before : after;
  if (rtl && left < 8) left = after + w > window.innerWidth - 8 ? 8 : after;
  if (!rtl && left + w > window.innerWidth - 8) left = Math.max(8, before);
  const top = Math.max(8, Math.min(rect.top - 6, window.innerHeight - h - 8));
  return { left, top };
}

// -----------------------------------------------------------------------------------------------
// Menus and dialogs

const MENU_ITEM = '[role^="menuitem"]:not([aria-disabled="true"])';

/** The items of a menu, without those of its submenus. */
export function menuItems(menu: HTMLElement | null): HTMLElement[] {
  return Array.from(menu?.querySelectorAll<HTMLElement>(`:scope > ${MENU_ITEM}, :scope > .fl-menu-group > ${MENU_ITEM}`) ?? []);
}

export function focusMenuItem(menu: HTMLElement | null, which: 'first' | 'last' | number) {
  const items = menuItems(menu);
  if (!items.length) return;
  if (which === 'first') items[0].focus();
  else if (which === 'last') items[items.length - 1].focus();
  else items[(which + items.length) % items.length].focus();
}

/** Arrow keys, Home and End move between a menu's items; ArrowRight opens a submenu. */
export function menuKeyDown(menu: HTMLElement | null, e: Pick<KeyboardEvent, 'key' | 'preventDefault' | 'stopPropagation'>) {
  const idx = menuItems(menu).indexOf(document.activeElement as HTMLElement);
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    focusMenuItem(menu, idx + 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    focusMenuItem(menu, idx < 0 ? -1 : idx - 1);
  } else if (e.key === 'Home') {
    e.preventDefault();
    focusMenuItem(menu, 'first');
  } else if (e.key === 'End') {
    e.preventDefault();
    focusMenuItem(menu, 'last');
  } else if (e.key === 'ArrowRight') {
    const el = document.activeElement as HTMLElement | null;
    if (el?.dataset.submenu) {
      e.preventDefault();
      e.stopPropagation();
      el.click();
    }
  }
}

const FIRST_FIELD = '[data-autofocus], input:not([disabled]):not([type=radio]):not([type=checkbox]), select:not([disabled]), textarea:not([disabled])';

/**
 * Dialog behaviour: focus the first field, close on Escape (unless a popover is open), keep Tab
 * inside, and give focus back when the dialog closes. `onClose` is read when needed.
 */
export function trapFocus(dialog: HTMLElement | null, onClose: () => void): () => void {
  const prev = document.activeElement as HTMLElement | null;
  dialog?.querySelector<HTMLElement>(FIRST_FIELD)?.focus();
  const key = (e: KeyboardEvent) => {
    if (hasOpenLayer()) return;
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
    }
    if (e.key === 'Tab' && dialog) {
      const f = Array.from(dialog.querySelectorAll<HTMLElement>('input, select, textarea, button, [tabindex]:not([tabindex="-1"])')).filter((x) => !x.hasAttribute('disabled'));
      if (!f.length) return;
      const i = f.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey && i <= 0) {
        e.preventDefault();
        f[f.length - 1].focus();
      } else if (!e.shiftKey && i === f.length - 1) {
        e.preventDefault();
        f[0].focus();
      }
    }
  };
  document.addEventListener('keydown', key, true);
  return () => {
    document.removeEventListener('keydown', key, true);
    prev?.focus?.();
  };
}
