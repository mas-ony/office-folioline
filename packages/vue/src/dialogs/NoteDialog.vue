<script setup lang="ts">
import { computed, ref } from 'vue';
import Modal from '../controls/Modal.vue';
import { useT, useUI } from '../context';
import { vFocus, vValue } from '../directives';

const t = useT();
const { ui, editor, state } = useUI();
const key = computed(() => state.value.modalData.key as string | undefined);
const kind = computed(() => (state.value.modalData.kind as 'footnote' | 'endnote' | undefined) ?? (key.value?.startsWith('endnote:') ? 'endnote' : 'footnote'));
const text = ref(key.value ? editor.noteText(key.value) : '');
const close = () => ui.openModal(null);
const save = () => {
  if (key.value) editor.setNoteText(key.value, text.value);
  else editor.insertNote(kind.value, text.value);
  close();
  editor.focus();
};
const title = computed(() => (key.value ? t(kind.value === 'endnote' ? 'note.editEndnote' : 'note.editFootnote') : t(kind.value === 'endnote' ? 'note.insertEndnote' : 'note.insertFootnote')));
const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) save();
};
</script>

<template>
  <Modal :title="title" test-id="note-dialog" @close="close">
    <label class="fl-field-label" for="note-text">{{ t('note.text') }}</label>
    <textarea id="note-text" v-value="text" v-focus class="fl-input" rows="4" data-testid="note-text" @input="text = ($event.target as HTMLTextAreaElement).value" @keydown="onKey" />
    <p v-if="!key" class="fl-note">{{ t('note.hint') }}</p>
    <template #footer>
      <button type="button" class="fl-btn" @click="close">{{ t('common.cancel') }}</button>
      <button type="button" class="fl-btn is-primary" data-testid="note-save" @click="save">{{ key ? t('common.save') : t('common.insert') }}</button>
    </template>
  </Modal>
</template>
