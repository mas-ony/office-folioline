/**
 * What the official interfaces (@folioline/react and @folioline/vue) are built from: the public
 * API plus editing commands and view helpers. It follows those packages and is not a stable API
 * of its own.
 */
export * from './index';
export type { DocxDocument } from './core/document';
export { fontStack } from './core/model/css';
export { displayStyleName } from './core/model/styles';
export { bookmarkNameProblem, type BookmarkNameProblem } from './editor/bookmarks';
export * from './editor/commands';
export type { CursorProps } from './editor/cursorProps';
export type { AnchoredComment } from './editor/DocxEditor';
export * from './editor/images';
export type { ViewMode } from './editor/layout/layout';
export { DEFAULT_MARKUP, DELETION_STYLES, CHANGED_LINES, INSERTION_STYLES, MARKUP_COLORS, normalizeMarkup } from './editor/markup';
export type { ChangedLines, DeletionStyle, InsertionStyle, MarkupColor } from './editor/markup';
export { setDirection, toggleParagraphSpace, type ParagraphSettings, type TabAlign, type TabLeader } from './editor/paragraph';
export type { TrackedChange } from './editor/plugins/trackChanges';
export { canRunTableAction, setCellBackground, TABLE_ACTIONS, type TableAction } from './editor/tableActions';
export * from './editor/tableFormat';
export { inToc } from './editor/toc';
export { DEFAULT_TEXT_WATERMARK, renderWatermark, type TextWatermark, type Watermark, WATERMARK_PRESETS, WATERMARK_SCALES, WATERMARK_SIZES } from './editor/watermark';
export { type Commands, createCommands } from './ui/commands';
export * from './ui/content';
export * from './ui/dialogs';
export * from './ui/dom';
export * from './ui/menus';
export * from './ui/palette';
export * from './ui/reviewModel';
export * from './ui/toolbar';
