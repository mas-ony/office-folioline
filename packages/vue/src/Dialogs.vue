<script setup lang="ts">
/** The open dialog. */
import type { ModalName } from '@folioline/core';
import { type Component, computed, markRaw } from 'vue';
import { useUI } from './context';
import AboutDialog from './dialogs/AboutDialog.vue';
import AltTextDialog from './dialogs/AltTextDialog.vue';
import BookmarkDialog from './dialogs/BookmarkDialog.vue';
import ImagePropertiesDialog from './dialogs/ImagePropertiesDialog.vue';
import LinkDialog from './dialogs/LinkDialog.vue';
import NoteDialog from './dialogs/NoteDialog.vue';
import OpenFailureDialog from './dialogs/OpenFailureDialog.vue';
import PageSetupDialog from './dialogs/PageSetupDialog.vue';
import ParagraphDialog from './dialogs/ParagraphDialog.vue';
import ReportDialog from './dialogs/ReportDialog.vue';
import ShortcutsDialog from './dialogs/ShortcutsDialog.vue';
import SplitCellDialog from './dialogs/SplitCellDialog.vue';
import TextBoxDialog from './dialogs/TextBoxDialog.vue';
import TrackOptionsDialog from './dialogs/TrackOptionsDialog.vue';
import WatermarkDialog from './dialogs/WatermarkDialog.vue';

const DIALOGS: Partial<Record<NonNullable<ModalName>, Component>> = markRaw({
  pageSetup: PageSetupDialog,
  paragraph: ParagraphDialog,
  watermark: WatermarkDialog,
  trackOptions: TrackOptionsDialog,
  bookmark: BookmarkDialog,
  imageProps: ImagePropertiesDialog,
  altText: AltTextDialog,
  link: LinkDialog,
  splitCell: SplitCellDialog,
  note: NoteDialog,
  textBox: TextBoxDialog,
  report: ReportDialog,
  shortcuts: ShortcutsDialog,
  about: AboutDialog,
  openFailure: OpenFailureDialog,
});

const { state } = useUI();
const dialog = computed(() => (state.value.modal ? DIALOGS[state.value.modal] : undefined));
</script>

<template>
  <component :is="dialog" v-if="dialog" :key="state.modal" />
</template>
