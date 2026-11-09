<script setup lang="ts">
import { cx, displayStyleName, keepFocus, setParagraphStyle } from '@folioline/core/views';
import { computed, type CSSProperties } from 'vue';
import { useSnapshot, useT, useUI } from '../context';
import Dropdown from './Dropdown.vue';
import Labelled from './Labelled.vue';
import { useCursor, useReadOnly, type Variant } from './types';

defineProps<{ variant: Variant }>();
const t = useT();
const { editor } = useUI();
const cursor = useCursor();
const ro = useReadOnly();
const stylesVersion = useSnapshot((s) => s.stylesVersion);
const styles = computed(() => {
  void stylesVersion.value;
  void cursor.value;
  return editor.docx.styles.paragraphStyleList();
});
const cur = computed(() => cursor.value?.styleId ?? 'Normal');
const curLabel = computed(() => styles.value.find((s) => s.id === cur.value)?.label ?? displayStyleName(editor.docx.styles.get(cur.value)?.name ?? cur.value));

/** Each style's name is shown in its own look. */
function sample(id: string): CSSProperties {
  const eff = editor.docx.styles.effectiveRun(id, null, {});
  const size = Math.min(22, Math.max(12, (eff.size ?? 22) / 2));
  return { fontSize: `${size}px`, fontWeight: eff.bold ? 700 : 400, fontStyle: eff.italic ? 'italic' : undefined, color: eff.color?.val && eff.color.val !== 'auto' ? `#${eff.color.val}` : undefined };
}
function pick(id: string, close: () => void) {
  close();
  setParagraphStyle(editor.activeView, editor.docx, id);
  editor.focus();
}
</script>

<template>
  <Labelled :label="t('toolbar.paragraphStyle')" :variant="variant">
    <Dropdown :label="t('toolbar.style')" :text="curLabel" :disabled="ro" test-id="tb-style" data-slot="styles.style" button-class="fl-picker is-style">
      <template #default="{ close }">
        <div class="fl-listbox fl-style-list" role="listbox" :aria-label="t('toolbar.style')">
          <button
            v-for="s in styles"
            :key="s.id"
            type="button"
            role="option"
            :aria-selected="s.id === cur"
            :aria-label="s.label"
            :class="cx('fl-option', s.id === cur && 'is-selected')"
            :data-testid="`style-${s.id}`"
            @mousedown="keepFocus"
            @click="pick(s.id, close)"
          >
            <span :style="sample(s.id)">{{ s.label }}</span>
          </button>
        </div>
      </template>
    </Dropdown>
  </Labelled>
</template>
