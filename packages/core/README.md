# @folioline/core

The engine of Folioline, a Word (DOCX) editor for desktop and mobile that runs in the browser.
It holds everything the React and Vue interfaces share:

- DOCX import and export, keeping what the editor does not change (styles, numbering, sections,
  headers and footers, comments with replies, tracked changes, fields, notes, images, text boxes,
  watermarks and unknown XML)
- the editor (`DocxEditor`): editing commands, pagination with sections and columns, headers and
  footers, footnotes and endnotes, fields, bookmarks, the table of contents, watermarks, forms
  protection, comments and tracked changes
- PDF export with embedded font subsets, and Markdown export, in the browser
- the live session that talks to `@folioline/relay` (`CollabSession`)
- the page handle (`DocxEditorRef`, `installPageApi`) and a batch API in the style of the
  Office.js Word API (`createBrowser`, `createServer`)
- the interface strings in twelve languages (`LOCALES`, `loadMessages`)
- autosave to IndexedDB (`saveAutosave`, `loadAutosave`, `clearAutosave`)
- the interface's state and actions without a framework (`FoliolineUI`, `EditorStore`), which
  the interfaces render

To put the editor in an application, install `@folioline/react` or `@folioline/vue`. Both depend
on this package and re-export its option types. Use this package directly for the page handle,
for the batch API, or to write an interface for another framework.

## Install

```bash
npm install @folioline/core
```

## Page handle

Each editor has a page handle (`DocxEditorRef`), which the components pass to `onReady` (`@ready`
in Vue). `installPageApi(editor)` puts it on the page as `window.docxEditor`, with
`window.DocxEditorAPI` (the batch API, driving that editor by default) and
`window.docxEditorReady`, and returns the function that removes them again.

```js
import { installPageApi } from '@folioline/core';

// onReady={(editor) => installPageApi(editor)}, then from anywhere on the page:
const buffer = await docxEditor.save();                // ArrayBuffer of the .docx
await docxEditor.load(bytes, 'Contract.docx');         // ArrayBuffer, Uint8Array, Blob or 'blank'
docxEditor.setMode('suggesting');                      // 'edit' | 'suggesting' | 'view'
docxEditor.exec('insertTable', { rows: 3, cols: 2 });  // → { ok: true }
docxEditor.on('change', ({ dirty }) => console.log(dirty));
const state = docxEditor.snapshot();                   // mode, markup, zoom, pages, selection, counts
const pdf = await docxEditor.exportPdf();              // Uint8Array, made in the browser
const md = docxEditor.exportMarkdown();
```

`getEditor()` returns the editor itself (`DocxEditor`).

## Batch API

`createBrowser(docxEditor)` drives an editor that is open on the page; `createServer(bytes)` opens
a document in a hidden editor of its own, for a script to change and save without showing it (it
still needs a DOM: a page, or jsdom). Each `context.sync()` applies the changes queued since the
last one, all or nothing, and `run` ends with one.

```js
import { createServer } from '@folioline/core';

const runtime = await createServer(bytes, { author: 'Robot' });
await runtime.run(async (context) => {
  const hits = context.document.body.search('within 7 days', { matchCase: true });
  hits.load('items');
  await context.sync();
  hits.items[0].insertText('within 30 days', 'Replace').font.bold = true;
  context.document.body.paragraphs.getFirst().insertParagraph('Draft', 'After');
});
const docx = runtime.save();                           // Uint8Array of the .docx
runtime.dispose();
```

## Entry points

| Import | |
| --- | --- |
| `@folioline/core` | The editor, the page handle and batch API, document sources, the live session, the interface strings, autosave and the interface state |
| `@folioline/core/views` | What the React and Vue interfaces are built from (editing commands and view helpers). It follows those packages and is not a stable API of its own |
| `@folioline/core/style.css` | The fonts, the ProseMirror base styles, the document styles and the interface |

The `style.css` of `@folioline/react` and `@folioline/vue` imports this package's. The
stylesheet imports the fonts from the `@fontsource` packages, and the PDF export reads the font
files those rules point at, so the application's bundler has to handle CSS `@import` and font
files (Vite does by default).

## License

MIT. The fonts (Carlito, Caladea, Tinos, Arimo and Cousine, from their `@fontsource` packages)
are under the SIL Open Font License 1.1.
