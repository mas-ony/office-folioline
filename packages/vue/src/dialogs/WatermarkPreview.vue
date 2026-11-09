<script setup lang="ts">
import { renderWatermark, type Watermark, WATERMARK_PREVIEW_LINES } from '@folioline/core/views';
import { onMounted, ref, watch } from 'vue';
import { useUI } from '../context';

const props = defineProps<{ w: Watermark | null }>();
const { editor } = useUI();
const el = ref<HTMLDivElement | null>(null);
const draw = () => {
  if (el.value) renderWatermark(el.value, props.w, { x: 10, y: 14, w: 100, h: 132 }, (p) => editor.docx.mediaUrl(p));
};
onMounted(draw);
watch(() => props.w, draw, { flush: 'post' });
</script>

<template>
  <div class="fl-wm-preview" aria-hidden="true">
    <div class="fl-wm-page">
      <span v-for="(w, i) in WATERMARK_PREVIEW_LINES" :key="i" class="fl-wm-line" :style="{ width: `${w}%` }" />
      <div ref="el" class="dx-watermark fl-wm-layer" />
    </div>
  </div>
</template>
