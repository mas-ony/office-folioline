<script setup lang="ts">
import type { MessageKey } from '@folioline/core';
import { computed } from 'vue';
import Modal from '../controls/Modal.vue';
import { useT, useUI } from '../context';

const t = useT();
const { ui, state } = useUI();
const info = computed(() => {
  const data = state.value.modalData;
  const reason = (data.reason as string) ?? 'unknown';
  return {
    key: (reason === 'legacy' ? 'openFailure.legacy' : `openFailure.${reason}`) as MessageKey,
    name: (data.name as string) ?? '',
    code: (data.code as string) ?? 'open.unknown',
  };
});
</script>

<template>
  <Modal :title="t('openFailure.title')" test-id="open-failure-dialog" @close="ui.openModal(null)">
    <p>{{ t(info.key, { name: info.name }) }}</p>
    <p class="fl-note">{{ t('openFailure.code', { code: info.code }) }}</p>
    <template #footer><button type="button" class="fl-btn is-primary" @click="ui.openModal(null)">{{ t('common.close') }}</button></template>
  </Modal>
</template>
