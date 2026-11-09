import { setSectionMargins } from '@folioline/core/views';
import { type PointerEvent as ReactPointerEvent, type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSnapshot, useT, useUI } from './context';

const TWIPS_PER_PX = 15;

/** Vertical ruler for the page holding the caret, with the top and bottom margins. */
export function VRuler() {
  const t = useT();
  const { editor, store } = useUI();
  const ref = useRef<HTMLDivElement>(null);
  useSnapshot(store, (s) => `${s.layoutVersion}:${s.zoom}:${s.version}`);
  const [, setTick] = useState(0);
  const [drag, setDrag] = useState<{ edge: 'top' | 'bottom'; value: number } | null>(null);
  useLayoutEffect(() => setTick((n) => n + 1), []);
  useEffect(() => {
    const s = editor.scrollEl;
    const on = () => setTick((n) => n + 1);
    s.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => {
      s.removeEventListener('scroll', on);
      window.removeEventListener('resize', on);
    };
  }, [editor]);

  const r = editor.result;
  const host = ref.current;
  const canvas = editor.scrollEl.querySelector<HTMLElement>('.dx-canvas');
  if (!r || r.mode !== 'print' || !host || !canvas || !r.pages.length) return <div className="fl-vruler" ref={ref} aria-hidden="true" />;
  const page = r.pages[editor.pageOfPos(editor.view.state.selection.from)] ?? r.pages[0];
  const sec = r.sections[page.section];
  const z = editor.zoom;
  const y0 = canvas.getBoundingClientRect().top + page.top * z - host.getBoundingClientRect().top;
  const top = drag?.edge === 'top' ? drag.value : page.bodyTop - page.top;
  const bottom = drag?.edge === 'bottom' ? drag.value : page.top + page.height - page.bodyBottom;
  const py = (v: number) => y0 + v * z;

  const onDown = (edge: 'top' | 'bottom') => (e: ReactPointerEvent<HTMLElement>) => {
    if (editor.readOnly || !sec) return;
    e.preventDefault();
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const startY = e.clientY;
    const start = edge === 'top' ? top : bottom;
    const snap = 96 / 16;
    const valueAt = (clientY: number) => {
      const d = ((clientY - startY) / z) * (edge === 'top' ? 1 : -1);
      return Math.max(0, Math.min(page.height / 2 - 48, Math.round((start + d) / snap) * snap));
    };
    const move = (ev: PointerEvent) => setDrag({ edge, value: valueAt(ev.clientY) });
    const up = (ev: PointerEvent) => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      setDrag(null);
      const tw = Math.round(valueAt(ev.clientY) * TWIPS_PER_PX);
      setSectionMargins(editor.view, edge === 'top' ? { top: tw } : { bottom: tw }, page.startPos);
      editor.focus();
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    setDrag({ edge, value: start });
  };

  const ticks: ReactNode[] = [];
  const steps = 8;
  const count = Math.floor(page.height / (96 / steps));
  for (let i = 0; i <= count; i++) {
    const major = i % steps === 0;
    const half = !major && i % (steps / 2) === 0;
    ticks.push(
      <span key={i} className={major ? 'fl-vtick is-major' : half ? 'fl-vtick is-half' : 'fl-vtick'} style={{ top: py((i * 96) / steps) }}>
        {major && i > 0 && <span className="fl-vtick-label">{i / steps}</span>}
      </span>,
    );
  }
  return (
    <div className="fl-vruler" ref={ref} role="group" aria-label={t('ruler.vertical')} data-testid="vruler">
      <div className="fl-vruler-page" style={{ top: py(0), height: page.height * z }} />
      {ticks}
      <span className="fl-vruler-margin" role="slider" aria-label={t('ruler.topMargin')} aria-valuenow={Math.round(top)} tabIndex={-1} style={{ top: py(0), height: top * z }} onPointerDown={onDown('top')} />
      <span className="fl-vruler-margin" role="slider" aria-label={t('ruler.bottomMargin')} aria-valuenow={Math.round(bottom)} tabIndex={-1} style={{ top: py(page.height - bottom), height: bottom * z }} onPointerDown={onDown('bottom')} />
    </div>
  );
}
