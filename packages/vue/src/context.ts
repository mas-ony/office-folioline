/** The interface's context for the Vue components. */
import type { Commands, DocxEditor, EditorSnapshot, EditorStore, FoliolineOptions, FoliolineUI, Translate, UIState } from '@folioline/core/views';
import { computed, type ComputedRef, inject, type InjectionKey, type ShallowRef } from 'vue';

export interface UIContext {
  ui: FoliolineUI;
  /** State of the interface; templates and computed values that read it follow it. */
  state: Readonly<ShallowRef<UIState>>;
  /** The editor's snapshot (read it through useSnapshot). */
  snapshot: Readonly<ShallowRef<EditorSnapshot>>;
  editor: DocxEditor;
  store: EditorStore;
  /** Where menus, dialogs and messages are rendered (on the page's body). */
  layer: HTMLElement;
  /** The component's options; what is built from them (the Examples menu) follows them. */
  options: Readonly<ShallowRef<FoliolineOptions>>;
}

export const UI_KEY: InjectionKey<UIContext> = Symbol('folioline-ui');

/**
 * Keys pressed in a submenu that it left alone, for the menu around it (the menu bar moves to the
 * next menu on ArrowRight). Submenus are rendered in the layer, outside the menu's element.
 */
export const SUBMENU_KEYS: InjectionKey<(e: KeyboardEvent) => void> = Symbol('folioline-submenu-keys');

export function useUI(): UIContext {
  const v = inject(UI_KEY);
  if (!v) throw new Error('UIContext missing');
  return v;
}

/** A value from the editor's snapshot; what reads it updates when the value changes. */
export function useSnapshot<T>(select: (s: EditorSnapshot) => T): ComputedRef<T> {
  const { snapshot } = useUI();
  return computed(() => select(snapshot.value));
}

/** The interface strings; what calls it renders again when the language changes. */
export function useT(): Translate {
  const { state } = useUI();
  return (key, params) => state.value.t(key, params);
}

/** The commands of the menus, toolbar, context menu and shortcuts. */
export function useCommands(): Commands {
  return useUI().ui.commands;
}

/** Colour of an author's cards, avatar and marks (the live session's colours while there is one). */
export function useAuthorColor(): (name: string) => string {
  const { ui, state } = useUI();
  return (name) => {
    void state.value.collab;
    return ui.authorColor(name);
  };
}
