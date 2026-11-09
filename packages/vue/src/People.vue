<script setup lang="ts">
/** The people in the live session (from two on). */
import { computed, ref } from 'vue';
import { useAuthorColor, useT, useUI } from './context';
import Avatar from './controls/Avatar.vue';
import Popover from './controls/Popover.vue';

const t = useT();
const { state } = useUI();
const authorColor = useAuthorColor();
const anchor = ref<HTMLButtonElement | null>(null);
const open = ref(false);
const list = computed(() => state.value.collab?.participants ?? []);
</script>

<template>
  <template v-if="list.length >= 2">
    <button ref="anchor" type="button" class="fl-people" :aria-label="t('title.people')" :title="t('title.people')" data-testid="people" @click="open = !open">
      <Avatar v-for="p in list.slice(0, 3)" :key="p.clientID" :name="p.name" :color="p.color || authorColor(p.name)" size="sm" />
      <span v-if="list.length > 3" class="fl-people-more">+{{ list.length - 3 }}</span>
    </button>
    <Popover :anchor="anchor" :open="open" align="end" :title="t('title.people')" @close="open = false">
      <ul class="fl-people-list">
        <li v-for="p in list" :key="p.clientID"><Avatar :name="p.name" :color="p.color" size="sm" /> {{ p.name }}{{ p.self ? ` (${t('settings.you')})` : '' }}</li>
      </ul>
    </Popover>
  </template>
</template>
