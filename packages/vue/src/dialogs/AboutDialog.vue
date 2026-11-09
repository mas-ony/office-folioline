<script setup lang="ts">
import { ABOUT_VERSION } from '@folioline/core/views';
import Modal from '../controls/Modal.vue';
import { useT, useUI } from '../context';

const t = useT();
const { ui } = useUI();
</script>

<template>
  <Modal :title="t('about.title')" test-id="about-dialog" @close="ui.openModal(null)">
    <p>{{ t('about.body') }}</p>
    <p class="fl-note">{{ ABOUT_VERSION }}</p>
  </Modal>
</template>
