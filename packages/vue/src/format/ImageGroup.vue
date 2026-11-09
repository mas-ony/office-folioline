<script setup lang="ts">
import { selectedImage, transformEntries, wrapEntries, wrapKind, wrapLabelKey } from '@folioline/core/views';
import { ChevronDown, Image as ImageIcon, RotateCw, ScanText, Settings2, TextWrap } from '@lucide/vue';
import { computed } from 'vue';
import { useSnapshot, useT, useUI } from '../context';
import MenuButton from '../MenuButton.vue';
import Labelled from './Labelled.vue';
import Tool from './Tool.vue';
import { ICON, useReadOnly, type Variant } from './types';

defineProps<{ variant: Variant }>();
const t = useT();
const { ui, editor } = useUI();
const ro = useReadOnly();
const version = useSnapshot((s) => s.version);
const img = computed(() => {
  void version.value;
  return selectedImage(editor.activeView.state);
});
const kind = computed(() => wrapKind(img.value?.node.attrs.anchor ?? null));
</script>

<template>
  <Tool :variant="variant" :label="t('toolbar.image')" :title="t('image.insertDisabled')" disabled test-id="tb-image-insert" data-slot="image.insert"><ImageIcon :size="ICON" /></Tool>
  <Tool :variant="variant" :label="t('image.properties')" :disabled="ro || !img" test-id="tb-image-props" data-slot="image.properties" @click="ui.openModal('imageProps')"><Settings2 :size="ICON" /></Tool>
  <Labelled :label="t('image.wrap')" :variant="variant">
    <MenuButton :label="t('image.wrap')" :title="t('image.wrapTitle', { label: t(wrapLabelKey(kind)) })" button-class="fl-tool fl-tool-drop" test-id="tb-image-wrap" :disabled="ro || !img" :entries="() => wrapEntries(ui)" :menu-label="t('image.wrap')">
      <TextWrap :size="ICON" />
      <ChevronDown :size="12" class="fl-caret" />
    </MenuButton>
  </Labelled>
  <Tool :variant="variant" :label="t('image.altText')" :disabled="ro || !img" test-id="tb-alt-text" data-slot="image.alt" @click="ui.openModal('altText')"><ScanText :size="ICON" /></Tool>
  <Labelled :label="t('image.transform')" :variant="variant">
    <MenuButton :label="t('image.transform')" button-class="fl-tool fl-tool-drop" test-id="tb-image-transform" :disabled="ro || !img" :entries="() => transformEntries(ui)">
      <RotateCw :size="ICON" />
      <ChevronDown :size="12" class="fl-caret" />
    </MenuButton>
  </Labelled>
</template>
