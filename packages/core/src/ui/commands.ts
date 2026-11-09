import { insertSectionBreak, insertTable } from '../editor/commands';
import type { DocxEditor, MarkupMode } from '../editor/DocxEditor';
import { setDirection, toggleParagraphSpace } from '../editor/paragraph';
import type { KeyAction } from '../editor/keymap';
import type { Translate } from '../i18n';
import type { FoliolineUI } from './controller';
import type { NavTab } from './types';

/**
 * Commands of the menus, toolbar, context menu and shortcuts, bound to the editor and the
 * interface (dialogs, panes, toasts). They act on the interface's editor when they run.
 */
export function createCommands(ui: FoliolineUI) {
  const { files, openModal, toast, setNavOpen } = ui;
  const t: Translate = (key, vars) => ui.state.t(key, vars);
  /** A command of the editor; it does nothing before the editor exists. */
  const on =
    <A extends unknown[]>(fn: (editor: DocxEditor, ...args: A) => void) =>
    (...args: A) => {
      if (ui.editor) fn(ui.editor, ...args);
    };
  const run = (a: KeyAction) =>
    on((editor) => {
      editor.runAction(a);
      editor.focus();
    });
  const readOnly = () => {
    if (ui.editor?.readOnly) {
      toast(t('toast.readOnly'));
      return true;
    }
    return false;
  };
  return {
    // File
    open: () => files.open(),
    save: () => files.downloadDocx(),
    print: () => files.print(),
    exportPdf: () => void files.exportPdf(),
    exportMarkdown: () => files.exportMarkdown(),
    newDocument: () => files.newDocument(),
    pageSetup: () => !readOnly() && openModal('pageSetup'),
    // Format
    bold: run('bold'),
    italic: run('italic'),
    underline: run('underline'),
    strike: run('strike'),
    superscript: run('superscript'),
    subscript: run('subscript'),
    alignLeft: run('alignLeft'),
    alignCenter: run('alignCenter'),
    alignRight: run('alignRight'),
    justify: run('alignJustify'),
    bulletList: run('bulletList'),
    numberedList: run('numberedList'),
    indent: run('indent'),
    outdent: run('outdent'),
    direction: on((editor, rtl: boolean) => {
      if (readOnly()) return;
      setDirection(editor.activeView, rtl);
      editor.focus();
    }),
    paragraphDialog: () => !readOnly() && openModal('paragraph'),
    paragraphSpace: on((editor, side: 'before' | 'after') => {
      if (readOnly()) return;
      toggleParagraphSpace(editor.activeView, editor.docx, side);
      editor.focus();
    }),
    formatPainter: on((editor) => {
      if (editor.formatPainterActive) editor.stopFormatPainter();
      else if (!readOnly()) {
        editor.startFormatPainter();
        toast(t('toast.painterArmed'));
      }
    }),
    clearFormatting: run('clearFormatting'),
    // Insert
    image: () => !readOnly() && ui.pickImage(),
    textBox: () => !readOnly() && openModal('textBox'),
    table: on((editor, rows: number, cols: number) => {
      if (readOnly()) return;
      insertTable(editor.activeView, editor.docx, rows, cols);
      editor.focus();
    }),
    footnote: () => !readOnly() && openModal('note', { kind: 'footnote' }),
    endnote: () => !readOnly() && openModal('note', { kind: 'endnote' }),
    pageBreak: run('pageBreak'),
    sectionBreak: on((editor, type: 'nextPage' | 'continuous') => {
      if (readOnly()) return;
      if (editor.activeStream !== 'body') editor.exitHeaderFooter(false);
      insertSectionBreak(editor.view, type);
      editor.focus();
    }),
    toc: on((editor) => {
      if (readOnly()) return;
      if (editor.hasTableOfContents) {
        editor.refreshTableOfContents({ title: t('toc.title'), empty: t('toc.noHeadings') });
        toast(t('toc.updated'));
      } else editor.insertTableOfContents({ title: t('toc.title'), empty: t('toc.noHeadings') });
    }),
    refreshToc: on((editor) => {
      if (editor.refreshTableOfContents({ title: t('toc.title'), empty: t('toc.noHeadings') })) toast(t('toc.updated'));
    }),
    bookmark: () => !readOnly() && openModal('bookmark'),
    goToBookmark: () => setNavOpen(true, 'bookmarks'),
    watermark: () => !readOnly() && openModal('watermark'),
    link: () => !readOnly() && openModal('link'),
    // Review
    markup: on((editor, mode: MarkupMode) => editor.setMarkupMode(mode)),
    trackOptions: () => openModal('trackOptions'),
    prevChange: on((editor) => {
      if (!editor.goToChange(-1)) toast(t('review.noMoreChanges'));
    }),
    nextChange: on((editor) => {
      if (!editor.goToChange(1)) toast(t('review.noMoreChanges'));
    }),
    decideShown: on((editor, accept: boolean) => {
      if (readOnly()) return;
      const n = editor.decideShownChanges(accept);
      if (!n) toast(t('review.nothingToDecide'));
    }),
    toggleMarks: on((editor) => editor.setShowNonPrinting(!editor.showNonPrinting)),
    toggleBookmarks: on((editor) => editor.setShowBookmarks(!editor.display.bookmarks)),
    toggleProtect: on((editor) => {
      if (editor.editMode === 'viewing') return;
      const protect = !editor.display.protected;
      editor.setFormsProtection(protect);
      toast(t(protect ? 'protect.on' : 'protect.off'));
    }),
    setHiddenReviewers: on((editor, names: string[]) => editor.setHiddenReviewers(names)),
    comment: () => ui.openComposer(),
    // Help
    reportIssue: () => openModal('report'),
    shortcuts: () => openModal('shortcuts'),
    about: () => openModal('about'),
    navigation: (tab?: NavTab) => setNavOpen(true, tab),
  };
}

export type Commands = ReturnType<typeof createCommands>;
