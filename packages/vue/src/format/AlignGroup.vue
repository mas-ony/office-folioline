<script setup lang="ts">
import { ALIGNS, cx, keepFocus, shortcut } from '@folioline/core/views';
import { computed } from 'vue';
import { useCommands, useT } from '../context';
import Icon from '../Icon.vue';
import Dropdown from './Dropdown.vue';
import Labelled from './Labelled.vue';
import { ICON, useCursor, useReadOnly, type Variant } from './types';

defineProps<{ variant: Variant }>();
const t = useT();
const cmd = useCommands();
const cursor = useCursor();
const ro = useReadOnly();
const cur = computed(() => ALIGNS.find((a) => a.value === (cursor.value?.align ?? 'left')) ?? ALIGNS[0]);
const pick = (a: (typeof ALIGNS)[number], close: () => void) => {
  close();
  cmd[a.cmd]();
};
</script>

<template>
  <Labelled :label="t('toolbar.alignment')" :variant="variant">
    <Dropdown :label="t(cur.key)" :disabled="ro" test-id="tb-align" data-slot="alignment">
      <template #icon><Icon :name="cur.icon" :size="ICON" /></template>
      <template #default="{ close }">
        <div class="fl-icon-row" role="group" :aria-label="t('toolbar.alignment')">
          <button v-for="a in ALIGNS" :key="a.value" type="button" :class="cx('fl-tool', a.value === cur.value && 'is-active')" :aria-label="t(a.key)" :title="`${t(a.key)} (${shortcut(a.sc)})`" :aria-pressed="a.value === cur.value" :data-testid="`align-${a.value}`" @mousedown="keepFocus" @click="pick(a, close)">
            <Icon :name="a.icon" :size="ICON" />
          </button>
        </div>
      </template>
    </Dropdown>
  </Labelled>
</template>
