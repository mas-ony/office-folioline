/** Directives giving form fields React's behaviour: autoFocus, and fields that show their value. */
import type { Directive } from 'vue';

/** `v-focus`: focuses the element once mounted; `v-focus="false"` does not. */
export const vFocus: Directive<HTMLElement, boolean | undefined> = {
  mounted(el, binding) {
    if (binding.value !== false) el.focus();
  },
};

type CheckBox = HTMLInputElement & { _flChecked?: boolean };

/**
 * `v-checked`: a check box or radio button showing a value, after every render and also after a
 * click its handler ignored (which leaves the value unchanged).
 */
export const vChecked: Directive<CheckBox, boolean> = {
  mounted(el, { value }) {
    el._flChecked = !!value;
    el.checked = !!value;
    // Runs after the change handlers and the render they cause (both queued before this).
    el.addEventListener('change', () => queueMicrotask(() => (el.checked = !!el._flChecked)));
  },
  updated(el, { value }) {
    el._flChecked = !!value;
    el.checked = !!value;
  },
};

type NumberInput = HTMLInputElement & { _flValue?: number | string };

/** As React does for number inputs: "1.50" stays while the value is 1.5 (only a different number is written). */
function syncNumber(el: NumberInput): void {
  const v = el._flValue ?? '';
  // eslint-disable-next-line eqeqeq
  if ((v === 0 && el.value === '') || el.value != (v as unknown as string)) el.value = String(v);
}

/** `v-number-value`: the value of a number input, kept like React's controlled number inputs. */
export const vNumberValue: Directive<NumberInput, number | string> = {
  mounted(el, { value }) {
    el._flValue = value;
    syncNumber(el);
    el.addEventListener('input', () => queueMicrotask(() => syncNumber(el)));
  },
  updated(el, { value }) {
    el._flValue = value;
    syncNumber(el);
  },
};

type TextInput = (HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) & { _flText?: string };

/**
 * `v-value`: the value of a field, as React's controlled fields keep it: after typing, the field
 * shows the value again (unchanged when the handler refused the text).
 */
export const vValue: Directive<TextInput, string | number> = {
  mounted(el, { value }) {
    el._flText = String(value);
    el.value = el._flText;
    const restore = () =>
      queueMicrotask(() => {
        if (el.value !== el._flText) el.value = el._flText ?? '';
      });
    el.addEventListener('input', restore);
    el.addEventListener('change', restore);
  },
  updated(el, { value }) {
    el._flText = String(value);
    if (el.value !== el._flText) el.value = el._flText;
  },
};
