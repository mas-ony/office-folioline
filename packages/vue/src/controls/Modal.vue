<script setup lang="ts">
/** A dialog: focus kept inside, Escape and the backdrop close it. */
import { cx, trapFocus } from '@folioline/core/views';
import { X } from '@lucide/vue';
import { ref, watchPostEffect } from 'vue';
import { useUI } from '../context';

const props = withDefaults(defineProps<{ title: string; open?: boolean; testId?: string; wide?: boolean; panelClass?: string }>(), { open: true, testId: undefined, panelClass: undefined });
const emit = defineEmits<{ close: [] }>();

const { layer } = useUI();
const el = ref<HTMLElement | null>(null);
watchPostEffect((onCleanup) => {
  if (!props.open) return;
  onCleanup(trapFocus(el.value, () => emit('close')));
});
</script>

<template>
  <Teleport v-if="open" :to="layer">
    <div class="fl-modal-backdrop" @pointerdown.self="emit('close')">
      <div ref="el" :class="cx('fl-modal', wide && 'is-wide', panelClass)" role="dialog" aria-modal="true" :aria-label="title" :data-testid="testId">
        <div class="fl-modal-head">
          <h2>{{ title }}</h2>
          <button type="button" class="fl-icon-btn fl-modal-close" aria-label="Close" @click="emit('close')"><X :size="18" /></button>
        </div>
        <div class="fl-modal-body"><slot /></div>
        <div v-if="$slots.footer || $slots.leftFooter" class="fl-modal-foot">
          <div v-if="$slots.leftFooter" class="fl-modal-foot-left"><slot name="leftFooter" /></div>
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>
