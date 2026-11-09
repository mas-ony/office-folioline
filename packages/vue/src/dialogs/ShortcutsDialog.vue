<script setup lang="ts">
import { isMac, shortcut, SHORTCUT_LIST } from '@folioline/core/views';
import Modal from '../controls/Modal.vue';
import { useT, useUI } from '../context';

const t = useT();
const { ui } = useUI();
</script>

<template>
  <Modal :title="t('shortcuts.title')" test-id="shortcuts-dialog" @close="ui.openModal(null)">
    <table class="fl-shortcuts">
      <tbody>
        <tr v-for="[k, d] in SHORTCUT_LIST" :key="k"><td><kbd>{{ isMac ? shortcut(k) : k }}</kbd></td><td>{{ t(d) }}</td></tr>
      </tbody>
    </table>
  </Modal>
</template>
