import type {
  CollabState,
  ColorScheme,
  DocxEditor,
  EditorSnapshot,
  EditorStore,
  FileActions,
  FoliolineUI,
  Locale,
  ModalName,
  NavTab,
  SidePanelTab,
  Translate,
  UserInfo,
} from '@folioline/core';
import type { Commands } from '@folioline/core/views';
import { createContext, useContext, useSyncExternalStore } from 'react';

export interface UIContextValue {
  ui: FoliolineUI;
  editor: DocxEditor;
  store: EditorStore;
  /** Where menus, dialogs and messages are rendered (on the page's body). */
  layer: HTMLElement;
  t: Translate;
  locale: Locale;
  rtl: boolean;
  setLocale(locale: Locale): void;
  mobile: boolean;
  panelOpen: boolean;
  setPanelOpen(open: boolean): void;
  panelTab: SidePanelTab;
  setPanelTab(tab: SidePanelTab): void;
  navOpen: boolean;
  setNavOpen(open: boolean, tab?: NavTab): void;
  navTab: NavTab;
  setNavTab(tab: NavTab): void;
  /** The comment rail beside the pages (Show comments). */
  railOpen: boolean;
  setRailOpen(open: boolean): void;
  /** The new-comment draft, anchored at the selection it was opened for. */
  composerRange: { from: number; to: number } | null;
  openComposer(): void;
  closeComposer(): void;
  rulersOn: boolean;
  setRulersOn(on: boolean): void;
  modal: ModalName;
  modalData: Record<string, unknown>;
  openModal(m: ModalName, data?: Record<string, unknown>): void;
  toast(message: string): void;
  files: FileActions;
  user: UserInfo;
  setUser(u: UserInfo): void;
  scheme: ColorScheme;
  setScheme(s: ColorScheme): void;
  /** The live session, when there is one. */
  collab: CollabState | null;
  relay: boolean;
  startSession(): Promise<void>;
  leaveSession(): void;
  /** Colour of an author's cards, avatar and marks. */
  authorColor(name: string): string;
}

export const UIContext = createContext<UIContextValue | null>(null);

export function useUI(): UIContextValue {
  const v = useContext(UIContext);
  if (!v) throw new Error('UIContext missing');
  return v;
}

/** A value from the editor's snapshot; the component renders again when it changes. */
export function useSnapshot<T>(store: EditorStore, select: (s: EditorSnapshot) => T): T {
  return useSyncExternalStore(store.subscribe, () => select(store.getSnapshot()));
}

/** The interface strings and language. */
export function useI18n(): { t: Translate; locale: Locale; rtl: boolean; setLocale(locale: Locale): void } {
  const { t, locale, rtl, setLocale } = useUI();
  return { t, locale, rtl, setLocale };
}

export function useT(): Translate {
  return useUI().t;
}

/** The commands of the menus, toolbar, context menu and shortcuts. */
export function useCommands(): Commands {
  return useUI().ui.commands;
}
