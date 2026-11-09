import { cx, type DocxEditor, type EditorStore, type FoliolineOptions, FoliolineUI, rootClassOf, type UIState } from '@folioline/core/views';
import { type CSSProperties, type RefObject, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { ContextMenu } from './ContextMenu';
import { UIContext, type UIContextValue, useSnapshot, useUI } from './context';
import { Toast } from './controls';
import { Dialogs } from './Dialogs';
import { NavToggle, PageChip, ZoomBar } from './DocChrome';
import { FormatBar } from './FormatBar';
import { HeaderFooterMenu } from './HeaderFooterMenu';
import { LinkPopover } from './LinkPopover';
import { NavigationPane } from './NavigationPane';
import { ReviewRail } from './ReviewRail';
import { Ruler } from './Ruler';
import { SidePanel } from './SidePanel';
import { TitleBar } from './TitleBar';
import { VRuler } from './VRuler';

export interface FoliolineEditorProps extends FoliolineOptions {
  className?: string;
  style?: CSSProperties;
}

/** Rulers, navigation pane, zoom and page indicator over the pages. */
function DocOverlays() {
  const ui = useUI();
  const viewMode = useSnapshot(ui.store, (s) => s.viewMode);
  return (
    <>
      <NavToggle />
      {ui.navOpen && <NavigationPane />}
      {viewMode === 'print' && <ZoomBar />}
      <PageChip />
    </>
  );
}

function HRulerSlot() {
  const ui = useUI();
  const viewMode = useSnapshot(ui.store, (s) => s.viewMode);
  return ui.rulersOn && !ui.mobile && viewMode === 'print' ? <Ruler /> : null;
}

function VRulerSlot() {
  const ui = useUI();
  const viewMode = useSnapshot(ui.store, (s) => s.viewMode);
  return ui.rulersOn && !ui.mobile && viewMode === 'print' ? <VRuler /> : null;
}

/**
 * The document pane. The element the editor mounts into is rendered from the first render on,
 * before the interface around it exists, and keeps its identity afterwards.
 */
function DocPane({ host, ui }: { host: RefObject<HTMLDivElement | null>; ui: UIContextValue | null }) {
  return (
    <section className={cx('fl-docpane', ui?.navOpen && 'has-nav', ui?.railOpen && !ui.mobile && 'has-rail', ui?.rulersOn && !ui.mobile && 'has-rulers')} aria-label="Document" data-testid="docpane">
      {ui && <FormatBar />}
      <div className="fl-stage">
        {ui && <HRulerSlot />}
        <div className="fl-stage-row">
          {ui && <VRulerSlot />}
          <div className="fl-doc-host" ref={host} data-testid="doc-host" />
        </div>
        {ui && <DocOverlays />}
      </div>
    </section>
  );
}

/** Unsaved work found by autosave, offered for recovery. */
function RestoreBanner({ restore }: { restore: UIState['restore'] }) {
  const { ui, layer, t } = useUI();
  if (!restore) return null;
  return createPortal(
    <div className="fl-restore" role="alertdialog" aria-label={t('app.recoverAction')} data-testid="restore-banner">
      <span>{t('app.recover', { name: restore.fileName, time: new Date(restore.savedAt).toLocaleString() })}</span>
      <button type="button" className="fl-btn is-primary is-small" onClick={ui.recover}>{t('app.recoverAction')}</button>
      <button type="button" className="fl-btn is-small" onClick={ui.discardRecovery}>{t('common.dismiss')}</button>
    </div>,
    layer,
  );
}

/** The complete editor: title bar, toolbar, document, review panel, menus and dialogs. */
export function FoliolineEditor({ className, style, ...options }: FoliolineEditorProps) {
  const [ui] = useState(() => new FoliolineUI(options));
  const state = useSyncExternalStore(ui.subscribe, ui.getState, ui.getState);
  const root = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const [parts, setParts] = useState<{ editor: DocxEditor; store: EditorStore; layer: HTMLElement } | null>(null);

  // Later props are passed on (the first ones created the interface).
  const mounted = useRef(false);
  useEffect(() => {
    if (mounted.current) ui.setOptions(options);
  });

  useEffect(() => {
    mounted.current = true;
    ui.attach({ root: root.current!, host: host.current! });
    setParts({ editor: ui.editor!, store: ui.store!, layer: ui.layer! });
    return () => ui.detach();
  }, [ui]);

  const value = useMemo<UIContextValue | null>(() => (parts ? {
    ui,
    editor: parts.editor,
    store: parts.store,
    layer: parts.layer,
    t: state.t,
    locale: state.locale,
    rtl: state.rtl,
    setLocale: ui.setLocale,
    mobile: state.mobile,
    panelOpen: state.panelOpen,
    setPanelOpen: ui.setPanelOpen,
    panelTab: state.panelTab,
    setPanelTab: ui.setPanelTab,
    navOpen: state.navOpen,
    setNavOpen: ui.setNavOpen,
    navTab: state.navTab,
    setNavTab: ui.setNavTab,
    railOpen: state.railOpen,
    setRailOpen: ui.setRailOpen,
    composerRange: state.composerRange,
    openComposer: ui.openComposer,
    closeComposer: ui.closeComposer,
    rulersOn: state.rulersOn,
    setRulersOn: ui.setRulersOn,
    modal: state.modal,
    modalData: state.modalData,
    openModal: ui.openModal,
    toast: ui.toast,
    files: ui.files,
    user: state.user,
    setUser: ui.setUser,
    scheme: state.scheme,
    setScheme: ui.setScheme,
    collab: state.collab,
    relay: state.relay,
    startSession: ui.startSession,
    leaveSession: ui.leaveSession,
    authorColor: ui.authorColor,
  } : null), [ui, parts, state]);

  // The interface shows once the strings of its language have loaded.
  const chrome = state.i18nReady ? value : null;
  const { mobile, panelOpen, hfMenu, toast } = state;
  return (
    <div ref={root} className={cx(rootClassOf(state), className)} style={style} dir={state.rtl ? 'rtl' : 'ltr'} lang={state.locale} data-testid="app">
      <UIContext.Provider value={chrome}>
        {chrome && <TitleBar />}
        <div className="fl-workspace">
          <DocPane host={host} ui={chrome} />
          {chrome && panelOpen && !mobile && <SidePanel />}
        </div>
        {chrome && mobile && panelOpen && (
          <div className="fl-sheet-backdrop" onPointerDown={(e) => e.target === e.currentTarget && ui.setPanelOpen(false)}>
            <div className="fl-sheet is-panel" role="dialog" aria-label={state.t('panel.label')}>
              <div className="fl-sheet-grip" aria-hidden="true" />
              <SidePanel />
            </div>
          </div>
        )}
        {chrome && (
          <>
            <ReviewRail />
            <LinkPopover />
            <ContextMenu />
            <Dialogs />
            {hfMenu && <HeaderFooterMenu at={hfMenu.at} pageIndex={hfMenu.pageIndex} onClose={ui.closeHeaderFooterMenu} />}
            {toast && <Toast message={toast} />}
            <RestoreBanner restore={state.restore} />
          </>
        )}
      </UIContext.Provider>
    </div>
  );
}
