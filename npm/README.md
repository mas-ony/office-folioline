# Folioline

Folioline is a Word (DOCX) editor for desktop and mobile that runs in the browser: a title bar
with File, Format, Insert, Review and Help menus, a floating toolbar, Editing, Suggesting and
Viewing modes, a Changes panel with comments, suggestions and reviewer filters, a navigation pane,
headers and footers edited in place, watermarks, a table of contents, forms protection and a page
API, in twelve interface languages. On phones it reflows the text and puts the toolbar and the
menus in bottom sheets, and it also works over a plain HTTP address on the local network. PDF and
Markdown export run in the browser.

This package is the built app: static files to put on a web server. It has no dependencies and
nothing to build. The React and Vue packages, for putting the editor inside an app instead, are in
the [repository](https://github.com/mas-ony/office-folioline) (`packages/react` and `packages/vue`) and
are not on npm yet.

## Install

```bash
npm install folioline
```

## Host

The app is the package's `dist` folder: `index.html`, `assets/`, the example documents, the
service worker, the manifest and the icons. Its paths are relative, so it can be served from any
path. Copy the folder into a site, or serve it as it is:

```bash
cp -r node_modules/folioline/dist public/docs                 # then open /docs/
python3 -m http.server -d node_modules/folioline/dist 8080    # then open http://localhost:8080
```

Serve it over HTTP: browsers do not run its scripts from a `file://` address.

Over HTTPS (or on `localhost`) the app also works offline and can be installed, and an installed
app opens DOCX files from the system's "Open with". Over plain HTTP, such as a local network
address, the clipboard API, file pickers, the share sheet and offline use are not available, and
the app works without them.

## Files

It starts with a sample document, has six more under File › Examples, and opens DOCX files by drag
and drop, from its File menu (or Ctrl+O) or with `?src=`. It saves DOCX, exports PDF and Markdown
and prints; on phones it can also send the file through the share sheet. The saved DOCX keeps what
the editor does not change: styles, numbering, sections, headers and footers, comments with
replies, tracked changes, fields, notes, images, text boxes, watermarks and unknown XML. Files are
opened, edited and saved in the browser; unless a live session is started, no document leaves it.

## Address options

| Option | |
| --- | --- |
| `?src=<url>` | Opens a document from a URL the page can fetch (its own server, or one that allows it with CORS) |
| `?example=<id>` | Opens an example: `sample`, `agreement`, `template`, `long`, `tables`, `international` or `formatting` |
| `?new` | Starts with a blank document |
| `?room=<id>` | Joins a live session (needs the relay, below) |

## Live sessions

Editing together in real time (**Settings › Start a live session**, with an invite link and a QR
code) needs Folioline's relay on the same server, answering under `/collab` at the root of the
origin. The relay is a Vite plugin or Node middleware in the repository's `packages/relay`; it is
not part of this package and not on npm yet. Served as static files, the app has no relay: the
Settings panel says so and cannot start a session, and `?room=` links do not open. To find out,
the app requests `/collab/health` when it starts, so a static server logs a 404 for that address.

## Page API

When the editor starts, the app puts two programmatic interfaces on the page: `window.docxEditor`,
a handle to the editor, and `window.DocxEditorAPI`, a batch API in the style of the Office.js Word
API. A page that shows the app in a same-origin `<iframe>` reaches them through
`iframe.contentWindow`.

```js
const bytes = await (await fetch('examples/agreement.docx')).arrayBuffer();
await docxEditor.load(bytes, 'Agreement.docx');        // ArrayBuffer, Uint8Array, Blob or 'blank'
docxEditor.setMode('suggesting');                      // 'edit' | 'suggesting' | 'view'
docxEditor.on('change', ({ dirty }) => console.log(dirty));

await DocxEditorAPI.createBrowser().run(async (context) => {
  const hits = context.document.body.search('twelve months', { matchCase: true });
  hits.load('items');
  await context.sync();
  hits.items[0].insertText('eighteen months', 'Replace').font.bold = true;
  context.document.body.paragraphs.getFirst().insertParagraph('Draft', 'After');
  await context.sync();                                // applied all or nothing
});

docxEditor.exec('bold');                               // → { ok: true }
const state = docxEditor.snapshot();                   // mode, markup, zoom, pages, selection, counts
const docx = await docxEditor.save();                  // ArrayBuffer of the .docx
const pdf = await docxEditor.exportPdf();              // Uint8Array, made in the browser
const md = docxEditor.exportMarkdown();
```

`exec` runs a command by name and returns `{ ok }`, plus a `reason` when it refuses one (`viewing`,
`invalidValue`, `commentSelection` or `unknownCommand`): `bold`, `italic`, `underline`,
`strikethrough`, `superscript`, `subscript`, `clearFormatting`, `alignLeft`, `alignCenter`,
`alignRight`, `justify`, `bulletList`, `numberedList`, `indent`, `outdent`, `pageBreak`, `undo`,
`redo`, `insertText`, `insertTable`, `setStyle`, `setFontSize`, `setFontFamily`, `setColor`,
`setHighlight`, `insertLink`, `addComment`, `acceptAll`, `rejectAll`, `setMarkup`,
`insertTableOfContents`, `refreshTableOfContents`, `setWatermark`, `insertBookmark`,
`insertFootnote`, `insertEndnote`, `sectionBreak` and `protectForms`. The handle also has
`getDocumentHandle`, `focus`, `mode`, `setMarkup` (`'simple'`, `'all'`, `'none'` or `'original'`),
`setColorMode`, `setAuthor`, `setZoom`, `download`, `print` and `getEditor` (the editor itself).
`on` returns a function that removes the listener; the events include `load`, `change`, `selection`,
`layout`, `page`, `zoom`, `editMode`, `markup`, `comments`, `trackedChanges` and `error`.
`DocxEditorAPI.createServer(bytes)` opens a document in a hidden editor of its own, for a script to
change and `save()` without showing it.

## Storage

The app keeps unsaved work in IndexedDB (the database `folioline`) and, when it starts without
address options, offers to recover what was kept in the last 14 days. It keeps its settings (the
user's name, the language, appearance, rulers, the side panel and the markup options) in
localStorage under `folioline-` keys, and its offline copy in the cache `folioline-v1`. Copies
served from the same origin share them.

## Browsers

Tested in Chrome on desktop and on Android.

## License

MIT. The app bundles third-party packages, icons and fonts: `dist/THIRD-PARTY-LICENSES.md` lists
them with their licences (MIT; ISC for the Lucide icons; the SIL Open Font License 1.1 for the
Arimo, Caladea, Carlito, Cousine and Tinos fonts).
