/** A group in the bar, or a section of "More" (labelled rows). */
import type { MessageKey } from '@folioline/core';
import { type Component, computed, type ComputedRef } from 'vue';
import { useSnapshot } from '../context';

export type Variant = 'bar' | 'menu';

/** Size of the toolbar's icons. */
export const ICON = 17;

export function useCursor() {
  return useSnapshot((s) => s.cursor);
}

export function useReadOnly(): ComputedRef<boolean> {
  const mode = useSnapshot((s) => s.editMode);
  return computed(() => mode.value === 'viewing');
}

/** A group of the bar. */
export interface Group {
  id: string;
  title: MessageKey;
  /** Width in the bar, used to decide what moves into More. */
  width: number;
  comp: Component;
}
