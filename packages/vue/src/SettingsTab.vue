<script setup lang="ts">
import { LOCALES, type Locale } from '@folioline/core';
import { cx, keepFocus } from '@folioline/core/views';
import { BookOpen, Bug, Info, Keyboard, Moon, Sun } from '@lucide/vue';
import { computed, ref, watch } from 'vue';
import Check from './controls/Check.vue';
import { useCommands, useT, useUI } from './context';
import { vValue } from './directives';
import SessionBox from './SessionBox.vue';

const t = useT();
const { ui, state } = useUI();
const cmd = useCommands();
const userName = computed(() => state.value.user.name);
const name = ref(userName.value);
watch(userName, (n) => (name.value = n));
const commitName = () => {
  const v = name.value.trim();
  if (v && v !== userName.value) ui.setUser({ name: v });
  else name.value = userName.value;
};
</script>

<template>
  <div class="fl-panel-body fl-settings" data-testid="settings-tab">
    <section>
      <h3 class="fl-section-title">{{ t('settings.collaboration') }}</h3>
      <label class="fl-field-label" for="fl-user-name">{{ t('settings.yourName') }}</label>
      <input
        id="fl-user-name"
        v-value="name"
        class="fl-input"
        :placeholder="t('settings.yourName')"
        aria-describedby="fl-user-note"
        data-testid="user-name"
        @input="name = ($event.target as HTMLInputElement).value"
        @blur="commitName"
        @keydown="(e) => e.key === 'Enter' && commitName()"
      />
      <p id="fl-user-note" class="fl-note">{{ t('settings.yourNameNote') }}</p>
      <SessionBox />
    </section>
    <section>
      <h3 class="fl-section-title">{{ t('settings.appearance') }}</h3>
      <div class="fl-segmented is-wide" role="radiogroup" :aria-label="t('settings.theme')">
        <button type="button" role="radio" :aria-checked="state.scheme === 'light'" :class="cx(state.scheme === 'light' && 'is-on')" data-testid="scheme-light" @mousedown="keepFocus" @click="ui.setScheme('light')"><Sun :size="15" /> {{ t('settings.light') }}</button>
        <button type="button" role="radio" :aria-checked="state.scheme === 'dark'" :class="cx(state.scheme === 'dark' && 'is-on')" data-testid="scheme-dark" @mousedown="keepFocus" @click="ui.setScheme('dark')"><Moon :size="15" /> {{ t('settings.dark') }}</button>
      </div>
      <Check v-if="!state.mobile" :label="t('settings.rulers')" :checked="state.rulersOn" test-id="show-rulers" @change="ui.setRulersOn" />
    </section>
    <section>
      <h3 class="fl-section-title"><label for="fl-locale">{{ t('settings.language') }}</label></h3>
      <select id="fl-locale" v-value="state.locale" class="fl-input" data-testid="locale" @change="ui.setLocale(($event.target as HTMLSelectElement).value as Locale)">
        <option v-for="l in LOCALES" :key="l.id" :value="l.id">{{ l.id === 'en' ? l.native : `${l.native} · ${l.english}` }}</option>
      </select>
      <p class="fl-note">{{ t('settings.languageNote') }}</p>
    </section>
    <section>
      <h3 class="fl-section-title">{{ t('settings.learnMore') }}</h3>
      <ul class="fl-links">
        <li><button type="button" class="fl-link" @click="cmd.shortcuts()"><Keyboard :size="15" /> {{ t('menu.shortcuts') }}</button></li>
        <li><button type="button" class="fl-link" @click="cmd.about()"><Info :size="15" /> {{ t('menu.about') }}</button></li>
        <li><button type="button" class="fl-link" @click="cmd.reportIssue()"><Bug :size="15" /> {{ t('menu.reportIssue') }}</button></li>
        <li><button type="button" class="fl-link" @click="cmd.navigation('headings')"><BookOpen :size="15" /> {{ t('menu.navigation') }}</button></li>
      </ul>
    </section>
  </div>
</template>
