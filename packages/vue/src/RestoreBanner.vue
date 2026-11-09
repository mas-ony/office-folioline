<script setup lang="ts">
/** Unsaved work found by autosave, offered for recovery. */
import { useT, useUI } from './context';

const t = useT();
const { ui, layer, state } = useUI();
</script>

<template>
  <Teleport v-if="state.restore" :to="layer">
    <div class="fl-restore" role="alertdialog" :aria-label="t('app.recoverAction')" data-testid="restore-banner">
      <span>{{ t('app.recover', { name: state.restore.fileName, time: new Date(state.restore.savedAt).toLocaleString() }) }}</span>
      <button type="button" class="fl-btn is-primary is-small" @click="ui.recover()">{{ t('app.recoverAction') }}</button>
      <button type="button" class="fl-btn is-small" @click="ui.discardRecovery()">{{ t('common.dismiss') }}</button>
    </div>
  </Teleport>
</template>
