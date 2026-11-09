/**
 * The menus of the interface as data, shared by the React and Vue interfaces: the menu bar, the
 * editing modes, Export, the phone menu, the document's context menu, the header and footer
 * options and the toolbar's drop-down menus. Icons are named after the Lucide icon set.
 */
import { selectAll } from 'prosemirror-commands';
import { TextSelection } from 'prosemirror-state';
import { isInTable } from 'prosemirror-tables';
import { contentWidthPx, setLineSpacing } from '../editor/commands';
import type { DocxEditor, EditMode, MarkupMode } from '../editor/DocxEditor';
import { selectedImage, setImageProps, transformImage, WRAP_KINDS, type WrapKind, wrapKind } from '../editor/images';
import { canRunTableAction } from '../editor/tableActions';
import { autoFitColumns, cellVAlign, distributeColumns, hasHeaderRow, selectTable, setCellVAlign, setTableAlign, tableAlign, toggleHeaderRow, toggleNoWrap } from '../editor/tableFormat';
import { inToc } from '../editor/toc';
import type { MessageKey, Translate } from '../i18n';
import type { FoliolineUI } from './controller';
import { shortcut } from './dom';
import type { EditorSnapshot } from './store';
import { LINE_SPACINGS, ZOOM_LEVELS } from './types';

/** Icons of the menus by their Lucide names; `file…` are the file type badges of Export. */
export type MenuIcon =
  | 'ArrowDown'
  | 'ArrowUp'
  | 'BetweenHorizontalEnd'
  | 'BetweenHorizontalStart'
  | 'BetweenVerticalEnd'
  | 'BetweenVerticalStart'
  | 'Bold'
  | 'Bookmark'
  | 'BookmarkCheck'
  | 'Bug'
  | 'Check'
  | 'ClipboardPaste'
  | 'ClipboardType'
  | 'Copy'
  | 'Download'
  | 'Eye'
  | 'FileCog'
  | 'FilePlusCorner'
  | 'FileText'
  | 'FlipHorizontal2'
  | 'FlipVertical2'
  | 'FolderOpen'
  | 'Image'
  | 'Info'
  | 'Italic'
  | 'Keyboard'
  | 'Link2'
  | 'ListChecks'
  | 'ListTree'
  | 'Lock'
  | 'MessageSquarePlus'
  | 'MessageSquareText'
  | 'Navigation'
  | 'Paintbrush'
  | 'PencilLine'
  | 'Pilcrow'
  | 'PilcrowLeft'
  | 'PilcrowRight'
  | 'Printer'
  | 'RectangleEllipsis'
  | 'RemoveFormatting'
  | 'RotateCcw'
  | 'RotateCw'
  | 'Save'
  | 'Scissors'
  | 'SeparatorHorizontal'
  | 'Smartphone'
  | 'SquareMousePointer'
  | 'Stamp'
  | 'Strikethrough'
  | 'Superscript'
  | 'Table'
  | 'TableCellsMerge'
  | 'TableCellsSplit'
  | 'TextAlignCenter'
  | 'TextAlignEnd'
  | 'TextAlignJustify'
  | 'TextAlignStart'
  | 'Trash2'
  | 'Underline'
  | 'UnfoldVertical'
  | 'X'
  | 'fileWord'
  | 'filePdf'
  | 'fileMd';

/**
 * A field of the header and footer distances in their options menu. What is typed in it applies on
 * Enter or on leaving the field (also by a press outside the menu), not when Escape closes the menu.
 */
export interface DistanceField {
  label: string;
  /** In twips. */
  value: number;
  max: number;
  /** Shown in centimetres rather than inches, as the ruler is. */
  metric: boolean;
  testId: string;
  onCommit(twips: number): void;
}

/** Controls inside a menu, drawn by the interface. */
export type MenuWidget =
  /** The rows-by-columns grid of Insert › Table; the menu closes before `onPick`. */
  | { kind: 'tableGrid'; label: string; onPick(rows: number, cols: number): void }
  | { kind: 'distances'; fields: DistanceField[] };

export type MenuEntry =
  | {
    type?: 'item';
    id: string;
    label: string;
    icon?: MenuIcon;
    /** Second line, e.g. "Edit document directly". */
    hint?: string;
    shortcut?: string;
    disabled?: boolean;
    /** Why the item is disabled (read with the label, shown as a tooltip). */
    reason?: string;
    /** Checkbox (true/false) or radio (with `radio`) state. */
    checked?: boolean;
    radio?: boolean;
    keepOpen?: boolean;
    testId?: string;
    onSelect: () => void;
  }
  | { type: 'submenu'; id: string; label: string; icon?: MenuIcon; disabled?: boolean; testId?: string; items: MenuEntry[] | MenuWidget }
  | { type: 'separator'; id: string }
  | { type: 'heading'; id: string; label: string }
  | { type: 'custom'; id: string; widget: MenuWidget };

export interface MenuBarMenu {
  id: string;
  label: string;
  entries: MenuEntry[];
}

/** The editor of an attached interface (the menus are only built while it is attached). */
export function editorOf(ui: FoliolineUI): DocxEditor {
  if (!ui.editor) throw new Error('The interface is not attached to an editor');
  return ui.editor;
}

export const MARKUP_MODES: MarkupMode[] = ['simple', 'all', 'none', 'original'];

export function markupLabels(t: Translate): Record<MarkupMode, string> {
  return { all: t('markup.all'), simple: t('markup.simple'), none: t('markup.none'), original: t('markup.original') };
}

export const MODE_ICONS: Record<EditMode, MenuIcon> = {
  editing: 'PencilLine',
  suggesting: 'MessageSquareText',
  viewing: 'Eye',
};

/** Editing / Suggesting / Viewing. */
export function modeEntries(ui: FoliolineUI, snap: EditorSnapshot): MenuEntry[] {
  const { t } = ui.state;
  const editor = editorOf(ui);
  return (['editing', 'suggesting', 'viewing'] as const).map((m) => ({
    id: m,
    label: t(`mode.${m}`),
    hint: t(`mode.${m}Hint`),
    icon: MODE_ICONS[m],
    checked: snap.editMode === m,
    radio: true,
    testId: `mode-${m}`,
    onSelect: () => {
      editor.setEditMode(m);
      editor.focus();
    },
  }));
}

/** The title bar's Export menu. */
export function exportEntries(ui: FoliolineUI): MenuEntry[] {
  const { t } = ui.state;
  const cmd = ui.commands;
  return [
    { id: 'word', label: t('export.word'), hint: t('export.wordHint'), icon: 'fileWord', testId: 'export-word', onSelect: cmd.save },
    { id: 'pdf', label: t('export.pdf'), hint: t('export.pdfHint'), icon: 'filePdf', testId: 'export-pdf', onSelect: cmd.exportPdf },
    { id: 'md', label: t('export.markdown'), hint: t('export.markdownHint'), icon: 'fileMd', testId: 'export-md', onSelect: cmd.exportMarkdown },
  ];
}

/** Entries of the menu bar (also shown in the phone menu). */
export function menuModel(ui: FoliolineUI, snap: EditorSnapshot): MenuBarMenu[] {
  const { t } = ui.state;
  const editor = editorOf(ui);
  const cmd = ui.commands;
  const { cursor, markup, display, painter, hiddenReviewers: hidden } = snap;
  const labels = markupLabels(t);
  const ro = snap.editMode === 'viewing';
  const reviewers = editor.reviewers();
  const align = cursor?.align ?? 'left';
  const plain = (key: MessageKey) => t(key).replace(/\s*\(.*\)$/, '');

  const examples: MenuEntry[] = (ui.options.examples ?? []).map((ex) => ({
    id: `ex-${ex.id}`,
    label: ex.label ?? t(`example.${ex.id}` as MessageKey),
    testId: `example-${ex.id}`,
    onSelect: () => ui.files.openExample(ex.id),
  }));

  const file: MenuEntry[] = [
    { id: 'open', label: t('menu.open'), icon: 'FolderOpen', shortcut: shortcut('Ctrl+O'), testId: 'menu-open', onSelect: cmd.open },
    ...(examples.length ? [{ type: 'submenu', id: 'examples', label: t('menu.examples'), icon: 'FileText', testId: 'menu-examples', items: examples } as MenuEntry] : []),
    { id: 'save', label: t('menu.save'), icon: 'Save', shortcut: shortcut('Ctrl+S'), testId: 'menu-save', onSelect: cmd.save },
    { type: 'separator', id: 's1' },
    {
      type: 'submenu',
      id: 'export',
      label: t('menu.export'),
      icon: 'Download',
      testId: 'menu-export',
      items: [
        { id: 'md', label: t('menu.exportMarkdown'), testId: 'menu-export-md', onSelect: cmd.exportMarkdown },
        { id: 'pdf', label: t('menu.exportPdf'), testId: 'menu-export-pdf', onSelect: cmd.exportPdf },
      ],
    },
    { id: 'print', label: t('menu.print'), icon: 'Printer', shortcut: shortcut('Ctrl+P'), testId: 'menu-print', onSelect: cmd.print },
    { id: 'pageSetup', label: t('menu.pageSetup'), icon: 'FileCog', disabled: ro, testId: 'menu-page-setup', onSelect: cmd.pageSetup },
  ];

  const format: MenuEntry[] = [
    { id: 'bold', label: plain('toolbar.bold'), icon: 'Bold', checked: !!cursor?.bold, disabled: ro, testId: 'menu-bold', onSelect: cmd.bold },
    { id: 'italic', label: plain('toolbar.italic'), icon: 'Italic', checked: !!cursor?.italic, disabled: ro, onSelect: cmd.italic },
    { id: 'underline', label: plain('toolbar.underline'), icon: 'Underline', checked: !!cursor?.underline, disabled: ro, onSelect: cmd.underline },
    { id: 'strike', label: t('toolbar.strikethrough'), icon: 'Strikethrough', checked: !!cursor?.strike, disabled: ro, onSelect: cmd.strike },
    { type: 'separator', id: 's1' },
    { id: 'left', label: t('toolbar.alignLeft'), icon: 'TextAlignStart', checked: align === 'left', radio: true, shortcut: shortcut('Ctrl+L'), disabled: ro, onSelect: cmd.alignLeft },
    { id: 'center', label: t('toolbar.center'), icon: 'TextAlignCenter', checked: align === 'center', radio: true, shortcut: shortcut('Ctrl+E'), disabled: ro, onSelect: cmd.alignCenter },
    { id: 'right', label: t('toolbar.alignRight'), icon: 'TextAlignEnd', checked: align === 'right', radio: true, shortcut: shortcut('Ctrl+R'), disabled: ro, onSelect: cmd.alignRight },
    { id: 'justify', label: t('toolbar.justify'), icon: 'TextAlignJustify', checked: align === 'both', radio: true, shortcut: shortcut('Ctrl+J'), disabled: ro, onSelect: cmd.justify },
    { type: 'separator', id: 's2' },
    { id: 'ltr', label: t('menu.ltr'), icon: 'PilcrowRight', checked: !cursor?.rtl, radio: true, disabled: ro, testId: 'menu-ltr', onSelect: () => cmd.direction(false) },
    { id: 'rtl', label: t('menu.rtl'), icon: 'PilcrowLeft', checked: !!cursor?.rtl, radio: true, disabled: ro, testId: 'menu-rtl', onSelect: () => cmd.direction(true) },
    { type: 'separator', id: 's3' },
    { id: 'paragraph', label: t('menu.lineSpacingOptions'), icon: 'UnfoldVertical', disabled: ro, testId: 'menu-paragraph', onSelect: cmd.paragraphDialog },
    { type: 'separator', id: 's4' },
    { id: 'painter', label: plain('toolbar.formatPainter'), icon: 'Paintbrush', checked: painter, disabled: ro, onSelect: cmd.formatPainter },
    { id: 'clear', label: t('toolbar.clearFormatting'), icon: 'RemoveFormatting', disabled: ro, onSelect: cmd.clearFormatting },
  ];

  const insert: MenuEntry[] = [
    { id: 'image', label: t('menu.image'), icon: 'Image', disabled: ro, testId: 'menu-image', onSelect: cmd.image },
    { id: 'textBox', label: t('menu.textBox'), icon: 'RectangleEllipsis', disabled: ro, testId: 'menu-textbox', onSelect: cmd.textBox },
    {
      type: 'submenu',
      id: 'table',
      label: t('menu.table'),
      icon: 'Table',
      disabled: ro,
      testId: 'menu-table',
      items: { kind: 'tableGrid', label: t('menu.insertTable'), onPick: (r, c) => cmd.table(r, c) },
    },
    { type: 'separator', id: 's1' },
    { id: 'footnote', label: t('menu.footnote'), icon: 'Superscript', disabled: ro, testId: 'menu-footnote', onSelect: cmd.footnote },
    { id: 'endnote', label: t('menu.endnote'), icon: 'ListTree', disabled: ro, testId: 'menu-endnote', onSelect: cmd.endnote },
    { type: 'separator', id: 's2' },
    {
      type: 'submenu',
      id: 'break',
      label: t('menu.break'),
      icon: 'SeparatorHorizontal',
      disabled: ro,
      testId: 'menu-break',
      items: [
        { id: 'page', label: t('menu.pageBreak'), shortcut: shortcut('Ctrl+Enter'), testId: 'menu-page-break', onSelect: cmd.pageBreak },
        { id: 'next', label: t('menu.sectionNextPage'), testId: 'menu-section-next', onSelect: () => cmd.sectionBreak('nextPage') },
        { id: 'cont', label: t('menu.sectionContinuous'), testId: 'menu-section-continuous', onSelect: () => cmd.sectionBreak('continuous') },
      ],
    },
    { id: 'toc', label: t('menu.toc'), icon: 'ListTree', disabled: ro, testId: 'menu-toc', onSelect: cmd.toc },
    { id: 'bookmark', label: t('menu.bookmark'), icon: 'Bookmark', shortcut: shortcut('Ctrl+Shift+F5'), disabled: ro, testId: 'menu-bookmark', onSelect: cmd.bookmark },
    { id: 'goto', label: t('menu.goToBookmark'), icon: 'BookmarkCheck', shortcut: shortcut('Ctrl+G'), testId: 'menu-goto-bookmark', onSelect: cmd.goToBookmark },
    { id: 'watermark', label: t('menu.watermark'), icon: 'Stamp', disabled: ro, testId: 'menu-watermark', onSelect: cmd.watermark },
  ];

  const review: MenuEntry[] = [
    {
      type: 'submenu',
      id: 'display',
      label: t('menu.displayForReview'),
      icon: 'Eye',
      testId: 'menu-display-review',
      items: MARKUP_MODES.map((m) => ({ id: m, label: labels[m], checked: markup === m, radio: true, testId: `markup-${m}`, onSelect: () => cmd.markup(m) })),
    },
    { type: 'separator', id: 's1' },
    { id: 'trackOptions', label: t('menu.trackOptions'), icon: 'ListChecks', testId: 'menu-track-options', onSelect: cmd.trackOptions },
    { id: 'prev', label: t('menu.prevChange'), icon: 'ArrowUp', testId: 'menu-prev-change', onSelect: cmd.prevChange },
    { id: 'next', label: t('menu.nextChange'), icon: 'ArrowDown', testId: 'menu-next-change', onSelect: cmd.nextChange },
    { type: 'separator', id: 's2' },
    { id: 'acceptAll', label: t('menu.acceptAllShown'), icon: 'Check', disabled: ro, testId: 'menu-accept-all', onSelect: () => cmd.decideShown(true) },
    { id: 'rejectAll', label: t('menu.rejectAllShown'), icon: 'X', disabled: ro, testId: 'menu-reject-all', onSelect: () => cmd.decideShown(false) },
    { type: 'separator', id: 's3' },
    { id: 'marks', label: t('menu.showParagraphBreaks'), icon: 'Pilcrow', checked: display.marks, testId: 'menu-show-marks', onSelect: cmd.toggleMarks },
    { id: 'bookmarks', label: t('menu.showBookmarks'), icon: 'Bookmark', checked: display.bookmarks, testId: 'menu-show-bookmarks', onSelect: cmd.toggleBookmarks },
    { type: 'separator', id: 's4' },
    { id: 'protect', label: t('menu.protectForms'), icon: 'Lock', checked: display.protected, disabled: ro, testId: 'menu-protect', onSelect: cmd.toggleProtect },
    {
      type: 'submenu',
      id: 'markupOptions',
      label: t('menu.markupOptions'),
      testId: 'menu-markup-options',
      items: [{
        type: 'submenu',
        id: 'reviewers',
        label: t('menu.reviewers'),
        testId: 'menu-reviewers',
        items: [
          { id: 'all', label: t('menu.allReviewers'), checked: !hidden.length, keepOpen: true, testId: 'reviewer-all', onSelect: () => cmd.setHiddenReviewers(hidden.length ? [] : reviewers) },
          { type: 'separator', id: 'rs' },
          ...reviewers.map((name) => ({
            id: `r-${name}`,
            label: name,
            checked: !hidden.includes(name),
            keepOpen: true,
            testId: `reviewer-${name}`,
            onSelect: () => cmd.setHiddenReviewers(hidden.includes(name) ? hidden.filter((h) => h !== name) : [...hidden, name]),
          })),
        ],
      }],
    },
  ];

  const help: MenuEntry[] = [
    { id: 'report', label: t('menu.reportIssue'), icon: 'Bug', testId: 'menu-report', onSelect: cmd.reportIssue },
    { id: 'shortcuts', label: t('menu.shortcuts'), icon: 'Keyboard', testId: 'menu-shortcuts', onSelect: cmd.shortcuts },
    { id: 'about', label: t('menu.about'), icon: 'Info', onSelect: cmd.about },
  ];

  return [
    { id: 'file', label: t('menu.file'), entries: file },
    { id: 'format', label: t('menu.format'), entries: format },
    { id: 'insert', label: t('menu.insert'), entries: insert },
    { id: 'review', label: t('menu.review'), entries: review },
    { id: 'help', label: t('menu.help'), entries: help },
  ];
}

/** Phones: the menu bar, editing mode and view options in one sheet. */
export function phoneMenuEntries(ui: FoliolineUI, snap: EditorSnapshot): MenuEntry[] {
  const { t } = ui.state;
  const editor = editorOf(ui);
  const cmd = ui.commands;
  return [
    { type: 'heading', id: 'h-mode', label: t('mode.label') },
    ...modeEntries(ui, snap),
    { type: 'separator', id: 's1' },
    { id: 'open', label: t('title.open'), icon: 'FolderOpen', testId: 'phone-open', onSelect: cmd.open },
    { id: 'new', label: t('title.new'), icon: 'FilePlusCorner', testId: 'phone-new', onSelect: cmd.newDocument },
    { type: 'separator', id: 's2' },
    ...menuModel(ui, snap).map((m): MenuEntry => ({ type: 'submenu', id: m.id, label: m.label, testId: `phone-menu-${m.id}`, items: m.entries })),
    { type: 'separator', id: 's3' },
    { type: 'heading', id: 'h-view', label: t('menu.view') },
    { id: 'reflow', label: t('menu.reflowView'), icon: 'Smartphone', checked: snap.viewMode === 'web', radio: true, testId: 'view-reflow', onSelect: () => editor.setViewMode('web') },
    { id: 'pages', label: t('menu.pageView'), icon: 'FileText', checked: snap.viewMode === 'print', radio: true, testId: 'view-pages', onSelect: () => { editor.setViewMode('print'); requestAnimationFrame(() => editor.fitWidth()); } },
    { id: 'nav', label: t('menu.navigation'), icon: 'Navigation', testId: 'phone-navigation', onSelect: () => cmd.navigation() },
  ];
}

/**
 * Where the document's context menu opens for a `contextmenu` event, or null when the event is
 * not for it (outside the pages, or a touch on phones, which keep the browser's selection menu).
 * A click outside the selection moves the caret there first.
 */
export function contextMenuAt(ui: FoliolineUI, e: MouseEvent): { x: number; y: number } | null {
  const editor = ui.editor;
  const target = e.target as HTMLElement;
  if (!editor || !editor.root.contains(target) || !target.closest('.dx-doc')) return null;
  if (ui.state.mobile && (e as PointerEvent).pointerType !== 'mouse') return null;
  e.preventDefault();
  const view = editor.activeView;
  const hit = view.posAtCoords({ left: e.clientX, top: e.clientY });
  const { from, to } = view.state.selection;
  if (hit && (hit.pos < from || hit.pos > to)) {
    view.dispatch(view.state.tr.setSelection(TextSelection.near(view.state.doc.resolve(hit.pos))));
  }
  return { x: e.clientX, y: e.clientY };
}

/** The document's right-click menu, for the selection at the time it opens. */
export function contextMenuEntries(ui: FoliolineUI): MenuEntry[] {
  const { t } = ui.state;
  const editor = editorOf(ui);
  const cmd = ui.commands;
  const { toast, openModal } = ui;
  const view = editor.activeView;
  const state = view.state;
  const empty = state.selection.empty;
  const ro = editor.readOnly;
  const inTable = isInTable(state);
  const nothing = t('context.nothingSelected');
  const execOrHint = (command: 'cut' | 'copy') => {
    view.focus();
    let ok = false;
    try {
      ok = document.execCommand(command);
    } catch {
      ok = false;
    }
    if (!ok) toast(t('context.copyBlocked', { shortcut: shortcut(command === 'cut' ? 'Ctrl+X' : 'Ctrl+C') }));
  };
  const paste = async (plain: boolean) => {
    view.focus();
    try {
      if (plain) {
        if (!navigator.clipboard?.readText) throw new Error('clipboard');
        view.pasteText(await navigator.clipboard.readText());
        return;
      }
      if (!navigator.clipboard?.read) throw new Error('clipboard');
      const items = await navigator.clipboard.read();
      const html = items.find((i) => i.types.includes('text/html'));
      if (html) view.pasteHTML(await (await html.getType('text/html')).text());
      else view.pasteText(await navigator.clipboard.readText());
    } catch {
      toast(t('context.pasteBlocked', { shortcut: shortcut(plain ? 'Ctrl+Shift+V' : 'Ctrl+V') }));
    }
  };
  const table = (a: Parameters<typeof editor.tableAction>[0]) => () => {
    editor.tableAction(a);
    editor.focus();
  };
  const canMerge = inTable && canRunTableAction(state, 'mergeCells');
  const valign = inTable ? cellVAlign(state) : null;
  const entries: MenuEntry[] = [
    { id: 'cut', label: t('context.cut'), icon: 'Scissors', shortcut: shortcut('Ctrl+X'), disabled: empty || ro, reason: nothing, testId: 'ctx-cut', onSelect: () => execOrHint('cut') },
    { id: 'copy', label: t('context.copy'), icon: 'Copy', shortcut: shortcut('Ctrl+C'), disabled: empty, reason: nothing, testId: 'ctx-copy', onSelect: () => execOrHint('copy') },
    { id: 'paste', label: t('context.paste'), icon: 'ClipboardPaste', shortcut: shortcut('Ctrl+V'), disabled: ro, testId: 'ctx-paste', onSelect: () => void paste(false) },
    { id: 'pastePlain', label: t('context.pasteWithoutFormatting'), icon: 'ClipboardType', shortcut: shortcut('Ctrl+Shift+V'), disabled: ro, testId: 'ctx-paste-plain', onSelect: () => void paste(true) },
    { id: 'copyFormat', label: t('context.copyFormatting'), icon: 'Paintbrush', shortcut: shortcut('Ctrl+Alt+C'), testId: 'ctx-copy-format', onSelect: () => editor.copyFormatting() },
    { id: 'pasteFormat', label: t('context.pasteFormatting'), icon: 'Paintbrush', shortcut: shortcut('Ctrl+Alt+V'), disabled: ro || !editor.hasCopiedFormatting || empty, reason: !editor.hasCopiedFormatting ? t('context.copyFormattingFirst') : nothing, testId: 'ctx-paste-format', onSelect: () => editor.pasteFormatting() },
    { type: 'separator', id: 's1' },
    { id: 'delete', label: t('context.delete'), icon: 'Trash2', shortcut: 'Del', disabled: empty || ro, reason: nothing, testId: 'ctx-delete', onSelect: () => { view.dispatch(view.state.tr.deleteSelection().scrollIntoView()); view.focus(); } },
    { id: 'selectAll', label: t('context.selectAll'), icon: 'SquareMousePointer', shortcut: shortcut('Ctrl+A'), testId: 'ctx-select-all', onSelect: () => { selectAll(view.state, view.dispatch); view.focus(); } },
    { type: 'separator', id: 's2' },
    { id: 'link', label: editor.cursorProps().link ? t('context.editLink') : t('context.insertLink'), icon: 'Link2', shortcut: shortcut('Ctrl+K'), disabled: ro, testId: 'ctx-link', onSelect: () => openModal('link') },
    { id: 'comment', label: t('context.addComment'), icon: 'MessageSquarePlus', disabled: ro || empty, reason: t('review.selectFirst'), testId: 'ctx-comment', onSelect: cmd.comment },
  ];
  if (!ro && inToc(editor.view.state.doc, editor.view.state.selection.from)) {
    entries.push({ type: 'separator', id: 's-toc' }, { id: 'toc', label: t('toc.refresh'), icon: 'ListTree', testId: 'ctx-toc-refresh', onSelect: cmd.refreshToc });
  }
  if (inTable && !ro) {
    entries.push(
      { type: 'separator', id: 's3' },
      { id: 'rowAbove', label: t('table.insertRowAbove'), icon: 'BetweenHorizontalStart', testId: 'ctx-row-above', onSelect: table('addRowBefore') },
      { id: 'rowBelow', label: t('table.insertRowBelow'), icon: 'BetweenHorizontalEnd', testId: 'ctx-row-below', onSelect: table('addRowAfter') },
      { type: 'separator', id: 's4' },
      { id: 'colLeft', label: t('table.insertColumnLeft'), icon: 'BetweenVerticalStart', testId: 'ctx-col-left', onSelect: table('addColumnBefore') },
      { id: 'colRight', label: t('table.insertColumnRight'), icon: 'BetweenVerticalEnd', testId: 'ctx-col-right', onSelect: table('addColumnAfter') },
      { type: 'separator', id: 's5' },
      { id: 'merge', label: t('table.mergeCells'), icon: 'TableCellsMerge', disabled: !canMerge, reason: t('table.mergeNeedsSelection'), testId: 'ctx-merge', onSelect: table('mergeCells') },
      { id: 'split', label: t('table.splitCell'), icon: 'TableCellsSplit', testId: 'ctx-split', onSelect: () => openModal('splitCell') },
      { type: 'separator', id: 's6' },
      { id: 'delRow', label: t('table.deleteRow'), testId: 'ctx-delete-row', onSelect: table('deleteRow') },
      { id: 'delCol', label: t('table.deleteColumn'), testId: 'ctx-delete-col', onSelect: table('deleteColumn') },
      { id: 'delTable', label: t('table.deleteTable'), testId: 'ctx-delete-table', onSelect: table('deleteTable') },
      { type: 'separator', id: 's7' },
      { type: 'heading', id: 'h-valign', label: t('context.verticalAlignment') },
      ...(['top', 'center', 'bottom'] as const).map((v): MenuEntry => ({ id: `va-${v}`, label: t(v === 'top' ? 'table.top' : v === 'center' ? 'table.middle' : 'table.bottom'), checked: valign === v, radio: true, testId: `ctx-valign-${v}`, onSelect: () => setCellVAlign(editor.activeView, v) })),
    );
  }
  return entries;
}

/** Options of the header or footer being edited (opened from its bar). */
export function headerFooterEntries(ui: FoliolineUI, pageIndex: number): MenuEntry[] {
  const { t } = ui.state;
  const editor = editorOf(ui);
  const active = editor.activeHeaderFooter;
  const kind = active?.kind ?? 'header';
  const opts = editor.headerFooterOptions(pageIndex);
  const linked = editor.headerFooterLinked(kind, pageIndex);
  const set = (o: Parameters<typeof editor.setHeaderFooterOptions>[1]) => editor.setHeaderFooterOptions(pageIndex, o);
  // A distance that reaches its field after the menu closed (Escape puts the cursor back in the
  // text, which leaves the field) is dropped.
  const setDistance = (o: { headerDistance: number } | { footerDistance: number }) => {
    if (ui.state.hfMenu) set(o);
  };
  const metric = rulerUsesMetric();
  const field = (k: 'PAGE' | 'NUMPAGES' | 'SECTIONPAGES' | 'PAGEXOFY') => () => editor.insertPageField(k, t('hf.pageXofYText', { page: '{page}', total: '{total}' }));
  return [
    { id: 'page', label: t('hf.pageNumber'), testId: 'hf-page-number', disabled: !active, onSelect: field('PAGE') },
    { id: 'total', label: t('hf.totalPages'), testId: 'hf-total-pages', disabled: !active, onSelect: field('NUMPAGES') },
    { id: 'section', label: t('hf.sectionPages'), disabled: !active, onSelect: field('SECTIONPAGES') },
    { id: 'xofy', label: t('hf.pageXofY'), testId: 'hf-page-x-of-y', disabled: !active, onSelect: field('PAGEXOFY') },
    { type: 'separator', id: 's1' },
    { id: 'first', label: t('hf.differentFirst'), checked: opts.differentFirstPage, testId: 'hf-different-first', onSelect: () => set({ differentFirstPage: !opts.differentFirstPage }) },
    { id: 'oddEven', label: t('hf.differentOddEven'), hint: t('hf.differentOddEvenHint'), checked: opts.differentOddEven, testId: 'hf-odd-even', onSelect: () => set({ differentOddEven: !opts.differentOddEven }) },
    ...(linked !== null ? [
      { type: 'separator', id: 's2' } as MenuEntry,
      { id: 'link', label: linked ? t('hf.unlinkPrevious') : t('hf.linkPrevious'), hint: linked ? t('hf.sameAsPrevious') : undefined, testId: 'hf-link', onSelect: () => editor.setHeaderFooterLinked(kind, pageIndex, !linked) } as MenuEntry,
    ] : []),
    { type: 'separator', id: 's3' },
    {
      type: 'custom',
      id: 'distances',
      widget: {
        kind: 'distances',
        fields: [
          { label: t('hf.headerDistance'), value: opts.headerDistance, max: opts.maxDistance, metric, testId: 'hf-header-distance', onCommit: (v) => setDistance({ headerDistance: v }) },
          { label: t('hf.footerDistance'), value: opts.footerDistance, max: opts.maxDistance, metric, testId: 'hf-footer-distance', onCommit: (v) => setDistance({ footerDistance: v }) },
        ],
      },
    },
    { type: 'separator', id: 's4' },
    { id: 'remove', label: kind === 'header' ? t('hf.removeHeader') : t('hf.removeFooter'), testId: 'hf-remove', onSelect: () => editor.removeHeaderFooter(kind, pageIndex) },
    { type: 'separator', id: 's5' },
    { id: 'close', label: t('common.close'), testId: 'hf-close', onSelect: () => editor.exitHeaderFooter() },
  ];
}

/** The Options button on the bar of the header or footer being edited. */
export function headerFooterOptionsButton(ui: FoliolineUI): HTMLElement | null {
  return ui.editor?.root.querySelector<HTMLElement>('.dx-hf-active > .dx-hf-bar > .dx-hf-options') ?? null;
}

const TW_PER_IN = 1440;
const TW_PER_CM = TW_PER_IN / 2.54;

/**
 * Whether lengths are shown in centimetres (the ruler and the header and footer distances): in
 * every language but English where US customary units are used (the United States, Liberia,
 * Myanmar) or English with no region.
 */
export function rulerUsesMetric(): boolean {
  const lang = typeof navigator !== 'undefined' ? navigator.language : 'en-US';
  return !/^en-(US|LR|MM)$/i.test(lang) && !/^en$/i.test(lang);
}

/** A distance in twips as its field shows it, in inches or centimetres. */
export function distanceText(twips: number, metric: boolean): string {
  return (twips / (metric ? TW_PER_CM : TW_PER_IN)).toFixed(2);
}

/** The twips of a distance field's text (within `max`), or null when it is empty or not a distance. */
export function parseDistance(text: string, max: number, metric: boolean): number | null {
  const s = text.trim().replace(',', '.');
  const n = Number(s);
  return s !== '' && Number.isFinite(n) && n >= 0 ? Math.min(max, Math.round(n * (metric ? TW_PER_CM : TW_PER_IN))) : null;
}

/** Automatic, Fit width and the fixed zoom levels. */
export function zoomEntries(ui: FoliolineUI, snap: EditorSnapshot): MenuEntry[] {
  const { t } = ui.state;
  const editor = editorOf(ui);
  const pct = Math.round(snap.zoom * 100);
  const mode = editor.zoomMode;
  return [
    { id: 'auto', label: t('zoom.automatic'), checked: mode === 'auto', radio: true, testId: 'zoom-auto', onSelect: () => editor.fitAuto() },
    { id: 'width', label: t('zoom.fitWidth'), checked: mode === 'width', radio: true, testId: 'zoom-fit', onSelect: () => editor.fitWidth() },
    { type: 'separator', id: 's' },
    ...ZOOM_LEVELS.map((z) => ({ id: `z${z}`, label: `${z}%`, checked: !mode && pct === z, radio: true, testId: `zoom-${z}`, onSelect: () => editor.setZoom(z / 100) })),
  ];
}

/** The toolbar's line spacing menu. */
export function lineSpacingEntries(ui: FoliolineUI, snap: EditorSnapshot): MenuEntry[] {
  const { t } = ui.state;
  const editor = editorOf(ui);
  const cmd = ui.commands;
  const cur = snap.cursor?.lineSpacing ?? null;
  const settings = editor.paragraphSettings().settings;
  return [
    ...LINE_SPACINGS.map((v) => ({
      id: `ls-${v}`,
      label: v === 1 ? `${t('lineSpacing.single')}` : v === 2 ? `${t('lineSpacing.double')}` : v.toFixed(2),
      checked: cur !== null && Math.abs(cur - v) < 0.01,
      radio: true,
      testId: `line-${v}`,
      onSelect: () => { setLineSpacing(editor.activeView, v); editor.focus(); },
    })),
    { type: 'separator', id: 's1' },
    { id: 'before', label: settings.before > 0 ? t('lineSpacing.removeBefore') : t('lineSpacing.addBefore'), testId: 'space-before', onSelect: () => cmd.paragraphSpace('before') },
    { id: 'after', label: settings.after > 0 ? t('lineSpacing.removeAfter') : t('lineSpacing.addAfter'), testId: 'space-after', onSelect: () => cmd.paragraphSpace('after') },
    { type: 'separator', id: 's2' },
    { id: 'options', label: t('menu.lineSpacingOptions'), testId: 'line-options', onSelect: cmd.paragraphDialog },
  ];
}

/** The table toolbar's More options menu. */
export function tableMoreEntries(ui: FoliolineUI): MenuEntry[] {
  const { t } = ui.state;
  const editor = editorOf(ui);
  const state = editor.activeView.state;
  const valign = cellVAlign(state) ?? 'top';
  const header = hasHeaderRow(state);
  const talign = tableAlign(state) ?? 'left';
  return [
    { id: 'rowAbove', label: t('table.insertRowAbove'), onSelect: () => editor.tableAction('addRowBefore') },
    { id: 'rowBelow', label: t('table.insertRowBelow'), onSelect: () => editor.tableAction('addRowAfter') },
    { id: 'colLeft', label: t('table.insertColumnLeft'), onSelect: () => editor.tableAction('addColumnBefore') },
    { id: 'colRight', label: t('table.insertColumnRight'), onSelect: () => editor.tableAction('addColumnAfter') },
    { type: 'separator', id: 's1' },
    { type: 'heading', id: 'h-valign', label: t('context.verticalAlignment') },
    ...(['top', 'center', 'bottom'] as const).map((v) => ({ id: `va-${v}`, label: t(v === 'center' ? 'table.middle' : v === 'top' ? 'table.top' : 'table.bottom'), checked: valign === v, radio: true, onSelect: () => setCellVAlign(editor.activeView, v) })),
    { type: 'separator', id: 's2' },
    { id: 'header', label: t('table.headerRow'), checked: header, onSelect: () => toggleHeaderRow(editor.activeView) },
    { id: 'nowrap', label: t('table.toggleNoWrap'), onSelect: () => toggleNoWrap(editor.activeView) },
    { id: 'distribute', label: t('table.distribute'), testId: 'table-distribute', onSelect: () => distributeColumns(editor.activeView) },
    { id: 'autofit', label: t('table.autoFit'), onSelect: () => autoFitColumns(editor.activeView, contentWidthPx(editor.activeView.state)) },
    { type: 'heading', id: 'h-talign', label: t('table.alignment') },
    ...(['left', 'center', 'right'] as const).map((a) => ({ id: `ta-${a}`, label: t(a === 'left' ? 'table.alignLeft' : a === 'center' ? 'table.alignCenter' : 'table.alignRight'), checked: talign === a, radio: true, onSelect: () => setTableAlign(editor.activeView, a) })),
    { type: 'separator', id: 's3' },
    { id: 'select', label: t('table.selectTable'), onSelect: () => selectTable(editor.activeView) },
    { id: 'delRow', label: t('table.deleteRow'), onSelect: () => editor.tableAction('deleteRow') },
    { id: 'delCol', label: t('table.deleteColumn'), onSelect: () => editor.tableAction('deleteColumn') },
    { id: 'delTable', label: t('table.deleteTable'), testId: 'table-delete', onSelect: () => editor.tableAction('deleteTable') },
  ];
}

const WRAP_KEYS: Record<WrapKind, MessageKey> = {
  inline: 'wrap.inline', square: 'wrap.square', squareLeft: 'wrap.squareLeft', squareRight: 'wrap.squareRight', tight: 'wrap.tight',
  through: 'wrap.through', topAndBottom: 'wrap.topAndBottom', behind: 'wrap.behind', inFront: 'wrap.inFront',
};

export function wrapLabelKey(k: WrapKind): MessageKey {
  return WRAP_KEYS[k];
}

/** The picture toolbar's text wrapping menu. */
export function wrapEntries(ui: FoliolineUI): MenuEntry[] {
  const { t } = ui.state;
  const editor = editorOf(ui);
  const img = selectedImage(editor.activeView.state);
  const kind = wrapKind(img?.node.attrs.anchor ?? null);
  return WRAP_KINDS.map((k) => ({
    id: k,
    label: t(WRAP_KEYS[k]),
    checked: kind === k,
    radio: true,
    testId: `wrap-${k}`,
    onSelect: () => {
      const cur = selectedImage(editor.activeView.state);
      if (cur) setImageProps(editor.activeView, cur.pos, { wrap: k });
    },
  }));
}

/** The picture toolbar's rotate and flip menu. */
export function transformEntries(ui: FoliolineUI): MenuEntry[] {
  const { t } = ui.state;
  const editor = editorOf(ui);
  return [
    { id: 'rr', label: t('image.rotateRight'), icon: 'RotateCw', onSelect: () => transformImage(editor.activeView, 'rotateRight') },
    { id: 'rl', label: t('image.rotateLeft'), icon: 'RotateCcw', onSelect: () => transformImage(editor.activeView, 'rotateLeft') },
    { id: 'fh', label: t('image.flipH'), icon: 'FlipHorizontal2', onSelect: () => transformImage(editor.activeView, 'flipH') },
    { id: 'fv', label: t('image.flipV'), icon: 'FlipVertical2', onSelect: () => transformImage(editor.activeView, 'flipV') },
  ];
}

/** The review toolbar's markup menu (All Markup first). */
export function markupEntries(ui: FoliolineUI, snap: EditorSnapshot): MenuEntry[] {
  const labels = markupLabels(ui.state.t);
  return MARKUP_MODES.slice()
    .sort((a, b) => (a === 'all' ? -1 : b === 'all' ? 1 : 0))
    .map((m) => ({ id: m, label: labels[m], checked: snap.markup === m, radio: true, testId: `tb-markup-${m}`, onSelect: () => ui.commands.markup(m) }));
}
