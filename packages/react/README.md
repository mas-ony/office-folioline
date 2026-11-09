# @folioline/react

Folioline is a Word (DOCX) editor for desktop and mobile that runs in the browser: a title bar
with File, Format, Insert, Review and Help menus, a floating toolbar, Editing, Suggesting and
Viewing modes, a Changes panel with comments, suggestions and reviewer filters, a navigation pane,
headers and footers edited in place, watermarks, a table of contents, forms protection and a page
handle, in twelve interface languages. On phones it reflows the text and puts the toolbar and the
menus in bottom sheets. PDF and Markdown export run in the browser, and live sessions run through
a small relay (`@folioline/relay`).

This package is the React interface. `@folioline/vue` is the same interface written in Vue, with
the same options.

## Install

```bash
npm install @folioline/react react react-dom
```

It needs React 19.

## Use

```tsx
import { FoliolineEditor } from '@folioline/react';
import '@folioline/react/style.css';

export function Contract() {
  return (
    <div style={{ height: '80vh' }}>
      <FoliolineEditor
        document="/contracts/lease.docx"
        user={{ name: 'Jordan Lee' }}
        examples={[{ id: 'template', url: '/examples/template.docx', label: 'Template' }]}
        onReady={(editor) => editor.on('change', ({ dirty }) => console.log('unsaved changes:', dirty))}
      />
    </div>
  );
}
```

Import `style.css` once: it brings the fonts and the editor's styles. The editor fills its
container, so give the container a height. `className` and `style` go on the editor's element.

`mount()` takes the same options, for pages that are not written in React:

```js
import { mount } from '@folioline/react';
import '@folioline/react/style.css';

const editor = mount(document.querySelector('#editor'), { document: file, locale: 'de' });
const handle = await editor.ready;
editor.update({ colorScheme: 'dark' });
editor.destroy();
```

## Options

| Option | |
| --- | --- |
| `document` | A URL, Blob, ArrayBuffer or bytes, or `{ url or data, name }`; opened again when it changes |
| `examples` | Documents for File › Examples (`{ id, url, label, name }`); no Examples menu without them |
| `locale` | The interface language: `'en'`, `'pl'`, `'de'`, `'fr'`, `'ja'`, `'es'`, `'pt-BR'`, `'he'`, `'hi'`, `'id'`, `'tr'` or `'zh-CN'`; by default the stored one or the browser's |
| `user` | The name on comments and tracked changes; by default the stored name or a generated one |
| `colorScheme` | `'light'` or `'dark'` |
| `storageKey` | Keep the reader's settings (name, language, appearance, rulers, side panel and markup options) in localStorage under `<storageKey>-…` |
| `autosave`, `offerRecovery` | Keep unsaved work in the IndexedDB database of this name; offer to recover it at start (by default when no document or room is given) |
| `relay`, `shareLink`, `room` | Live sessions: the relay's URL (default `/collab`), the invite link for a room (by default this page with `?room=<id>`), a room to join at start |
| `files` | Replace some of the file actions (New, Open, the examples, Save as Word document, PDF and Markdown export, Print, Share) |
| `globalShortcuts` | Handle Ctrl+F and Ctrl+Shift+E anywhere on the page, not only inside the editor |

The types are exported as `FoliolineOptions`, `DocumentInput`, `Example`, `UserInfo` and so on.

## Events

`onReady(editor, ui)` runs once the first document (or live session) has opened, with the
editor's page handle and the interface's state and actions (`FoliolineUI`). `onUserChange`,
`onLocaleChange` and `onColorSchemeChange` run when the reader changes them in the interface.

## Page handle

The handle passed to `onReady` drives the editor from code:

```js
const buffer = await editor.save();                    // ArrayBuffer of the .docx
await editor.load(bytes, 'Contract.docx');             // ArrayBuffer, Uint8Array, Blob or 'blank'
editor.setMode('suggesting');                          // 'edit' | 'suggesting' | 'view'
editor.exec('bold');                                   // → { ok: true }
const pdf = await editor.exportPdf();                  // Uint8Array, made in the browser
```

`installPageApi(editor)` from `@folioline/core` also puts it on the page as `window.docxEditor`,
with a batch API in the style of the Office.js Word API as `window.DocxEditorAPI`.

## Page styles

The editor keeps its classes on its own element and on a layer it adds to the body for menus,
dialogs and messages (`.fl-layer`): `fl-` for the interface, `dx-` for the document. It changes
nothing on `<html>` or `<body>` (apart from a class while printing), and several editors can share
a page.

## Live sessions

Editing together needs `@folioline/relay` on the server that serves the page.

## License

MIT
