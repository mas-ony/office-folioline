<script setup lang="ts">
/** Round button that opens the navigation pane. */
import { TextAlignStart } from '@lucide/vue';
import { useT, useUI } from './context';

const t = useT();
const { ui, state } = useUI();
</script>

<template>
  <button v-if="!state.navOpen" type="button" class="fl-nav-toggle" :aria-label="t('nav.open')" :title="t('nav.open')" data-testid="nav-open" @click="ui.setNavOpen(true)">
    <TextAlignStart :size="18" />
  </button>
</template>
