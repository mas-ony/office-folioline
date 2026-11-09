<script setup lang="ts">
import {
  type ColorScheme,
  cx,
  type DocumentInput,
  type DocxEditorRef,
  type EditorSnapshot,
  type Example,
  type FileActions,
  type FoliolineOptions,
  FoliolineUI,
  type Locale,
  rootClassOf,
  type UserInfo,
} from '@folioline/core/views';
import { computed, onMounted, onUnmounted, type PropType, provide, ref, shallowRef, watch } from 'vue';
import ContextMenu from './ContextMenu.vue';
import { type UIContext, UI_KEY } from './context';
import Toast from './controls/Toast.vue';
import Dialogs from './Dialogs.vue';
import FormatBar from './FormatBar.vue';
import HeaderFooterMenu from './HeaderFooterMenu.vue';
import LinkPopover from './LinkPopover.vue';
import NavigationPane from './nav/NavigationPane.vue';
import NavToggle from './NavToggle.vue';
import PageChip from './PageChip.vue';
import RestoreBanner from './RestoreBanner.vue';
import ReviewRail from './review/ReviewRail.vue';
import Ruler from './Ruler.vue';
import SidePanel from './SidePanel.vue';
import TitleBar from './TitleBar.vue';
import VRuler from './VRuler.vue';
import ZoomBar from './ZoomBar.vue';

/** The complete editor: title bar, toolbar, document, review panel, menus and dialogs. */
defineOptions({ name: 'FoliolineEditor' });

// The options of FoliolineOptions; its callbacks are the events below.
const props = defineProps({
  /** Opened at start, and again whenever it changes. */
  document: { type: null as unknown as PropType<DocumentInput>, default: undefined },
  /** Documents for File › Examples; without any, the menu has no Examples. */
  examples: { type: Array as PropType<Example[]>, default: undefined },
  /** Interface language; by default the stored one or the browser's. */
  locale: { type: String as PropType<Locale>, default: undefined },
  /** Shown on comments and tracked changes; by default the stored name or a generated one. */
  user: { type: Object as PropType<UserInfo>, default: undefined },
  colorScheme: { type: String as PropType<ColorScheme>, default: undefined },
  /** Keeps the reader's settings in localStorage under `<storageKey>-…`. */
  storageKey: { type: String, default: undefined },
  /** Keeps unsaved changes in an IndexedDB database of this name and offers to recover them. */
  autosave: { type: String, default: undefined },
  /** With `autosave`: offer to recover unsaved changes at start (by default when no document or room is given). */
  offerRecovery: { type: Boolean, default: undefined },
  /** Base URL of the live-session relay (default `/collab`, served by @folioline/relay). */
  relay: { type: String, default: undefined },
  /** Link that opens a live session; by default this page with `?room=<id>`. */
  shareLink: { type: Function as PropType<(room: string) => string>, default: undefined },
  /** Join this live session at start. */
  room: { type: String, default: undefined },
  /** Replace some of the built-in file actions (Open, Save, Export, Print…). */
  files: { type: Object as PropType<Partial<FileActions>>, default: undefined },
  /** Handle Ctrl+F and Ctrl+Shift+E anywhere on the page, not only inside the editor. */
  globalShortcuts: { type: Boolean, default: undefined },
});

const emit = defineEmits<{
  /** The editor is ready and the initial document (or live session) has opened. */
  ready: [editor: DocxEditorRef, ui: FoliolineUI];
  /** The reader changed their name in Settings (`v-model:user`). */
  'update:user': [user: UserInfo];
  /** The reader picked another interface language (`v-model:locale`). */
  'update:locale': [locale: Locale];
  /** The reader picked another appearance (`v-model:color-scheme`). */
  'update:colorScheme': [scheme: ColorScheme];
}>();

function options(): FoliolineOptions {
  return {
    ...props,
    onReady: (editor, ui) => emit('ready', editor, ui),
    onUserChange: (user) => emit('update:user', user),
    onLocaleChange: (locale) => emit('update:locale', locale),
    onColorSchemeChange: (scheme) => emit('update:colorScheme', scheme),
  };
}

// The first props create the interface; later ones are passed on.
const ui = new FoliolineUI(options());
const opts = shallowRef(options());
watch(() => ({ ...props }), () => {
  opts.value = options();
  ui.setOptions(opts.value);
});

const state = shallowRef(ui.getState());
const offState = ui.subscribe(() => {
  state.value = ui.getState();
});
const snapshot = shallowRef(null as unknown as EditorSnapshot);
const ctx: UIContext = { ui, state, snapshot, editor: null!, store: null!, layer: null!, options: opts };
provide(UI_KEY, ctx);

const root = ref<HTMLDivElement | null>(null);
const host = ref<HTMLDivElement | null>(null);
// The editor exists (the parts below need it).
const attached = ref(false);
let offSnapshot = () => {};

onMounted(() => {
  ui.attach({ root: root.value!, host: host.value! });
  const store = ui.store!;
  ctx.editor = ui.editor!;
  ctx.store = store;
  ctx.layer = ui.layer!;
  snapshot.value = store.getSnapshot();
  offSnapshot = store.subscribe(() => {
    snapshot.value = store.getSnapshot();
  });
  attached.value = true;
});

onUnmounted(() => {
  offSnapshot();
  offState();
  ui.detach();
});

// The interface shows once the strings of its language have loaded.
const chrome = computed(() => attached.value && state.value.i18nReady);
const print = computed(() => chrome.value && snapshot.value.viewMode === 'print');
const rulers = computed(() => print.value && state.value.rulersOn && !state.value.mobile);
</script>

<template>
  <div ref="root" :class="rootClassOf(state)" :dir="state.rtl ? 'rtl' : 'ltr'" :lang="state.locale" data-testid="app">
    <TitleBar v-if="chrome" />
    <div class="fl-workspace">
      <section :class="cx('fl-docpane', chrome && state.navOpen && 'has-nav', chrome && state.railOpen && !state.mobile && 'has-rail', chrome && state.rulersOn && !state.mobile && 'has-rulers')" aria-label="Document" data-testid="docpane">
        <FormatBar v-if="chrome" />
        <div class="fl-stage">
          <Ruler v-if="rulers" />
          <div class="fl-stage-row">
            <VRuler v-if="rulers" />
            <div ref="host" class="fl-doc-host" data-testid="doc-host" />
          </div>
          <template v-if="chrome">
            <NavToggle />
            <NavigationPane v-if="state.navOpen" />
            <ZoomBar v-if="print" />
            <PageChip />
          </template>
        </div>
      </section>
      <SidePanel v-if="chrome && state.panelOpen && !state.mobile" />
    </div>
    <div v-if="chrome && state.mobile && state.panelOpen" class="fl-sheet-backdrop" @pointerdown.self="ui.setPanelOpen(false)">
      <div class="fl-sheet is-panel" role="dialog" :aria-label="state.t('panel.label')">
        <div class="fl-sheet-grip" aria-hidden="true" />
        <SidePanel />
      </div>
    </div>
    <template v-if="chrome">
      <ReviewRail />
      <LinkPopover />
      <ContextMenu />
      <Dialogs />
      <HeaderFooterMenu v-if="state.hfMenu" :at="state.hfMenu.at" :page-index="state.hfMenu.pageIndex" @close="ui.closeHeaderFooterMenu()" />
      <Toast v-if="state.toast" :message="state.toast" />
      <RestoreBanner />
    </template>
  </div>
</template>
