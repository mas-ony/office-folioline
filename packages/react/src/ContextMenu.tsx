import { contextMenuAt, contextMenuEntries } from '@folioline/core/views';
import { useEffect, useState } from 'react';
import { useT, useUI } from './context';
import { Popover } from './controls';
import { MenuList } from './menu';

/** The document's right-click menu. Phones keep the browser's own selection menu. */
export function ContextMenu() {
  const t = useT();
  const { ui, editor, mobile } = useUI();
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const onContext = (e: MouseEvent) => {
      const point = contextMenuAt(ui, e);
      if (point) setAt(point);
    };
    document.addEventListener('contextmenu', onContext);
    return () => document.removeEventListener('contextmenu', onContext);
  }, [ui, editor, mobile]);

  if (!at) return null;
  return (
    <Popover anchor={null} at={at} open onClose={() => setAt(null)} sheetOnMobile={false} role="presentation" title={t('context.label')} testId="context-menu">
      <MenuList entries={contextMenuEntries(ui)} onClose={() => setAt(null)} label={t('context.label')} />
    </Popover>
  );
}
