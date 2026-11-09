<script setup lang="ts">
/** Starting a live session, or the one going on: its link, QR code and the people in it. */
import { collabStatusKey, cx, qrSvg } from '@folioline/core/views';
import { Copy, LogOut, Radio } from '@lucide/vue';
import { computed, ref } from 'vue';
import Avatar from './controls/Avatar.vue';
import { useT, useUI } from './context';

const t = useT();
const { ui, state } = useUI();
const starting = ref(false);
const invite = ref<HTMLInputElement | null>(null);
const link = computed(() => state.value.collab?.link);
const qr = computed(() => (link.value ? qrSvg(link.value) : ''));
const start = async () => {
  starting.value = true;
  try {
    await ui.startSession();
  } finally {
    starting.value = false;
  }
};
const copy = async () => {
  try {
    if (!navigator.clipboard?.writeText) throw new Error('clipboard');
    await navigator.clipboard.writeText(state.value.collab!.link);
    ui.toast(t('settings.inviteCopied'));
  } catch {
    invite.value?.select();
    ui.toast(t('settings.inviteCopyFailed'));
  }
};
</script>

<template>
  <template v-if="!state.collab">
    <p class="fl-note">{{ t('settings.collabIntro') }}</p>
    <p v-if="!state.relay" class="fl-note is-warn">{{ t('settings.collabNoRelay') }}</p>
    <button type="button" class="fl-btn is-dark is-block" :disabled="!state.relay || starting" data-testid="start-session" @click="start">
      <Radio :size="16" /> {{ starting ? t('settings.starting') : t('settings.startSession') }}
    </button>
  </template>
  <div v-else class="fl-session" data-testid="session-box">
    <div :class="cx('fl-session-status', `is-${state.collab.status}`)" role="status">
      <span class="fl-dot" aria-hidden="true" />{{ t(collabStatusKey(state.collab.status)) }}
    </div>
    <div class="fl-invite">
      <input ref="invite" class="fl-input" readonly :value="state.collab.link" :aria-label="t('settings.copyInvite')" data-testid="invite-link" @focus="($event.target as HTMLInputElement).select()" />
      <button type="button" class="fl-btn is-small" data-testid="copy-invite" @click="copy"><Copy :size="14" /> {{ t('settings.copyInvite') }}</button>
    </div>
    <div v-if="qr" class="fl-qr" role="img" :aria-label="t('settings.qr')" :title="t('settings.qr')" v-html="qr" />
    <div class="fl-subhead">{{ t('settings.inSession') }}</div>
    <ul class="fl-people-list">
      <li v-for="p in state.collab.participants" :key="p.clientID"><Avatar :name="p.name" :color="p.color" size="sm" /> {{ p.name }}{{ p.self ? ` (${t('settings.you')})` : '' }}</li>
    </ul>
    <button type="button" class="fl-btn is-small" data-testid="leave-session" @click="ui.leaveSession()"><LogOut :size="14" /> {{ t('settings.leave') }}</button>
  </div>
</template>
