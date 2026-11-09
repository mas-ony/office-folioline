import { headerFooterEntries, headerFooterOptionsButton, type PopoverClosedBy } from '@folioline/core/views';
import { useEffect, useState } from 'react';
import { useT, useUI } from './context';
import { Popover } from './controls';
import { MenuList } from './menu';

/** Options of the header or footer being edited (opened from its bar). */
export function HeaderFooterMenu({ at, pageIndex, onClose }: { at: { x: number; y: number }; pageIndex: number; onClose: () => void }) {
  const t = useT();
  const { ui } = useUI();
  // The bar's Options button, which closes the menu again; it tells that its menu is open.
  const [button] = useState(() => headerFooterOptionsButton(ui));
  useEffect(() => {
    button?.setAttribute('aria-expanded', 'true');
    return () => button?.setAttribute('aria-expanded', 'false');
  }, [button]);
  // Escape puts the cursor back in the header or footer (what was typed in a distance is dropped).
  const close = (by?: PopoverClosedBy) => {
    onClose();
    if (by === 'escape') ui.editor?.focus();
  };
  return (
    <Popover anchor={button} at={at} open onClose={close} title={t('hf.options')} role="presentation" testId="hf-options">
      <MenuList entries={headerFooterEntries(ui, pageIndex)} onClose={onClose} label={t('hf.options')} />
    </Popover>
  );
}
