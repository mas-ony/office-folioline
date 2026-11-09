import type { DocxEditorRef, FoliolineOptions, FoliolineUI } from '@folioline/core';
import { createApp, h, shallowReactive } from 'vue';
import FoliolineEditor from './FoliolineEditor.vue';

export interface MountedEditor {
  /** Resolves with the page API handle once the initial document (or live session) has opened. */
  ready: Promise<DocxEditorRef>;
  /** Change options, as new props would. */
  update(options: FoliolineOptions): void;
  /** Remove the editor from the page. */
  destroy(): void;
}

/** Render the editor into an element, without writing Vue code. */
export function mount(element: HTMLElement, options: FoliolineOptions = {}): MountedEditor {
  let resolve!: (editor: DocxEditorRef) => void;
  const ready = new Promise<DocxEditorRef>((r) => (resolve = r));
  const current = shallowReactive<FoliolineOptions>({ ...options });
  const app = createApp({
    render() {
      const { onReady, onUserChange, onLocaleChange, onColorSchemeChange, ...props } = current;
      return h(FoliolineEditor, {
        ...props,
        onReady: (editor: DocxEditorRef, ui: FoliolineUI) => {
          resolve(editor);
          onReady?.(editor, ui);
        },
        'onUpdate:user': onUserChange,
        'onUpdate:locale': onLocaleChange,
        'onUpdate:colorScheme': onColorSchemeChange,
      });
    },
  });
  app.mount(element);
  return {
    ready,
    update(next) {
      Object.assign(current, next);
    },
    destroy() {
      app.unmount();
    },
  };
}
