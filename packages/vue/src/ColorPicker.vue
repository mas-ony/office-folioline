<script setup lang="ts">
/** Font colour: Automatic, theme colours with tints and shades, standard colours, custom. */
import { type DocxDocument, keepFocus, STANDARD_COLORS, themeSwatches } from '@folioline/core/views';
import { computed, ref } from 'vue';
import { useT } from './context';
import { vValue } from './directives';
import Swatch from './Swatch.vue';

const props = defineProps<{ value: string | null; docx: DocxDocument | null; label: string }>();
const emit = defineEmits<{ pick: [hex: string | null] }>();
const t = useT();
const swatches = computed(() => themeSwatches(props.docx, t));
const cur = computed(() => (props.value && props.value !== 'auto' ? props.value.replace('#', '').toUpperCase() : null));
const custom = ref('');
const valid = computed(() => /^#?[0-9a-f]{6}$/i.test(custom.value.trim()));
const submit = () => {
  if (valid.value) emit('pick', custom.value.trim().replace('#', '').toUpperCase());
};
</script>

<template>
  <div class="fl-colors" role="group" :aria-label="label" data-testid="color-picker">
    <button type="button" class="fl-color-auto" @mousedown="keepFocus" @click="emit('pick', null)"><span class="fl-swatch is-auto" aria-hidden="true" />{{ t('color.automatic') }}</button>
    <div class="fl-color-title">{{ t('color.themeColors') }}</div>
    <div class="fl-color-grid is-theme" role="group">
      <Swatch v-for="s in swatches.theme" :key="s.key" :hex="s.hex" :label="s.label" :selected="cur === s.hex" @pick="emit('pick', s.hex)" />
    </div>
    <div class="fl-color-grid is-shades" role="group">
      <Swatch v-for="s in swatches.shades" :key="s.key" :hex="s.hex" :label="s.label" :selected="cur === s.hex" @pick="emit('pick', s.hex)" />
    </div>
    <div class="fl-color-title">{{ t('color.standardColors') }}</div>
    <div class="fl-color-grid" role="group">
      <Swatch v-for="c in STANDARD_COLORS" :key="c.hex" :hex="c.hex" :label="t(c.key)" :selected="cur === c.hex" @pick="emit('pick', c.hex)" />
    </div>
    <div class="fl-color-title">{{ t('color.customColor') }}</div>
    <form class="fl-color-custom" @submit.prevent="submit">
      <span aria-hidden="true">#</span>
      <input v-value="custom" :aria-label="t('color.customColor')" maxlength="7" :placeholder="cur ?? ''" :spellcheck="false" @input="custom = ($event.target as HTMLInputElement).value" />
      <input v-value="`#${valid ? custom.replace('#', '') : cur ?? '000000'}`" type="color" :aria-label="t('color.customColor')" @input="custom = ($event.target as HTMLInputElement).value.slice(1).toUpperCase()" />
      <button type="submit" class="fl-btn is-small" :disabled="!valid">{{ t('common.apply') }}</button>
    </form>
  </div>
</template>
