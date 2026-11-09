import type { DocxEditorRef } from '../api/page';
import type { DocumentInput } from '../api/source';
import type { CollabState } from '../collab/session';
import type { Locale, Translate } from '../i18n';
import type { FoliolineUI } from './controller';

export type { DocumentInput };

export interface FileActions {
  newDocument(): void;
  /** Pick a .docx from the device. */
  open(): void;
  openExample(id: string): void;
  /** Word document (.docx). */
  downloadDocx(): void;
  exportPdf(): Promise<void>;
  exportMarkdown(): void;
  print(): void;
  /** System share sheet with the DOCX (only where the browser supports sharing files). */
  share?: () => void;
}

export type SidePanelTab = 'changes' | 'settings';
export type NavTab = 'headings' | 'find' | 'bookmarks';
export type ColorScheme = 'light' | 'dark';

export type ModalName =
  | 'pageSetup'
  | 'paragraph'
  | 'watermark'
  | 'trackOptions'
  | 'bookmark'
  | 'imageProps'
  | 'altText'
  | 'link'
  | 'splitCell'
  | 'note'
  | 'textBox'
  | 'report'
  | 'shortcuts'
  | 'about'
  | 'openFailure'
  | null;

export interface UserInfo {
  name: string;
}

/** A document offered under File › Examples. */
export interface Example {
  id: string;
  /** Where the DOCX is fetched from. */
  url: string;
  /** Menu label; by default the interface's own text for the example `id` (`example.<id>`). */
  label?: string;
  /** File name after opening; the last part of `url` by default. */
  name?: string;
}

/** Hooks the page API uses to drive the interface. */
export interface UIControls {
  setPanelOpen(open: boolean): void;
  setPanelTab(tab: SidePanelTab): void;
  setScheme(scheme: ColorScheme): void;
  setUser(user: UserInfo): void;
  setRailOpen(open: boolean): void;
  setNavOpen(open: boolean, tab?: NavTab): void;
  openModal(m: ModalName, data?: Record<string, unknown>): void;
  toast(message: string): void;
  joinRoom(room: string): Promise<void>;
}

/** Options of the FoliolineEditor components (React and Vue) and of mount(). */
export interface FoliolineOptions {
  /** Opened at start, and again whenever it changes. */
  document?: DocumentInput;
  /** Documents for File › Examples; without any, the menu has no Examples. */
  examples?: Example[];
  /** Interface language; by default the stored one or the browser's. */
  locale?: Locale;
  /** Shown on comments and tracked changes; by default the stored name or a generated one. */
  user?: UserInfo;
  colorScheme?: ColorScheme;
  /**
   * Keeps the reader's settings in localStorage under `<storageKey>-…`: name, language,
   * appearance, rulers, side panel and markup options.
   */
  storageKey?: string;
  /** Keeps unsaved changes in an IndexedDB database of this name and offers to recover them. */
  autosave?: string;
  /** With `autosave`: offer to recover unsaved changes at start (by default when no document or room is given). */
  offerRecovery?: boolean;
  /** Base URL of the live-session relay (default `/collab`, served by @folioline/relay). */
  relay?: string;
  /** Link that opens a live session; by default this page with `?room=<id>`. */
  shareLink?: (room: string) => string;
  /** Join this live session at start. */
  room?: string;
  /** Replace some of the built-in file actions (Open, Save, Export, Print…). */
  files?: Partial<FileActions>;
  /** Handle Ctrl+F and Ctrl+Shift+E anywhere on the page, not only inside the editor. */
  globalShortcuts?: boolean;
  /** Called once the editor is ready and the initial document (or live session) has opened. */
  onReady?: (editor: DocxEditorRef, ui: FoliolineUI) => void;
  /** Called when the reader changes their name in Settings. */
  onUserChange?: (user: UserInfo) => void;
  /** Called when the reader picks another interface language. */
  onLocaleChange?: (locale: Locale) => void;
  /** Called when the reader picks another appearance. */
  onColorSchemeChange?: (scheme: ColorScheme) => void;
}

/** State of the interface around the editor. */
export interface UIState {
  mobile: boolean;
  panelOpen: boolean;
  panelTab: SidePanelTab;
  navOpen: boolean;
  navTab: NavTab;
  /** The comment rail beside the pages (Show comments). */
  railOpen: boolean;
  /** The new-comment draft, anchored at the selection it was opened for. */
  composerRange: { from: number; to: number } | null;
  rulersOn: boolean;
  modal: ModalName;
  modalData: Record<string, unknown>;
  toast: string | null;
  user: UserInfo;
  scheme: ColorScheme;
  /** The live session, when there is one. */
  collab: CollabState | null;
  /** Whether the page was served with the live-session relay. */
  relay: boolean;
  /** The options menu of the header or footer being edited. */
  hfMenu: { at: { x: number; y: number }; pageIndex: number } | null;
  /** Unsaved work found by autosave, offered for recovery. */
  restore: { fileName: string; savedAt: number } | null;
  /** The interface language whose strings are loaded, and its direction. */
  locale: Locale;
  rtl: boolean;
  t: Translate;
  /** The strings of the first language have loaded; the interface renders from then on. */
  i18nReady: boolean;
  /** The initial document (or live session) has opened and the page API handle is available. */
  ready: boolean;
}

/** Fonts offered by the font picker, by category (names Word documents commonly use). */
export const FONT_GROUPS: { id: 'sansSerif' | 'serif' | 'monospace'; fonts: string[] }[] = [
  { id: 'sansSerif', fonts: ['Arial', 'Calibri', 'Aptos', 'Helvetica', 'Segoe UI', 'Tahoma', 'Trebuchet MS', 'Verdana'] },
  { id: 'serif', fonts: ['Cambria', 'Garamond', 'Georgia', 'Palatino Linotype', 'Times New Roman'] },
  { id: 'monospace', fonts: ['Consolas', 'Courier New', 'Lucida Console'] },
];

export const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36, 48, 72];

export const ZOOM_LEVELS = [25, 50, 75, 100, 125, 150, 200];

export const LINE_SPACINGS = [1, 1.15, 1.5, 2, 2.5, 3];
