import { phoneMenuEntries } from '@folioline/core/views';
import { useSnapshot, useT, useUI } from './context';
import { Popover } from './controls';
import { MenuList } from './menu';

/** Phones: the menu bar, editing mode and view options in one sheet. */
export function PhoneMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const { ui, store } = useUI();
  const snap = useSnapshot(store, (s) => s);
  return (
    <Popover anchor={null} open={open} onClose={onClose} title={t('phone.menu')} role="presentation" testId="phone-menu">
      <MenuList entries={phoneMenuEntries(ui, snap)} onClose={onClose} label={t('phone.menu')} autoFocus={false} />
    </Popover>
  );
}
