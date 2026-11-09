import { rulerUsesMetric, selectedParagraphs, setSectionMargins, updateParagraphs } from '@folioline/core/views';
import { type PointerEvent as ReactPointerEvent, type ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSnapshot, useT, useUI } from './context';

const TWIPS_PER_PX = 15;

type Handle = 'marginLeft' | 'marginRight' | 'firstLine' | 'hanging' | 'indentLeft' | 'indentRight';

interface Geometry {
  /** Page left edge relative to the ruler, in screen px. */
  x: number;
  zoom: number;
  pageW: number;
  marginLeft: number;
  marginRight: number;
  /** Paragraph indents in page px (left, right, first line offset relative to left). */
  left: number;
  right: number;
  first: number;
  sectionPos: number;
}

/** Horizontal ruler for the page holding the caret, with margin and indent markers. */
export function Ruler() {
  const t = useT();
  const { editor, store } = useUI();
  const ref = useRef<HTMLDivElement>(null);
  useSnapshot(store, (s) => `${s.layoutVersion}:${s.zoom}:${s.version}`);
  const [, setTick] = useState(0);
  const [drag, setDrag] = useState<{ handle: Handle; value: number } | null>(null);
  const metric = rulerUsesMetric();

  // Draw again once the container exists (geometry is measured against it).
  useLayoutEffect(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const s = editor.scrollEl;
    const on = () => setTick((t) => t + 1);
    s.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => {
      s.removeEventListener('scroll', on);
      window.removeEventListener('resize', on);
    };
  }, [editor]);

  const geometry = (): Geometry | null => {
    const r = editor.result;
    const host = ref.current;
    if (!r || r.mode !== 'print' || !host || !r.pages.length) return null;
    const sel = editor.view.state.selection;
    const page = r.pages[editor.pageOfPos(sel.from)] ?? r.pages[0];
    const sec = r.sections[page.section];
    const canvas = editor.scrollEl.querySelector<HTMLElement>('.dx-canvas');
    if (!sec || !canvas) return null;
    const zoom = editor.zoom;
    const x = canvas.getBoundingClientRect().left + page.left * zoom - host.getBoundingClientRect().left;
    const para = selectedParagraphs(editor.view.state)[0]?.node;
    const ind = para ? editor.docx.styles.effectiveParagraph(para.attrs.styleId, { indent: para.attrs.indent ?? undefined }).indent ?? {} : {};
    const left = (ind.left ?? 0) / TWIPS_PER_PX;
    const right = (ind.right ?? 0) / TWIPS_PER_PX;
    const first = ((ind.firstLine ?? 0) - (ind.hanging ?? 0)) / TWIPS_PER_PX;
    return { x, zoom, pageW: sec.pageW, marginLeft: sec.marginLeft, marginRight: sec.marginRight, left, right, first, sectionPos: page.startPos };
  };

  const g = geometry();

  const onDown = useCallback((handle: Handle) => (e: ReactPointerEvent<HTMLElement>) => {
    const geo = geometry();
    if (!geo || editor.readOnly) return;
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const host = ref.current!.getBoundingClientRect();
    const snap = metric ? 2.5 / 2.54 * 96 / 10 * 2 : 96 / 16;
    const pageX = (clientX: number) => {
      const raw = (clientX - host.left - geo.x) / geo.zoom;
      return Math.round(raw / snap) * snap;
    };
    // Margins move by how far the grey margin area is dragged; markers follow the pointer.
    const startX = e.clientX;
    const dragged = (clientX: number) => Math.round((clientX - startX) / geo.zoom / snap) * snap;
    const valueAt = (clientX: number): number => {
      const p = pageX(clientX);
      const contentL = geo.marginLeft;
      const contentR = geo.pageW - geo.marginRight;
      switch (handle) {
        case 'marginLeft': return Math.max(0, Math.min(geo.marginLeft + dragged(clientX), contentR - 96));
        case 'marginRight': return Math.max(0, Math.min(geo.marginRight - dragged(clientX), geo.pageW - contentL - 96));
        case 'indentLeft':
        case 'hanging': return Math.max(-contentL, Math.min(p - contentL, contentR - contentL - geo.right - 24));
        case 'firstLine': return p - contentL - geo.left;
        case 'indentRight': return Math.max(-geo.marginRight, Math.min(contentR - p, contentR - contentL - geo.left - 24));
      }
    };
    const move = (ev: PointerEvent) => setDrag({ handle, value: valueAt(ev.clientX) });
    const up = (ev: PointerEvent) => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      setDrag(null);
      const v = valueAt(ev.clientX);
      const tw = Math.round(v * TWIPS_PER_PX);
      const view = editor.view;
      if (handle === 'marginLeft') setSectionMargins(view, { left: tw }, geo.sectionPos);
      else if (handle === 'marginRight') setSectionMargins(view, { right: tw }, geo.sectionPos);
      else {
        updateParagraphs(view, (a) => {
          const cur = { ...((a.indent as Record<string, number>) ?? {}) };
          if (handle === 'indentLeft' || handle === 'hanging') {
            const firstOffset = geo.first;
            cur.left = tw;
            // The first line keeps its position relative to the page while hanging moves.
            if (handle === 'hanging') {
              const firstAbs = geo.left + firstOffset;
              const off = firstAbs - v;
              delete cur.firstLine;
              delete cur.hanging;
              if (off > 0) cur.firstLine = Math.round(off * TWIPS_PER_PX);
              else if (off < 0) cur.hanging = Math.round(-off * TWIPS_PER_PX);
            }
          } else if (handle === 'firstLine') {
            delete cur.firstLine;
            delete cur.hanging;
            if (tw > 0) cur.firstLine = tw;
            else if (tw < 0) cur.hanging = -tw;
          } else if (handle === 'indentRight') cur.right = tw;
          return { ...a, indent: cur };
        }, true);
      }
      editor.focus();
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    setDrag({ handle, value: valueAt(e.clientX) });
    // geometry() reads live editor state; recreating the handler per render is fine.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, metric]);

  if (!g) return <div className="fl-ruler" ref={ref} data-testid="ruler" aria-hidden="true" />;

  // Values while dragging.
  let { marginLeft, marginRight, left, right, first } = g;
  if (drag) {
    if (drag.handle === 'marginLeft') marginLeft = drag.value;
    if (drag.handle === 'marginRight') marginRight = drag.value;
    if (drag.handle === 'indentLeft') left = drag.value;
    if (drag.handle === 'hanging') {
      first = g.left + g.first - drag.value;
      left = drag.value;
    }
    if (drag.handle === 'firstLine') first = drag.value;
    if (drag.handle === 'indentRight') right = drag.value;
  }
  const z = g.zoom;
  const px = (v: number) => g.x + v * z;
  const unit = metric ? 96 / 2.54 : 96;
  const steps = metric ? 4 : 8;
  const ticks: ReactNode[] = [];
  const count = Math.floor(g.pageW / (unit / steps));
  for (let i = 0; i <= count; i++) {
    const at = (i * unit) / steps;
    const major = i % steps === 0;
    const half = !major && i % (steps / 2) === 0;
    ticks.push(
      <span key={i} className={major ? 'fl-tick is-major' : half ? 'fl-tick is-half' : 'fl-tick'} style={{ left: px(at) }}>
        {major && i > 0 && <span className="fl-tick-label">{i / steps}</span>}
      </span>,
    );
  }
  const contentL = marginLeft;
  const contentR = g.pageW - marginRight;
  return (
    <div className="fl-ruler" ref={ref} data-testid="ruler" role="group" aria-label={t('ruler.horizontal')}>
      <div className="fl-ruler-page" style={{ left: px(0), width: g.pageW * z }} />
      {ticks}
      <span className="fl-ruler-margin" role="slider" aria-label={t('ruler.leftMargin')} aria-valuenow={Math.round(marginLeft)} tabIndex={-1} style={{ left: px(0), width: marginLeft * z }} onPointerDown={onDown('marginLeft')} />
      <span className="fl-ruler-margin" role="slider" aria-label={t('ruler.rightMargin')} aria-valuenow={Math.round(marginRight)} tabIndex={-1} style={{ left: px(contentR), width: marginRight * z }} onPointerDown={onDown('marginRight')} />
      <span className="fl-indent fl-indent-first" role="slider" aria-label={t('ruler.firstLine')} aria-valuenow={Math.round(first)} tabIndex={-1} style={{ left: px(contentL + left + first) }} onPointerDown={onDown('firstLine')} />
      <span className="fl-indent fl-indent-hanging" role="slider" aria-label={t('ruler.hanging')} aria-valuenow={Math.round(left)} tabIndex={-1} style={{ left: px(contentL + left) }} onPointerDown={onDown('hanging')} />
      <span className="fl-indent fl-indent-left" role="slider" aria-label={t('ruler.left')} aria-valuenow={Math.round(left)} tabIndex={-1} style={{ left: px(contentL + left) }} onPointerDown={onDown('indentLeft')} />
      <span className="fl-indent fl-indent-right" role="slider" aria-label={t('ruler.right')} aria-valuenow={Math.round(right)} tabIndex={-1} style={{ left: px(contentR - right) }} onPointerDown={onDown('indentRight')} />
    </div>
  );
}
