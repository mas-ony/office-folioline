import { useState } from 'react';
import { useT } from './context';
import { cx, keepFocus } from './controls';

/** Pick a table size by hovering a grid; the grid grows as the pointer reaches its edge. */
export function TableGrid({ onPick, label }: { onPick: (rows: number, cols: number) => void; label: string }) {
  const t = useT();
  const [hover, setHover] = useState({ r: 1, c: 1 });
  const rows = Math.min(12, Math.max(6, hover.r + 1));
  const cols = Math.min(12, Math.max(6, hover.c + 1));
  return (
    <div className="fl-table-grid" data-testid="table-grid">
      <div className="fl-grid" role="grid" aria-label={label}>
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} className="fl-grid-row" role="row">
            {Array.from({ length: cols }, (_, c) => (
              <button
                key={c}
                type="button"
                role="gridcell"
                aria-label={t('table.gridLabel', { cols: c + 1, rows: r + 1 })}
                className={cx('fl-grid-cell', r < hover.r && c < hover.c && 'is-on')}
                onMouseDown={keepFocus}
                onMouseEnter={() => setHover({ r: r + 1, c: c + 1 })}
                onFocus={() => setHover({ r: r + 1, c: c + 1 })}
                onClick={() => onPick(r + 1, c + 1)}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="fl-grid-label" aria-live="polite">{t('table.gridLabel', { cols: hover.c, rows: hover.r })}</div>
    </div>
  );
}
