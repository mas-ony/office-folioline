/**
 * The interface around a DocxEditor without its views: the state the React and Vue interfaces
 * render, the actions their controls call, and the behaviour that needs no view (editor requests,
 * shortcuts, file actions, autosave, live sessions, languages, phone layout). A view creates one,
 * renders from `state`, calls `attach()` once its elements exist and `detach()` when it goes away.
 */
import { type DocxEditorRef, makeRef } from '../api/page';
import { type DocumentInput, type DocumentSource, documentOf, DOCX_MIME, downloadBlob, nameOfUrl, openFailure } from '../api/source';
import { type CollabOptions, CollabSession, colorFor, relayAvailable } from '../collab/session';
import { wordAt } from '../editor/commands';
import { DocxEditor } from '../editor/DocxEditor';
import { normalizeMarkup, type RevisionMarkup } from '../editor/markup';
import { DEFAULT_PEN, type BorderPen } from '../editor/tableFormat';
import { browserLocale, isLocale, isRtl, loadMessages, type Locale, makeTranslate, type Messages } from '../i18n';
import { type AutosaveRecord, clearAutosave, loadAutosave, saveAutosave } from './autosave';
import { type Commands, createCommands } from './commands';
import { cx, matchesMedia, MOBILE_QUERY, NARROW_QUERY, watchMedia } from './dom';
import { EditorStore } from './store';
import type { ColorScheme, FileActions, FoliolineOptions, ModalName, NavTab, SidePanelTab, UIControls, UIState, UserInfo } from './types';

const DARK_QUERY = '(prefers-color-scheme: dark)';
const RECOVERY_MS = 1000 * 60 * 60 * 24 * 14;
const AUTOSAVE_DELAY = 2000;
const TOAST_MS = 3800;
const OPEN_ACCEPT = `.docx,.dotx,.doc,${DOCX_MIME}`;
const IMAGE_ACCEPT = 'image/png,image/jpeg,image/gif,image/webp,image/svg+xml,image/bmp';

interface FilePickerWindow {
  showOpenFilePicker?: (opts: unknown) => Promise<FileSystemFileHandle[]>;
}

const pickerTypes = [{ description: 'Word document', accept: { [DOCX_MIME]: ['.docx', '.dotx'] } }];

function read(key: string | undefined): string | null {
  if (!key) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function load<T extends string>(key: string | undefined, fallback: T, allowed: readonly T[]): T {
  const v = read(key) as T | null;
  return v && allowed.includes(v) ? v : fallback;
}

function save(key: string | undefined, value: string) {
  if (!key) return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage is optional (private windows, blocked site data).
  }
}

function loadUser(key: string | undefined): UserInfo | null {
  try {
    const u = JSON.parse(read(key) ?? 'null') as UserInfo | null;
    return u?.name ? { name: u.name } : null;
  } catch {
    return null;
  }
}

/** The language at start: the stored one under `<storageKey>-locale`, or the browser's. */
export function initialLocale(storageKey?: string): Locale {
  const v = read(storageKey && `${storageKey}-locale`);
  return isLocale(v) ? v : browserLocale();
}

function sameDocument(a: DocumentInput | undefined, b: DocumentInput | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const x = documentOf(a);
  const y = documentOf(b);
  return x.source === y.source && x.name === y.name;
}

type Patch = Partial<UIState>;

/** Classes of the interface's root element: the appearance and the phone layout. */
export function rootClassOf(state: Pick<UIState, 'scheme' | 'mobile'>): string {
  return cx('fl-app', state.scheme === 'dark' && 'is-dark', state.mobile && 'is-mobile');
}

export class FoliolineUI implements UIControls {
  options: FoliolineOptions;
  state: UIState;
  /** The editor while attached. */
  editor: DocxEditor | null = null;
  store: EditorStore | null = null;
  /**
   * Container on the page's body for menus, dialogs and messages, so that they overlay everything;
   * it carries the appearance, direction and language of the interface. Created by attach().
   */
  layer: HTMLDivElement | null = null;
  /** The page API handle for this editor, from the time the interface is ready. */
  api: DocxEditorRef | null = null;
  readonly files: FileActions;
  /** The commands of the menus, toolbar, context menu and shortcuts. */
  readonly commands: Commands;
  /** What the toolbar's colour buttons and the table border pen apply next. */
  readonly tools: { color: string; highlight: string; pen: BorderPen } = { color: 'FF0000', highlight: 'yellow', pen: { ...DEFAULT_PEN } };
  private listeners = new Set<() => void>();
  private offs: (() => void)[] = [];
  private root: HTMLElement | null = null;
  private openInput: HTMLInputElement | null = null;
  private imageInput: HTMLInputElement | null = null;
  private session: CollabSession | null = null;
  private recovery: AutosaveRecord | null = null;
  private autosaveTimer: ReturnType<typeof setTimeout> | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private refitFrame = 0;
  private localeRequest = 0;
  private shareSupported: boolean | null = null;

  constructor(options: FoliolineOptions = {}) {
    this.options = { ...options };
    const mobile = matchesMedia(MOBILE_QUERY);
    const locale = options.locale ?? initialLocale(options.storageKey);
    const dark = matchesMedia(DARK_QUERY) ? 'dark' : 'light';
    this.state = {
      mobile,
      panelOpen: !mobile && typeof window !== 'undefined' && window.innerWidth >= 1100 && load(this.key('panel'), 'open', ['open', 'closed']) === 'open',
      panelTab: 'changes',
      navOpen: false,
      navTab: 'headings',
      railOpen: false,
      composerRange: null,
      rulersOn: load(this.key('rulers'), 'off', ['on', 'off']) === 'on',
      modal: null,
      modalData: {},
      toast: null,
      user: options.user ? { name: options.user.name } : loadUser(this.key('user')) ?? { name: `Reviewer ${1000 + Math.floor(Math.random() * 9000)}` },
      scheme: options.colorScheme ?? load(this.key('scheme'), dark, ['light', 'dark']),
      collab: null,
      relay: false,
      hfMenu: null,
      restore: null,
      locale: 'en',
      rtl: false,
      t: makeTranslate('en', {}),
      // The interface starts in its language: English at once, other languages when their strings arrive.
      i18nReady: locale === 'en',
      ready: false,
    };
    this.files = this.makeFiles();
    this.commands = createCommands(this);
    if (locale !== 'en') this.loadLocale(locale);
  }

  // ---------------------------------------------------------------------------------------------
  // State

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getState = (): UIState => this.state;

  set(patch: Patch) {
    const keys = Object.keys(patch) as (keyof UIState)[];
    if (keys.every((k) => Object.is(this.state[k], patch[k]))) return;
    const prev = this.state;
    this.state = { ...this.state, ...patch };
    this.updateLayer();
    // The comment cards take room beside the pages; the zoom follows when it fits automatically.
    if (prev.railOpen !== this.state.railOpen || prev.panelOpen !== this.state.panelOpen || prev.navOpen !== this.state.navOpen) this.scheduleRefit();
    for (const fn of [...this.listeners]) fn();
  }

  private notify() {
    for (const fn of [...this.listeners]) fn();
  }

  private updateLayer() {
    const layer = this.layer;
    if (!layer) return;
    layer.className = rootClassOf(this.state).replace('fl-app', 'fl-layer');
    layer.dir = this.state.rtl ? 'rtl' : 'ltr';
    layer.lang = this.state.locale;
  }

  private scheduleRefit() {
    const ed = this.editor;
    if (!ed || typeof requestAnimationFrame === 'undefined') return;
    cancelAnimationFrame(this.refitFrame);
    this.refitFrame = requestAnimationFrame(() => {
      if (this.editor === ed) ed.refit();
    });
  }

  /** Whether a node belongs to this interface (its root or its layer). */
  contains(node: Node | null): boolean {
    return !!node && (!!this.root?.contains(node) || !!this.layer?.contains(node));
  }

  private key(name: string): string | undefined {
    return this.options.storageKey && `${this.options.storageKey}-${name}`;
  }

  // ---------------------------------------------------------------------------------------------
  // Actions

  setPanelOpen = (open: boolean) => {
    this.set({ panelOpen: open });
    if (!matchesMedia(NARROW_QUERY)) save(this.key('panel'), open ? 'open' : 'closed');
  };

  setPanelTab = (tab: SidePanelTab) => this.set({ panelTab: tab });

  setNavOpen = (open: boolean, tab?: NavTab) => this.set(tab ? { navOpen: open, navTab: tab } : { navOpen: open });

  setNavTab = (tab: NavTab) => this.set({ navTab: tab });

  setRailOpen = (open: boolean) => this.set({ railOpen: open });

  setRulersOn = (on: boolean) => {
    this.set({ rulersOn: on });
    save(this.key('rulers'), on ? 'on' : 'off');
  };

  openModal = (modal: ModalName, data: Record<string, unknown> = {}) => this.set({ modal, modalData: data });

  closeModal = () => this.openModal(null);

  toast = (message: string) => {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.set({ toast: message });
    this.toastTimer = setTimeout(() => this.set({ toast: null }), TOAST_MS);
  };

  setScheme = (scheme: ColorScheme) => {
    this.set({ scheme });
    save(this.key('scheme'), scheme);
    this.options.onColorSchemeChange?.(scheme);
  };

  setUser = (user: UserInfo) => {
    this.applyUser(user);
    save(this.key('user'), JSON.stringify(this.state.user));
    this.options.onUserChange?.(user);
  };

  private applyUser(user: UserInfo) {
    this.set({ user: { name: user.name } });
    this.editor?.setAuthor(user.name);
    this.session?.setUser({ name: user.name });
  }

  /** Switch the interface language; its strings load first. */
  setLocale = (locale: Locale) => {
    save(this.key('locale'), locale);
    this.options.onLocaleChange?.(locale);
    this.loadLocale(locale);
  };

  private loadLocale(locale: Locale) {
    const request = ++this.localeRequest;
    const apply = (l: Locale, messages: Messages) => {
      if (request !== this.localeRequest) return;
      this.set({ locale: l, rtl: isRtl(l), t: makeTranslate(l, messages), i18nReady: true });
      this.applyLabels();
    };
    loadMessages(locale).then((messages) => apply(locale, messages), () => apply('en', {}));
  }

  /** Interface text drawn by the engine follows the interface language. */
  private applyLabels() {
    const { t } = this.state;
    this.editor?.setLabels({
      header: t('hf.header'),
      footer: t('hf.footer'),
      firstHeader: t('hf.firstHeader'),
      firstFooter: t('hf.firstFooter'),
      evenHeader: t('hf.evenHeader'),
      evenFooter: t('hf.evenFooter'),
      section: t('hf.section', { label: '{label}', n: '{n}' }),
      options: t('hf.options'),
      editHeaderHint: t('hf.editHeaderHint'),
      editFooterHint: t('hf.editFooterHint'),
      sharedHeaderFooter: t('hf.sharedBlocked'),
      sharedNotes: t('note.shared'),
      protectedEdit: t('protect.blocked'),
    });
  }

  /** Apply markup options (Track Changes Options) and remember them. */
  setRevisionMarkup = (options: RevisionMarkup) => {
    const ed = this.editor;
    if (!ed) return;
    ed.setRevisionMarkup(options);
    save(this.key('track-markup'), JSON.stringify(ed.revisionMarkup));
  };

  /** The new-comment draft for the selection (or the word at the caret). */
  openComposer = () => {
    const ed = this.editor;
    if (!ed || ed.readOnly) return;
    if (ed.activeStream !== 'body') ed.exitHeaderFooter(false);
    const { state } = ed.view;
    const range = state.selection.empty ? wordAt(state, state.selection.from) : { from: state.selection.from, to: state.selection.to };
    if (!range || range.from === range.to) {
      this.toast(this.state.t('toast.selectToComment'));
      return;
    }
    if (matchesMedia(NARROW_QUERY)) this.set({ composerRange: range, panelTab: 'changes', panelOpen: true });
    else this.set({ composerRange: range, railOpen: true });
  };

  closeComposer = () => this.set({ composerRange: null });

  closeHeaderFooterMenu = () => this.set({ hfMenu: null });

  /** The colour of an author's cards, avatar and marks. */
  authorColor = (name: string): string => {
    const p = this.state.collab?.participants.find((x) => x.name === name);
    if (p) return p.color;
    return this.editor ? this.editor.authorColor(name) : colorFor(name);
  };

  /** Pick pictures to insert at the caret. */
  pickImage = () => this.imageInput?.click();

  /** Open the unsaved work autosave found. */
  recover = () => {
    const r = this.recovery;
    if (r) this.openBytes(r.bytes, r.fileName);
  };

  discardRecovery = () => {
    this.recovery = null;
    this.set({ restore: null });
    if (this.options.autosave) void clearAutosave(this.options.autosave);
  };

  /** Ask before replacing a document with unsaved changes. */
  confirmDiscard = (): boolean => !this.editor?.dirty || window.confirm(this.state.t('app.discard'));

  // ---------------------------------------------------------------------------------------------
  // Opening documents

  /** Open a document: a URL, a File or Blob, or the bytes; the file picker when no source is given. */
  open = async (source?: DocumentSource, name?: string): Promise<boolean> => {
    if (source === undefined) {
      this.files.open();
      return false;
    }
    if (typeof source === 'string') return this.openUrl(source, name ?? nameOfUrl(source));
    let bytes: Uint8Array;
    try {
      bytes = source instanceof Uint8Array ? source : source instanceof ArrayBuffer ? new Uint8Array(source) : new Uint8Array(await source.arrayBuffer());
    } catch (e) {
      this.toast((e as Error).message);
      return false;
    }
    return this.openBytes(bytes, name ?? (source as File).name ?? 'Document.docx');
  };

  /** Open DOCX bytes; a file that does not open is explained in a dialog. */
  openBytes(bytes: Uint8Array, name: string, keepRecovery = false): boolean {
    const ed = this.editor;
    if (!ed) return false;
    try {
      ed.load(bytes, name);
      if (!keepRecovery) {
        this.recovery = null;
        this.set({ restore: null });
        if (this.options.autosave) void clearAutosave(this.options.autosave);
      }
      return true;
    } catch (e) {
      console.error(e);
      this.openModal('openFailure', { ...openFailure(bytes, name, e), name });
      return false;
    }
  }

  async openUrl(url: string, name: string, keepRecovery = false): Promise<boolean> {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return this.openBytes(new Uint8Array(await r.arrayBuffer()), name, keepRecovery);
    } catch (e) {
      this.toast(`${name}: ${(e as Error).message}`);
      return false;
    }
  }

  /** The document of the options; at start it leaves an offer to recover unsaved work in place. */
  private async openDocument(input: DocumentInput, initial: boolean): Promise<boolean> {
    const { source, name } = documentOf(input);
    if (source === undefined) return false;
    if (typeof source === 'string') return this.openUrl(source, name ?? nameOfUrl(source), initial);
    const bytes = await this.bytesOf(source);
    return !!bytes && this.openBytes(bytes, name ?? (source as File).name ?? 'Document.docx', initial);
  }

  private async bytesOf(source: Blob | ArrayBuffer | Uint8Array): Promise<Uint8Array | null> {
    try {
      return source instanceof Uint8Array ? source : source instanceof ArrayBuffer ? new Uint8Array(source) : new Uint8Array(await source.arrayBuffer());
    } catch (e) {
      this.toast((e as Error).message);
      return null;
    }
  }

  private async offerRecovery() {
    const db = this.options.autosave;
    const ed = this.editor;
    if (!db) return;
    const rec = await loadAutosave(db);
    if (this.editor !== ed || !rec || Date.now() - rec.savedAt >= RECOVERY_MS) return;
    this.recovery = rec;
    this.set({ restore: { fileName: rec.fileName, savedAt: rec.savedAt } });
  }

  // ---------------------------------------------------------------------------------------------
  // Files

  private makeFiles(): FileActions {
    const pick = <K extends Exclude<keyof FileActions, 'share'>>(k: K): FileActions[K] => this.options.files?.[k] ?? this.builtinFiles[k];
    const files: FileActions = {
      newDocument: () => pick('newDocument')(),
      open: () => pick('open')(),
      openExample: (id) => pick('openExample')(id),
      downloadDocx: () => pick('downloadDocx')(),
      exportPdf: () => pick('exportPdf')(),
      exportMarkdown: () => pick('exportMarkdown')(),
      print: () => pick('print')(),
    };
    // Only where the browser can share files (or the share action was replaced).
    Object.defineProperty(files, 'share', { enumerable: true, get: () => this.options.files?.share ?? (this.canShare() ? this.builtinFiles.share : undefined) });
    return files;
  }

  private canShare(): boolean {
    if (this.shareSupported === null) {
      try {
        this.shareSupported = typeof navigator !== 'undefined' && !!navigator.canShare && navigator.canShare({ files: [new File([new Uint8Array(1)], 'x.docx', { type: DOCX_MIME })] });
      } catch {
        this.shareSupported = false;
      }
    }
    return this.shareSupported;
  }

  private afterSave(ed: DocxEditor) {
    ed.markSaved();
    if (this.options.autosave) void clearAutosave(this.options.autosave);
  }

  private readonly builtinFiles: FileActions = {
    newDocument: () => {
      if (!this.confirmDiscard()) return;
      this.editor?.newDocument();
    },
    open: async () => {
      if (!this.confirmDiscard()) return;
      const w = window as unknown as FilePickerWindow;
      if (w.showOpenFilePicker) {
        try {
          const [handle] = await w.showOpenFilePicker({ types: pickerTypes, multiple: false });
          const file = await handle.getFile();
          this.openBytes(new Uint8Array(await file.arrayBuffer()), file.name);
        } catch (e) {
          if ((e as DOMException)?.name !== 'AbortError') this.openInput?.click();
        }
        return;
      }
      this.openInput?.click();
    },
    openExample: (id) => {
      const ex = this.options.examples?.find((x) => x.id === id);
      if (!ex || !this.confirmDiscard()) return;
      void this.openUrl(ex.url, ex.name ?? nameOfUrl(ex.url));
    },
    downloadDocx: () => {
      const ed = this.editor;
      if (!ed) return;
      downloadBlob(ed.exportBlob(), ed.fileName);
      this.afterSave(ed);
      this.toast(this.state.t('toast.saved', { name: ed.fileName }));
    },
    exportPdf: async () => {
      const ed = this.editor;
      if (!ed) return;
      const { t } = this.state;
      this.toast(t('export.converting', { format: 'PDF' }));
      try {
        const { exportPdf } = await import('../pdf/exportPdf');
        const bytes = await exportPdf(ed);
        downloadBlob(new Blob([bytes as BlobPart], { type: 'application/pdf' }), `${ed.fileName.replace(/\.docx$/i, '')}.pdf`);
        this.toast(this.state.t('export.downloaded'));
      } catch (e) {
        this.toast(this.state.t('export.failed', { message: (e as Error).message }));
      }
    },
    exportMarkdown: () => {
      const ed = this.editor;
      if (!ed) return;
      try {
        downloadBlob(new Blob([ed.exportMarkdown()], { type: 'text/markdown;charset=utf-8' }), `${ed.fileName.replace(/\.docx$/i, '')}.md`);
        this.toast(this.state.t('export.downloaded'));
      } catch (e) {
        this.toast(this.state.t('export.failed', { message: (e as Error).message }));
      }
    },
    print: () => this.editor?.print(),
    share: async () => {
      const ed = this.editor;
      if (!ed) return;
      try {
        await navigator.share({ files: [new File([ed.exportBlob()], ed.fileName, { type: DOCX_MIME })], title: ed.fileName });
        this.afterSave(ed);
      } catch (e) {
        if ((e as DOMException)?.name !== 'AbortError') this.toast((e as Error).message);
      }
    },
  };

  // ---------------------------------------------------------------------------------------------
  // Live sessions

  private collabOptions(): CollabOptions {
    return { relay: this.options.relay, link: this.options.shareLink };
  }

  /** Start a live session with the open document. */
  startSession = async (): Promise<void> => {
    const ed = this.editor;
    if (!ed || this.session) return;
    try {
      const s = await CollabSession.start(ed, { name: this.state.user.name }, (collab) => this.set({ collab }), this.collabOptions());
      if (this.editor !== ed) {
        s.leave();
        return;
      }
      this.session = s;
      this.toast(this.state.t('settings.liveToast'));
    } catch (e) {
      this.toast(this.state.t('settings.joinFailed', { message: (e as Error).message }));
    }
  };

  leaveSession = () => {
    this.session?.leave();
    this.session = null;
    this.set({ collab: null });
    this.toast(this.state.t('settings.leftToast'));
  };

  /** Join a live session by its room id. */
  joinRoom = async (room: string): Promise<void> => {
    const ed = this.editor;
    if (!ed) return;
    this.session?.leave();
    this.session = null;
    try {
      const s = await CollabSession.join(ed, room, { name: this.state.user.name }, (collab) => this.set({ collab }), this.collabOptions());
      if (this.editor !== ed) {
        s.leave();
        return;
      }
      this.session = s;
      this.toast(this.state.t('settings.joined'));
    } catch (e) {
      this.toast(this.state.t('settings.joinFailed', { message: (e as Error).message }));
    }
  };

  // ---------------------------------------------------------------------------------------------
  // Options

  /** New options from the component's props; the document, language, appearance and user follow them. */
  setOptions(next: FoliolineOptions) {
    const prev = this.options;
    this.options = { ...next };
    if (next.locale && next.locale !== prev.locale) this.loadLocale(next.locale);
    if (next.colorScheme && next.colorScheme !== prev.colorScheme) this.set({ scheme: next.colorScheme });
    if (next.user && next.user.name !== prev.user?.name) this.applyUser(next.user);
    if (!this.editor || !this.api) return;
    if (next.room && next.room !== prev.room) void this.joinRoom(next.room);
    else if (next.document && !sameDocument(next.document, prev.document)) void this.openDocument(next.document, false);
  }

  // ---------------------------------------------------------------------------------------------
  // Lifetime

  private fileInput(accept: string, testId: string, multiple: boolean, onFiles: (files: File[]) => void): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.multiple = multiple;
    input.hidden = true;
    input.dataset.testid = testId;
    input.addEventListener('change', () => {
      const list = Array.from(input.files ?? []);
      input.value = '';
      if (list.length) onFiles(list);
    });
    this.layer!.appendChild(input);
    return input;
  }

  /**
   * Create the editor in `host` (inside the interface's `root`) and start: open the document or
   * live session from the options (and offer to recover unsaved work), then call `onReady`.
   */
  attach(parts: { root: HTMLElement; host: HTMLElement }) {
    if (this.editor) this.detach();
    this.root = parts.root;
    const layer = (this.layer ??= document.createElement('div'));
    this.updateLayer();
    document.body.appendChild(layer);
    this.openInput = this.fileInput(OPEN_ACCEPT, 'open-input', false, ([file]) => {
      void file.arrayBuffer().then((buf) => this.openBytes(new Uint8Array(buf), file.name));
    });
    this.imageInput = this.fileInput(IMAGE_ACCEPT, 'image-input', true, (list) => {
      if (this.editor) void this.editor.insertImages(list);
    });

    const ed = new DocxEditor(parts.host, { author: this.state.user.name, viewMode: matchesMedia(NARROW_QUERY) ? 'web' : 'print' });
    try {
      ed.setRevisionMarkup(normalizeMarkup(JSON.parse(read(this.key('track-markup')) ?? 'null')));
    } catch {
      ed.setRevisionMarkup(normalizeMarkup(null));
    }
    const store = new EditorStore(ed);
    this.editor = ed;
    this.store = store;
    // A generated name is kept, so the reader keeps it on the next visit.
    if (this.options.storageKey && !loadUser(this.key('user'))) save(this.key('user'), JSON.stringify(this.state.user));
    if (this.state.i18nReady) this.applyLabels();
    void relayAvailable(this.options.relay).then((relay) => {
      if (this.editor === ed) this.set({ relay });
    });

    // Requests from shortcuts and the engine.
    this.offs.push(
      ed.on('request', (e) => {
        switch (e.action) {
          case 'link': this.openModal('link'); break;
          case 'comment': this.openComposer(); break;
          case 'find': this.setNavOpen(true, 'find'); break;
          case 'replace': this.setNavOpen(true, 'find'); break;
          case 'save': this.files.downloadDocx(); break;
          case 'print': this.files.print(); break;
          case 'open': this.files.open(); break;
          case 'bookmark': this.openModal('bookmark'); break;
          case 'goToBookmark': this.setNavOpen(true, 'bookmarks'); break;
          case 'editNote': this.openModal('note', { key: e.key }); break;
          case 'headerFooterOptions':
            // The bar's Options button opens the menu, or closes it when it is open.
            if (this.state.hfMenu) this.closeHeaderFooterMenu();
            else if (e.rect) this.set({ hfMenu: { at: { x: e.rect.right - 260, y: e.rect.bottom + 4 }, pageIndex: e.pageIndex ?? 0 } });
            break;
        }
      }),
      ed.on('error', (e) => this.toast(e.message)),
      ed.on('load', ({ warnings }) => {
        this.set({ composerRange: null, hfMenu: null });
        if (warnings.length) console.warn('Import warnings:', warnings);
      }),
      ed.on('stream', (e) => {
        if (e.stream === 'body') this.set({ hfMenu: null });
      }),
      ed.on('change', ({ dirty }) => {
        const db = this.options.autosave;
        if (!dirty || !db) return;
        if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
        this.autosaveTimer = setTimeout(() => {
          try {
            void saveAutosave(db, { fileName: ed.fileName, bytes: ed.exportDocx(), savedAt: Date.now() });
          } catch {
            // Export errors are reported when the user downloads.
          }
        }, AUTOSAVE_DELAY);
      }),
    );

    const keys = (e: KeyboardEvent) => {
      const target = e.target as Node;
      if (e.key === 'Escape' && this.state.mobile && this.state.panelOpen && !this.state.modal) {
        // Escape closes the phone sheet.
        this.set({ panelOpen: false });
        return;
      }
      if (!this.options.globalShortcuts && !this.contains(target)) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        ed.setEditMode(ed.editMode === 'suggesting' ? 'editing' : 'suggesting');
      } else if (mod && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'f' && !ed.root.contains(target)) {
        e.preventDefault();
        this.setNavOpen(true, 'find');
      }
    };
    window.addEventListener('keydown', keys);
    this.offs.push(() => window.removeEventListener('keydown', keys));

    // Phones show the reflowing layout; a wide window shows pages.
    const applyMobile = (mobile: boolean) => {
      ed.setViewMode(mobile ? 'web' : 'print');
      this.set(mobile ? { mobile, panelOpen: false, railOpen: false } : { mobile });
    };
    applyMobile(matchesMedia(MOBILE_QUERY));
    this.offs.push(watchMedia(MOBILE_QUERY, applyMobile));
    this.scheduleRefit();
    this.notify();
    void this.start(ed);
  }

  private async start(ed: DocxEditor) {
    // Let a view that is mounted twice in a row (React's StrictMode) settle first.
    await Promise.resolve();
    if (this.editor !== ed) return;
    const o = this.options;
    if (o.room) await this.joinRoom(o.room);
    else {
      if (o.offerRecovery ?? !o.document) void this.offerRecovery();
      // The initial document starts out without unsaved changes.
      if (o.document && (await this.openDocument(o.document, true)) && this.editor === ed) ed.markSaved();
    }
    if (this.editor !== ed) return;
    const api = makeRef(ed, this, this.files);
    this.api = api;
    this.set({ ready: true });
    o.onReady?.(api, this);
  }

  /** Remove the editor and stop listening; attach() may be called again. */
  detach() {
    for (const off of this.offs.splice(0)) off();
    if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    if (typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(this.refitFrame);
    this.autosaveTimer = null;
    this.toastTimer = null;
    this.session?.leave();
    this.session = null;
    this.recovery = null;
    this.api = null;
    this.store?.dispose();
    this.editor?.destroy();
    this.editor = null;
    this.store = null;
    this.root = null;
    this.openInput?.remove();
    this.imageInput?.remove();
    this.openInput = null;
    this.imageInput = null;
    this.layer?.remove();
    this.state = { ...this.state, collab: null, composerRange: null, toast: null, hfMenu: null, restore: null, modal: null, modalData: {}, ready: false };
  }
}
