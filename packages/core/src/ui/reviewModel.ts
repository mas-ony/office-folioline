import type { AnchoredComment, DocxEditor } from '../editor/DocxEditor';
import type { TrackedChange } from '../editor/plugins/trackChanges';
import type { Translate } from '../i18n';

export interface ChangeSummary {
  verb: 'added' | 'deleted' | 'replaced' | 'formatted' | 'paragraphAdded' | 'paragraphDeleted';
  text: string;
  /** Inserted text of a replacement. */
  with?: string;
}

export type ReviewItem =
  | { kind: 'comment'; key: string; pos: number; author: string; date: string; thread: AnchoredComment }
  | { kind: 'change'; key: string; pos: number; author: string; date: string; changes: TrackedChange[]; summary: ChangeSummary };

const clip = (s: string, n = 120) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

function summarize(changes: TrackedChange[]): ChangeSummary {
  const del = changes.find((c) => c.type === 'deletion');
  const ins = changes.find((c) => c.type === 'insertion');
  if (del && ins) return { verb: 'replaced', text: clip(del.text), with: clip(ins.text) };
  const c = changes[0];
  switch (c.type) {
    case 'insertion': return { verb: 'added', text: clip(c.text) };
    case 'deletion': return { verb: 'deleted', text: clip(c.text) };
    case 'format': return { verb: 'formatted', text: clip(c.text) };
    case 'paragraph-insertion': return { verb: 'paragraphAdded', text: '' };
    default: return { verb: 'paragraphDeleted', text: '' };
  }
}

/**
 * Comments and tracked changes in document order. A deletion directly followed by an insertion
 * from the same author is one replacement.
 */
export function reviewItems(editor: DocxEditor, opts: { resolved?: boolean; hidden?: readonly string[] } = {}): ReviewItem[] {
  const hidden = new Set(opts.hidden ?? []);
  const items: ReviewItem[] = [];
  const changes = editor.trackedChanges();
  for (let i = 0; i < changes.length; i++) {
    const c = changes[i];
    const group = [c];
    const next = changes[i + 1];
    const end = c.ranges[c.ranges.length - 1].to;
    if (c.type === 'deletion' && next && next.type === 'insertion' && next.author === c.author && Math.abs(next.ranges[0].from - end) <= 1) {
      group.push(next);
      i++;
    }
    if (hidden.has(c.author)) continue;
    items.push({ kind: 'change', key: `change:${group.map((g) => `${g.type}:${g.id}`).join('+')}`, pos: c.ranges[0].from, author: c.author, date: c.date, changes: group, summary: summarize(group) });
  }
  for (const th of editor.comments()) {
    if (th.done && !opts.resolved) continue;
    if (hidden.has(th.author)) continue;
    items.push({ kind: 'comment', key: `comment:${th.id}`, pos: th.from, author: th.author, date: th.date ?? '', thread: th });
  }
  return items.sort((a, b) => a.pos - b.pos);
}

/** "Just now", "5m ago", "2h ago", or a short date ("Mar 26"). */
export function relativeTime(iso: string | undefined, t: Translate, locale: string, now = Date.now()): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diff = (now - d.getTime()) / 1000;
  if (diff >= 0 && diff < 60) return t('review.justNow');
  if (diff >= 0 && diff < 3600) return t('review.minutesAgo', { count: Math.floor(diff / 60) });
  if (diff >= 0 && diff < 86400 && new Date(now).getDate() === d.getDate()) return t('review.hoursAgo', { count: Math.floor(diff / 3600) });
  try {
    return d.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: d.getFullYear() === new Date(now).getFullYear() ? undefined : 'numeric' });
  } catch {
    return d.toDateString();
  }
}

/** "Oct 23, 10:56 PM" for comment cards beside the page. */
export function dateTime(iso: string | undefined, locale: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return d.toLocaleString(locale, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return d.toLocaleString();
  }
}
