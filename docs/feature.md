# Folioline features

What Folioline does, area by area. [The README](../README.md) covers running it, the components
and the tests.

## Platforms and files

| Feature | Details |
| --- | --- |
| Browsers | Tested in Chrome on desktop and on Android |
| Phones | Text reflowed to the screen at a readable size (page layout on demand), a toolbar row that scrolls and starts with formatting, More and every menu as bottom sheets, a menu with the editing modes, File, Format, Insert, Review and Help, the review panel as a sheet |
| Plain-HTTP LAN address | No secure-context API is required; clipboard, file pickers, sharing and offline caching are used only where available |
| Open a `.docx` | The Open button, File › Open (Ctrl+O), drag and drop, `?src=<url>` and the system's "Open with" for the installed app; a file that does not open gets an explanation with an error code |
| New document | The New button, or `?new=1` |
| Sample document | Opens at start: 10 pages, one per kind of element, with comments and changes by three reviewers |
| Example documents | File › Examples: services agreement (review), consulting template (fields), annual report (300 pages), tables and columns, international and right-to-left, formatting sampler; `?example=<id>` opens one |
| Document name | Editable, with `.docx` and a status; a dot marks unsaved changes |
| Save as Word | Comments with replies and resolved state, tracked changes with authors and dates, watermarks, text boxes, bookmarks, fields and notes are written; what the editor does not change is kept |
| Export PDF | Written in the browser, offline, with no upload: embedded font subsets with selectable text and links; words in right-to-left, complex and CJK scripts are drawn as images |
| Export Markdown | Written in the browser: headings, emphasis, lists, pipe tables (nested tables as HTML), links, footnotes and endnotes as `[^n]`, tracked deletions struck through, picture descriptions; only what Markdown would misread is escaped |
| Print | File › Print (Ctrl+P): the page layout through the browser's print dialog |
| Autosave and recovery | A copy in IndexedDB, offered back with a restore banner |
| Installable app, offline | PWA with a `.docx` file handler (offline caching needs HTTPS or localhost) |
| Interface languages | Twelve: English, Polish, German, French, Japanese, Spanish, Portuguese (Brazil), Hebrew (right to left), Hindi, Indonesian, Turkish, Chinese (Simplified) |
| Light and dark appearance | Pages shown inverted in dark, pictures keep their colours |

## Title bar and menus

| Feature | Details |
| --- | --- |
| Title bar | Logo, document name, menu bar, editing-mode pill, Open, New, Export and the panel toggle |
| Editing, Suggesting, Viewing | Each with its description; Ctrl+Shift+E switches Suggesting on and off |
| File | Open, Save, Examples, Export (Markdown, PDF), Print, Page setup |
| Format | Bold, Italic, Underline, Strikethrough, alignment, text direction, line spacing options, Format painter, Clear formatting |
| Insert | Image, Text Box, Table grid, Footnote, Endnote, Break (page, section next page, section continuous), Table of contents, Bookmark, Go To Bookmark, Watermark |
| Review | Display for Review, Track changes options, Previous and Next Change, Accept and Reject all shown, Show paragraph breaks, Show bookmarks, Protect Document for Forms, Markup Options › Reviewers |
| Help | Report issue (collects diagnostics without the document text and can attach the file), Keyboard shortcuts, About |
| People in a live session | Avatars of everyone connected |

## Toolbar

| Feature | Details |
| --- | --- |
| Text formatting | Undo, Redo, Bold, Italic, Underline, Strikethrough, alignment |
| Paragraph style | Normal, Title, Heading 1–6 and quick styles, each previewed in its style |
| Font family | Search, Sans Serif, Serif and Monospace groups, and the fonts used in the document |
| Font size | Stepper and list; Ctrl+] and Ctrl+[ also step |
| Font Color | Automatic, theme colours with tints and shades, standard colours, custom; the split button applies the last colour |
| Text Highlight Color | No Color and 15 colours |
| Links | Internal links to bookmarks with `#name`; a link card shows, copies, edits, removes and opens the link at the caret |
| Comment, Markup, Show comments | Add a comment, choose the markup, show or hide the comment cards |
| More | The groups that do not fit: Script, List formatting, Format, and the contextual Table and Image groups |
| Table tools | Borders, border colour, style and width, cell fill, merge, split; more options: insert rows and columns, vertical alignment, header row, no wrap, distribute columns, auto-fit, table alignment, select and delete |
| Picture tools | Image properties, wrap text, alt text, rotate and flip |
| Rulers | Settings › Show rulers: margins and indents can be dragged |

## Review: comments and changes

| Feature | Details |
| --- | --- |
| Comment on a selection | From the toolbar, the right-click menu, a button beside the selection or Ctrl+Alt+M |
| Replies, resolve, reopen, delete | Resolved comments can be shown in the panel |
| Suggesting | Insertions, deletions and formatting, coloured per author |
| Change cards | Accept and reject per change; a deletion followed by an insertion is one "Replaced" card |
| Reviewers | Reviewer chips and Markup Options › Reviewers; hidden reviewers' markup shows as final text |
| Display for Review | Simple Markup (with change bars), All Markup, No Markup, Original |
| Track changes options | Insertion, deletion, changed-line, move and table-cell styles and colours, applied and remembered |
| Going through changes | Previous and Next Change, Accept and Reject all shown |
| Comment cards beside the pages | Cards stay next to their text and move aside for the active one |
| Protect Document for Forms | Only fields can be filled in; saved as Word's forms protection |

## Navigation, find and dialogs

| Feature | Details |
| --- | --- |
| Navigation pane | Headings, Find (which also replaces one or all matches) and Bookmarks |
| Find options | Match case, whole words, result list |
| Page Setup | Size, orientation, margins, whole document or this section |
| Paragraph | Alignment, direction, indents, special indent, spacing, line spacing, contextual spacing, pagination, tab stops |
| Watermark | Text (presets, font, size, bold, italic, transparency, colour, layout) or picture (scale, washout) |
| Bookmark | Name rules, sort by name or location, hidden bookmarks, Add, Delete, Go To |
| Other dialogs | Image properties, alt text, split cell, link, footnote and endnote text, text box |
| Units | Lengths in the dialogs, on the rulers and in the header Options menu are in centimetres, or in inches where the browser's language is US English (or English with no region); spacing and picture sizes are in points |
| Right-click menu | Cut, copy, paste, paste without formatting, copy and paste formatting, delete, select all, link, comment, table actions; where the browser blocks menu paste, the menu says which shortcut to use |
| Zoom and page indicator | A zoom pill with Automatic, Fit width and 25–200%, and a page indicator; Ctrl+wheel and a trackpad pinch also zoom the pages |

## Pages and document content

| Feature | Details |
| --- | --- |
| Pagination, sections, columns | Pages with their sizes, margins, sections and columns |
| Headers and footers | Edited in place, with an Options menu: page number, total pages, section pages, "Page X of Y", different first page, different odd and even pages, link to previous, distances (in inches, or centimetres where the ruler is metric), remove |
| Footnotes and endnotes | Inserted from the Insert menu and edited in a dialog |
| Tables | Merged cells, nested tables, borders, shading |
| Pictures | In line and floating with text wrapping (in line, square, tight, through, top and bottom, behind, in front); resize |
| Text boxes | Shown with their fill and border; the text is edited in a dialog |
| Shapes and groups | Shapes, groups of shapes, pictures and text boxes, and drawing canvases are drawn with their outlines, theme colours, gradients, dashes and arrowheads, on the page and in PDF files; they are kept unchanged and not edited |
| Table of contents | Inserted from the Insert menu and updated with its entries and page numbers |
| Fields | PAGE and NUMPAGES in the text |
| Right-to-left and CJK | Right-to-left paragraphs and CJK text |
| Paragraph marks and bookmarks | Show paragraph breaks, Show bookmarks |
| Text shaping | The browser shapes the text; metric-compatible open fonts stand in for Office fonts |

## Live sessions

| Feature | Details |
| --- | --- |
| Live session with an invite link | Through the relay that the dev and preview servers serve (`@folioline/relay`): invite link and QR code, everyone's cursors and shared comments |
| Your name | Used for comments and changes |

## Programming interface

The editor is embedded with the `FoliolineEditor` component of `@folioline/react` or
`@folioline/vue`, or with their `mount()`. The apps install `window.docxEditor` (a ref-style
handle, `packages/core/src/api/page.ts`) and `window.DocxEditorAPI` (an Office.js-shaped batch
runtime, `packages/core/src/api/officeApi.ts`).

| Feature | Details |
| --- | --- |
| Components | `FoliolineEditor` for React and for Vue, each written for its framework, with the same props and events (Vue: `v-model:user` and the like), and `mount(element, options)` for other pages; `onReady` gives the handle below; styles kept to the editor's element and its layer, several editors on a page |
| Handle | `save()` → `ArrayBuffer`, `load`, `focus`, `getEditor()` (the editor itself, `DocxEditor`) |
| Mode, author, zoom, appearance | `setMode('edit' \| 'suggesting' \| 'view')`, `setAuthor`, `setZoom(n \| 'auto' \| 'fit-width')`, `setColorMode`, `setMarkup` |
| State and events | `snapshot()` gives mode, markup, zoom, pages, selection, cursor formatting, counts; `on('change' \| 'load' \| 'comments' \| …)` |
| Commands | `exec(name, options)` with formatting, lists, alignment, styles, fonts, colours, links, tables, comments, accept and reject all, table of contents, watermark, bookmarks, notes, section breaks and forms protection; returns `{ ok, reason }` |
| Exports | `save()`, `exportPdf()` and `exportMarkdown()`, all in the browser |
| Batch API | `DocxEditorAPI.createBrowser().run(…)` and `createServer(bytes)`: body search, ranges (insert, replace, delete, comment, hyperlink, font), paragraphs (style, alignment, insert), change tracking mode; a batch is applied all or nothing, and edits refused by forms protection fail with `NotAllowed` |

## Limitations

- Live sessions need the relay (in the dev and preview servers, or `@folioline/relay` on another
  server); rooms live in memory, anyone who can reach the server with the link can join, and
  headers, footers and footnotes cannot be edited while a document is shared.
- Fonts that are not installed are replaced with metric-compatible open fonts, and the browser
  shapes the text, so line breaks can differ slightly from Word.
- In multi-column sections a paragraph moves to the next column as a whole; a footnote taller
  than the space left on its page is not continued on the next page; very long documents are laid
  out in full, without page virtualisation.
- Text boxes are edited in a dialog; equations, charts and SmartArt are kept unchanged and shown
  as placeholders.
- Shapes, groups and drawing canvases are drawn but cannot be edited or moved. Like floating
  pictures, they are placed from their paragraph and column, so positions measured from the page or
  its margins come out shifted; shadows, glows and 3-D effects are not drawn.
- Track changes options apply to the display; the editor records insertions, deletions and
  formatting, not moves.
- In PDF files, words in right-to-left, complex and CJK scripts are pictures, not selectable text.
- The batch API covers the parts listed above, not the whole Office.js Word object model.
- The components have no props to hide the toolbar, side panel, rulers or zoom.
