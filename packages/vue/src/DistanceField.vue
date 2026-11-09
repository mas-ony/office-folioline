<script setup lang="ts">
/** A distance inside a menu (the header and footer distances), applied on Enter or leaving it. */
import { type DistanceField, distanceText, parseDistance } from '@folioline/core/views';
import { onBeforeUnmount, ref, watch } from 'vue';
import { useT } from './context';
import { vNumberValue } from './directives';

const props = defineProps<{ field: DistanceField }>();
const t = useT();
const text = ref(distanceText(props.field.value, props.field.metric));
watch(() => [props.field.value, props.field.metric] as const, ([v, metric]) => (text.value = distanceText(v, metric)));
// The browser blurs the field as it is removed while focused: what was typed is then dropped.
let removed = false;
onBeforeUnmount(() => (removed = true));
// Text that is not a new distance is put back.
const commit = () => {
  if (removed) return;
  const { value, max, metric } = props.field;
  const twips = parseDistance(text.value, max, metric);
  if (twips !== null && twips !== value) props.field.onCommit(twips);
  else text.value = distanceText(value, metric);
};
const key = (e: KeyboardEvent) => {
  e.stopPropagation();
  if (e.key === 'Enter') commit();
};
</script>

<template>
  <label class="fl-menu-field">
    <span>{{ field.label }}</span>
    <span class="fl-menu-field-control">
      <input
        v-number-value="text"
        type="number"
        role="spinbutton"
        :step="field.metric ? '0.1' : '0.05'"
        min="0"
        class="fl-input is-small"
        :aria-label="field.label"
        :data-testid="field.testId"
        @input="text = ($event.target as HTMLInputElement).value"
        @blur="commit"
        @keydown="key"
      />
      <span class="fl-unit">{{ t(field.metric ? 'common.centimeters' : 'common.inches') }}</span>
    </span>
  </label>
</template>
