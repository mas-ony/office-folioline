import { reviewItems } from '@folioline/core/views';
import { MessageSquarePlus } from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSnapshot, useT, useUI } from './context';
import { keepFocus } from './controls';
import { CommentCard, DraftCard } from './ReviewCards';

const GAP = 10;
const RAIL_W = 300;

/** Vertical position of a document position in the scroll content, or null when not shown. */
function yOf(scroll: HTMLElement, view: { coordsAtPos(p: number): { top: number } }, pos: number): number | null {
  try {
    const c = view.coordsAtPos(pos);
    return c.top - scroll.getBoundingClientRect().top + scroll.scrollTop;
  } catch {
    return null;
  }
}

/** Comment cards beside the pages, each next to the text it is about. */
export function ReviewRail() {
  const t = useT();
  const { editor, store, railOpen, composerRange, mobile, openComposer } = useUI();
  const version = useSnapshot(store, (s) => `${s.commentsVersion}:${s.layoutVersion}:${s.zoom}:${s.markup}:${s.hiddenReviewers.join('|')}`);
  const activeComment = useSnapshot(store, (s) => s.activeComment);
  const selected = useSnapshot(store, (s) => !!s.cursor?.textSelected && s.stream === 'body');
  const mode = useSnapshot(store, (s) => s.editMode);
  const viewMode = useSnapshot(store, (s) => s.viewMode);
  const hidden = useSnapshot(store, (s) => s.hiddenReviewers);
  const [heights, setHeights] = useState<Record<string, number>>({});
  const [, tick] = useState(0);
  const refs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const on = () => tick((n) => n + 1);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  const scroll = editor.scrollEl;
  const items = useMemo(
    () => (railOpen ? reviewItems(editor, { hidden }).filter((i) => i.kind === 'comment') : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editor, version, railOpen, hidden],
  );

  // Where the rail column starts: right of the widest page. Measured after each commit, once the
  // panes around the document have their new size (opening the navigation pane moves the pages).
  const [x, setX] = useState(0);
  useLayoutEffect(() => {
    const sizer = scroll.querySelector<HTMLElement>('.dx-sizer');
    const r = editor.result;
    const pageRight = r && r.mode === 'print' && r.pages.length ? Math.max(...r.pages.map((p) => p.left + p.width)) : 0;
    const next = (sizer?.offsetLeft ?? 0) + pageRight * editor.zoom + 16;
    if (next !== x) setX(next);
  });

  // Stack the cards: each as close to its anchor as the ones above allow; the active card
  // sits at its anchor and pushes earlier cards up.
  const layout = useMemo(() => {
    const view = editor.view;
    const rows: { key: string; top: number }[] = [];
    const entries = items.map((it) => ({ key: it.key, anchor: yOf(scroll, view, it.pos) ?? 0, id: it.kind === 'comment' ? it.thread.id : '' }));
    if (composerRange) entries.push({ key: 'draft', anchor: yOf(scroll, view, composerRange.from) ?? 0, id: 'draft' });
    entries.sort((a, b) => a.anchor - b.anchor);
    let y = 0;
    for (const e of entries) {
      const top = Math.max(e.anchor - 4, y);
      rows.push({ key: e.key, top });
      y = top + (heights[e.key] ?? 96) + GAP;
    }
    const activeIdx = entries.findIndex((e) => (composerRange ? e.key === 'draft' : e.id === activeComment));
    if (activeIdx > 0) {
      const want = entries[activeIdx].anchor - 4;
      if (rows[activeIdx].top > want) {
        rows[activeIdx].top = want;
        for (let i = activeIdx - 1; i >= 0; i--) {
          const limit = rows[i + 1].top - GAP - (heights[rows[i].key] ?? 96);
          if (rows[i].top > limit) rows[i].top = limit;
        }
        let yy = rows[activeIdx].top + (heights[rows[activeIdx].key] ?? 96) + GAP;
        for (let i = activeIdx + 1; i < rows.length; i++) {
          rows[i].top = Math.max(entries[i].anchor - 4, yy);
          yy = rows[i].top + (heights[rows[i].key] ?? 96) + GAP;
        }
      }
    }
    return new Map(rows.map((row) => [row.key, Math.max(0, row.top)]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, composerRange, heights, activeComment, version, scroll]);

  useLayoutEffect(() => {
    const next: Record<string, number> = {};
    let changed = false;
    for (const [key, el] of Object.entries(refs.current)) {
      if (!el) continue;
      next[key] = el.offsetHeight;
      if (Math.abs((heights[key] ?? 0) - next[key]) > 1) changed = true;
    }
    if (changed) setHeights(next);
  });

  if (mobile || viewMode !== 'print') return null;

  // The comment button beside a selection.
  let bubble: { top: number } | null = null;
  if (selected && !composerRange && mode !== 'viewing') {
    const top = yOf(scroll, editor.view, editor.view.state.selection.from);
    if (top !== null) bubble = { top };
  }

  return createPortal(
    <div className="fl-rail" style={{ left: x, width: RAIL_W }} aria-label={t('review.label')} role="region" data-testid="review-rail">
      {bubble && (
        <button
          type="button"
          className="fl-rail-bubble"
          style={{ top: bubble.top - 4, left: -8 }}
          aria-label={t('toolbar.comment')}
          title={t('toolbar.comment')}
          data-testid="comment-bubble"
          onMouseDown={keepFocus}
          onClick={openComposer}
        >
          <MessageSquarePlus size={17} />
        </button>
      )}
      {items.map((it) => it.kind === 'comment' && (
        <div
          key={it.key}
          ref={(el) => {
            refs.current[it.key] = el;
          }}
          className="fl-rail-slot"
          style={{ top: layout.get(it.key) ?? 0 }}
        >
          <CommentCard item={it} variant="rail" active={activeComment === it.thread.id} onActivate={() => editor.selectComment(it.thread.id)} />
        </div>
      ))}
      {composerRange && (
        <div
          ref={(el) => {
            refs.current.draft = el;
          }}
          className="fl-rail-slot"
          style={{ top: layout.get('draft') ?? 0 }}
        >
          <DraftCard />
        </div>
      )}
    </div>,
    scroll,
  );
}
