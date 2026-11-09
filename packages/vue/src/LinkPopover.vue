<script setup lang="ts">
/** Address of the link at the caret with copy, edit, remove and open. */
import { keepFocus, linkRange, removeLink } from '@folioline/core/views';
import { Copy, ExternalLink, Pencil, Unlink } from '@lucide/vue';
import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue';
import { useSnapshot, useT, useUI } from './context';

const t = useT();
const { ui, editor, layer, state } = useUI();
const href = useSnapshot((s) => (s.cursor?.textSelected ? null : s.cursor?.link ?? null));
const stream = useSnapshot((s) => s.stream);
const pos = shallowRef<{ left: number; top: number } | null>(null);
const focused = ref(false);

const onFocus = () => (focused.value = editor.activeView.hasFocus());
onMounted(() => {
  document.addEventListener('focusin', onFocus);
  document.addEventListener('focusout', onFocus);
});
onUnmounted(() => {
  document.removeEventListener('focusin', onFocus);
  document.removeEventListener('focusout', onFocus);
});

// Under the link's start; hidden once the pages scroll.
watch([href, stream], ([h], _, onCleanup) => {
  if (!h) {
    pos.value = null;
    return;
  }
  const v = editor.activeView;
  const r = linkRange(v.state);
  if (!r) return;
  try {
    const c = v.coordsAtPos(r.from);
    pos.value = { left: Math.max(8, Math.min(c.left, window.innerWidth - 340)), top: c.bottom + 6 };
  } catch {
    pos.value = null;
  }
  const hide = () => (pos.value = null);
  editor.scrollEl.addEventListener('scroll', hide, { passive: true, once: true });
  onCleanup(() => editor.scrollEl.removeEventListener('scroll', hide));
}, { immediate: true, flush: 'post' });

/** The link shown, read from the editor and the focus whenever the popover would render. */
const link = computed(() => {
  void stream.value;
  if (!href.value || !pos.value || state.value.modal || (!focused.value && !document.activeElement?.closest('.fl-linkpop'))) return null;
  const h = href.value;
  const mark = linkRange(editor.activeView.state)?.mark;
  return { href: h, internal: !!mark?.attrs.anchor && !mark?.attrs.href, external: /^(https?:|mailto:)/i.test(h), ro: editor.readOnly, ...pos.value };
});
const copy = async (h: string) => {
  try {
    if (!navigator.clipboard?.writeText) throw new Error('clipboard');
    await navigator.clipboard.writeText(h);
    ui.toast(t('link.copied'));
  } catch {
    ui.toast(t('context.copyBlocked', { shortcut: 'Ctrl+C' }));
  }
};
const remove = () => {
  removeLink(editor.activeView);
  editor.focus();
};
</script>

<template>
  <Teleport v-if="link" :to="layer">
    <div class="fl-linkpop" :style="{ left: `${link.left}px`, top: `${link.top}px` }" role="dialog" :aria-label="t('link.editTitle')" data-testid="link-popover" @mousedown="keepFocus">
      <span v-if="link.internal" class="fl-linkpop-url">{{ t('link.internal') }}</span>
      <a v-else-if="link.external" class="fl-linkpop-url" :href="link.href" target="_blank" rel="noopener noreferrer" :title="t('link.open')">{{ link.href }}</a>
      <span v-else class="fl-linkpop-url">{{ link.href }}</span>
      <span class="fl-linkpop-actions">
        <button v-if="!link.internal" type="button" class="fl-icon-btn is-small" :aria-label="t('link.copy')" :title="t('link.copy')" @click="copy(link.href)"><Copy :size="15" /></button>
        <button v-if="!link.ro" type="button" class="fl-icon-btn is-small" :aria-label="t('link.edit')" :title="t('link.edit')" data-testid="link-edit" @click="ui.openModal('link')"><Pencil :size="15" /></button>
        <button v-if="!link.ro" type="button" class="fl-icon-btn is-small" :aria-label="t('link.remove')" :title="t('link.remove')" data-testid="link-remove" @click="remove"><Unlink :size="15" /></button>
        <a v-if="link.external" class="fl-icon-btn is-small" :href="link.href" target="_blank" rel="noopener noreferrer" :aria-label="t('link.open')" :title="t('link.open')"><ExternalLink :size="15" /></a>
      </span>
    </div>
  </Teleport>
</template>
