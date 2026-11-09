/**
 * @folioline/core: the DOCX editor engine, the page API and the interface state the React and
 * Vue interfaces share. Import `@folioline/core/style.css` once for the fonts and styles.
 */
export { ApiError, createBrowser, createServer, type Runtime } from './api/officeApi';
export { type DocxEditorApi, type DocxEditorRef, type EditorMode, type ExecResult, installPageApi, makeRef } from './api/page';
export { DOCX_MIME, type DocumentSource, documentOf, downloadBlob, nameOfUrl, openFailure } from './api/source';
export { type CollabOptions, CollabSession, type CollabState, type CollabStatus, colorFor, DEFAULT_RELAY, type Participant, relayAvailable, roomLink } from './collab/session';
export {
  DocxEditor,
  type DocxEditorOptions,
  type EditMode,
  type EditorEventMap,
  type EditorLabels,
  type MarkupMode,
  type RevisionMarkup,
  type Stream,
} from './editor/DocxEditor';
export { browserLocale, isLocale, isRtl, loadMessages, type Locale, LOCALES, makeTranslate, type MessageKey, type Messages, type Translate } from './i18n';
export { type AutosaveRecord, clearAutosave, loadAutosave, saveAutosave } from './ui/autosave';
export { FoliolineUI, initialLocale, rootClassOf } from './ui/controller';
export { type EditorSnapshot, EditorStore } from './ui/store';
export * from './ui/types';
