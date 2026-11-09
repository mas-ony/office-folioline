import type { MessageKey } from '@folioline/core';
import { Ellipsis } from 'lucide-react';
import { Fragment, type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSnapshot, useT, useUI } from './context';
import { cx, keepFocus, Popover } from './controls';
import {
  AlignGroup,
  FontGroup,
  FormatGroup,
  HistoryGroup,
  ImageGroup,
  ListGroup,
  ReviewGroup,
  ScriptGroup,
  StyleGroup,
  TableGroup,
  TextGroup,
  type Variant,
} from './format/groups';

interface Group {
  id: string;
  title: MessageKey;
  /** Width in the bar, used to decide what moves into More. */
  width: number;
  render: (v: Variant) => ReactNode;
}

const SEP = 13;
const MORE = 40;
const PAD = 16;

/** Order of the groups in the bar. */
const ORDER = ['history', 'styles', 'font', 'text', 'script', 'alignment', 'lists', 'format', 'table', 'image', 'review'];
/** Groups move into More in this order as the bar gets narrower. */
const OVERFLOW = ['format', 'lists', 'script', 'image', 'table', 'alignment', 'text', 'font', 'styles'];
/** Order of the sections inside More (contextual groups first, pictures last). */
const MORE_ORDER = ['table', 'styles', 'font', 'text', 'script', 'alignment', 'lists', 'format', 'image'];
/** Phones: the scrolling row starts with the tools used most while typing. */
const PHONE_ORDER = ['text', 'lists', 'alignment', 'styles', 'font', 'script', 'format', 'table', 'image'];

export function FormatBar() {
  const t = useT();
  const { mobile, store, modal } = useUI();
  const inTable = useSnapshot(store, (s) => !!s.cursor?.inTable);
  const image = useSnapshot(store, (s) => !!s.cursor?.imageSelected);
  const dock = useRef<HTMLDivElement>(null);
  const moreBtn = useRef<HTMLButtonElement>(null);
  const [width, setWidth] = useState(1200);
  const [moreOpen, setMoreOpen] = useState(false);
  // A dialog closes the More panel, which would otherwise stay above it (often one of its tools opened it).
  useEffect(() => {
    if (modal) setMoreOpen(false);
  }, [modal]);

  useLayoutEffect(() => {
    const el = dock.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    // Room for the bar: the dock without its padding.
    const measure = () => {
      const cs = getComputedStyle(el);
      setWidth(el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight));
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, []);

  const all: Group[] = [
    { id: 'history', title: 'toolbar.undo', width: 72, render: (v) => <HistoryGroup variant={v} /> },
    { id: 'styles', title: 'toolbar.styles', width: 136, render: (v) => <StyleGroup variant={v} /> },
    { id: 'font', title: 'toolbar.font', width: 270, render: (v) => <FontGroup variant={v} /> },
    { id: 'text', title: 'toolbar.textFormatting', width: 262, render: (v) => <TextGroup variant={v} /> },
    { id: 'script', title: 'toolbar.script', width: 68, render: (v) => <ScriptGroup variant={v} /> },
    { id: 'alignment', title: 'toolbar.alignment', width: 48, render: (v) => <AlignGroup variant={v} /> },
    { id: 'lists', title: 'toolbar.lists', width: 184, render: (v) => <ListGroup variant={v} /> },
    { id: 'format', title: 'toolbar.format', width: 68, render: (v) => <FormatGroup variant={v} /> },
    ...(inTable ? [{ id: 'table', title: 'toolbar.table' as MessageKey, width: 330, render: (v: Variant) => <TableGroup variant={v} /> }] : []),
    ...(image ? [{ id: 'image', title: 'toolbar.image' as MessageKey, width: 196, render: (v: Variant) => <ImageGroup variant={v} /> }] : []),
    { id: 'review', title: 'review.label', width: 124, render: () => <ReviewGroup /> },
  ];
  const groups = ORDER.map((id) => all.find((g) => g.id === id)).filter((g): g is Group => !!g);

  // Desktop: drop groups in overflow order until the rest fits.
  const hidden = new Set<string>();
  if (!mobile) {
    const total = (gs: Group[]) => gs.reduce((w, g) => w + g.width, 0) + SEP * Math.max(0, gs.length - 1) + PAD;
    let shown = groups;
    for (const id of OVERFLOW) {
      if (total(shown) + (hidden.size ? MORE : 0) <= width) break;
      if (!shown.some((g) => g.id === id)) continue;
      hidden.add(id);
      shown = shown.filter((g) => g.id !== id);
    }
  }
  const phoneGroups = PHONE_ORDER.map((id) => groups.find((g) => g.id === id)).filter((g): g is Group => !!g);
  const bar = mobile ? phoneGroups : groups.filter((g) => !hidden.has(g.id));
  const more = mobile
    ? MORE_ORDER.map((id) => groups.find((g) => g.id === id)).filter((g): g is Group => !!g)
    : MORE_ORDER.map((id) => groups.find((g) => g.id === id && hidden.has(id))).filter((g): g is Group => !!g);

  const renderRow = (list: Group[]) => list.map((g, i) => (
    <Fragment key={g.id}>
      {i > 0 && <span className="fl-tool-sep" role="separator" aria-orientation="vertical" />}
      <div className="fl-tool-group" data-group={g.id}>{g.render('bar')}</div>
    </Fragment>
  ));

  const moreButton = (more.length > 0) && (
    <>
      <button
        ref={moreBtn}
        type="button"
        className={cx('fl-tool', moreOpen && 'is-active')}
        aria-label={t('toolbar.more')}
        title={t('toolbar.more')}
        aria-haspopup="dialog"
        aria-expanded={moreOpen}
        data-testid="tb-more"
        data-slot="toolbar.more"
        onMouseDown={keepFocus}
        onClick={() => setMoreOpen(!moreOpen)}
      >
        <Ellipsis size={18} />
      </button>
      <Popover anchor={moreBtn.current} open={moreOpen} onClose={() => setMoreOpen(false)} title={t('toolbar.more')} align="end" testId="tb-more-panel">
        <div className="fl-more" role="group" aria-label={t('toolbar.more')}>
          {more.map((g) => (
            <section key={g.id} className="fl-more-section" role="group" aria-label={t(g.title)}>
              <h3 className="fl-more-title">{t(g.title)}</h3>
              <div className="fl-more-body">{g.render('menu')}</div>
            </section>
          ))}
        </div>
      </Popover>
    </>
  );

  if (mobile) {
    return (
      <div className="fl-dock is-mobile" ref={dock}>
        <div className="fl-formatbar is-mobile" role="toolbar" aria-label={t('toolbar.label')} data-testid="formatbar">
          <div className="fl-tool-group is-fixed"><HistoryGroup variant="bar" /></div>
          <div className="fl-formatbar-scroll">{renderRow(bar)}</div>
          <div className="fl-tool-group is-fixed">
            <ReviewGroup />
            {moreButton}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="fl-dock" ref={dock}>
      <div className="fl-formatbar" role="toolbar" aria-label={t('toolbar.label')} data-testid="formatbar" data-overflow={hidden.size ? 'true' : undefined}>
        {renderRow(bar)}
        {moreButton}
      </div>
    </div>
  );
}
