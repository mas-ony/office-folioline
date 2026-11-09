<script setup lang="ts">
import { selectedImage, setImageProps } from '@folioline/core/views';
import { ref } from 'vue';
import Modal from '../controls/Modal.vue';
import Row from '../controls/Row.vue';
import { useT, useUI } from '../context';
import { vValue } from '../directives';

const t = useT();
const { ui, editor } = useUI();
const img = selectedImage(editor.activeView.state);
const title = ref<string>(img?.node.attrs.title ?? '');
const alt = ref<string>(img?.node.attrs.alt ?? '');
const close = () => ui.openModal(null);
const apply = () => {
  if (!img) return;
  setImageProps(editor.activeView, img.pos, { title: title.value, alt: alt.value });
  close();
  editor.focus();
};
</script>

<template>
  <Modal v-if="img" :title="t('image.altText')" test-id="alt-text-dialog" @close="close">
    <Row :label="t('imageProps.altTitle')" html-for="alt-title"><input id="alt-title" v-value="title" class="fl-input" @input="title = ($event.target as HTMLInputElement).value" /></Row>
    <Row :label="t('imageProps.description')" html-for="alt-desc"><textarea id="alt-desc" v-value="alt" class="fl-input" rows="4" :placeholder="t('imageProps.descriptionPlaceholder')" data-testid="alt-description" @input="alt = ($event.target as HTMLTextAreaElement).value" /></Row>
    <template #footer>
      <button type="button" class="fl-btn" @click="close">{{ t('common.cancel') }}</button>
      <button type="button" class="fl-btn is-primary" data-testid="alt-apply" @click="apply">{{ t('common.apply') }}</button>
    </template>
  </Modal>
</template>
