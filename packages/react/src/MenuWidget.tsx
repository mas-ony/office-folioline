import { type DistanceField, distanceText, type MenuWidget, parseDistance } from '@folioline/core/views';
import { useEffect, useState } from 'react';
import { useT } from './context';
import { TableGrid } from './TableGrid';

function Distance({ field }: { field: DistanceField }) {
  const t = useT();
  const { label, value, max, metric, onCommit, testId } = field;
  const [text, setText] = useState(distanceText(value, metric));
  useEffect(() => setText(distanceText(value, metric)), [value, metric]);
  // Text that is not a new distance is put back.
  const commit = () => {
    const twips = parseDistance(text, max, metric);
    if (twips !== null && twips !== value) onCommit(twips);
    else setText(distanceText(value, metric));
  };
  return (
    <label className="fl-menu-field">
      <span>{label}</span>
      <span className="fl-menu-field-control">
        <input type="number" role="spinbutton" step={metric ? '0.1' : '0.05'} min="0" className="fl-input is-small" aria-label={label} value={text} data-testid={testId} onChange={(e) => setText(e.target.value)} onBlur={commit} onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') commit(); }} />
        <span className="fl-unit">{t(metric ? 'common.centimeters' : 'common.inches')}</span>
      </span>
    </label>
  );
}

/** Controls inside a menu: the table size grid, or the header and footer distances. */
export function MenuWidgetView({ widget, close }: { widget: MenuWidget; close: () => void }) {
  if (widget.kind === 'tableGrid') return <TableGrid label={widget.label} onPick={(r, c) => { close(); widget.onPick(r, c); }} />;
  return (
    <div className="fl-menu-fields" onClick={(e) => e.stopPropagation()}>
      {widget.fields.map((f) => <Distance key={f.testId} field={f} />)}
    </div>
  );
}
