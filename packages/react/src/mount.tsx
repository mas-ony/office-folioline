import type { DocxEditorRef, FoliolineOptions, FoliolineUI } from '@folioline/core';
import { createRoot } from 'react-dom/client';
import { FoliolineEditor } from './FoliolineEditor';

export interface MountedEditor {
  /** Resolves with the page API handle once the initial document (or live session) has opened. */
  ready: Promise<DocxEditorRef>;
  /** Change options, as new props would. */
  update(options: FoliolineOptions): void;
  /** Remove the editor from the page. */
  destroy(): void;
}

/** Render the editor into an element, without writing React code. */
export function mount(element: HTMLElement, options: FoliolineOptions = {}): MountedEditor {
  const root = createRoot(element);
  let resolve!: (editor: DocxEditorRef) => void;
  const ready = new Promise<DocxEditorRef>((r) => (resolve = r));
  let current = options;
  const render = () => {
    const onReady = (editor: DocxEditorRef, ui: FoliolineUI) => {
      resolve(editor);
      current.onReady?.(editor, ui);
    };
    root.render(<FoliolineEditor {...current} onReady={onReady} />);
  };
  render();
  return {
    ready,
    update(next) {
      current = { ...current, ...next };
      render();
    },
    destroy() {
      root.unmount();
    },
  };
}
