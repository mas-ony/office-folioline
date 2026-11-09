<script setup lang="ts">
import { applyLink, linkRange, linkUrl, removeLink } from '@folioline/core/views';
import { ref } from 'vue';
import Modal from '../controls/Modal.vue';
import Row from '../controls/Row.vue';
import { useT, useUI } from '../context';
import { vValue } from '../directives';

const t = useT();
const { ui, editor } = useUI();
const v = editor.activeView;
const existing = linkRange(v.state);
const sel = v.state.selection;
const text = ref(existing ? v.state.doc.textBetween(existing.from, existing.to) : v.state.doc.textBetween(sel.from, sel.to, ' '));
const href = ref<string>(existing?.mark.attrs.href || (existing?.mark.attrs.anchor ? `#${existing.mark.attrs.anchor}` : ''));
const close = () => ui.openModal(null);
const apply = () => {
  if (!href.value.trim()) return;
  const url = linkUrl(href.value);
  if (!url) {
    ui.toast(t('link.invalid'));
    return;
  }
  applyLink(v, editor.docx, url, text.value.trim() || undefined);
  close();
  editor.focus();
};
const remove = () => {
  removeLink(v);
  close();
  editor.focus();
};
</script>

<template>
  <Modal :title="existing ? t('link.editTitle') : t('link.insertTitle')" test-id="link-dialog" @close="close">
    <Row :label="t('link.text')" html-for="link-text"><input id="link-text" v-value="text" class="fl-input" :placeholder="t('link.text')" data-testid="link-text" @input="text = ($event.target as HTMLInputElement).value" /></Row>
    <Row :label="t('link.url')" html-for="link-url"><input id="link-url" v-value="href" class="fl-input" placeholder="https://example.com" data-autofocus="true" data-testid="link-url" @input="href = ($event.target as HTMLInputElement).value" @keydown="(e) => e.key === 'Enter' && apply()" /></Row>
    <template v-if="existing" #leftFooter><button type="button" class="fl-btn" data-testid="link-remove-btn" @click="remove">{{ t('link.remove') }}</button></template>
    <template #footer>
      <button type="button" class="fl-btn" @click="close">{{ t('common.cancel') }}</button>
      <button type="button" class="fl-btn is-primary" :disabled="!href.trim()" data-testid="link-apply" @click="apply">{{ t('common.apply') }}</button>
    </template>
  </Modal>
</template>
