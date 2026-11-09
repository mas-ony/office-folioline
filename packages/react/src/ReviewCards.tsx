import type { MessageKey } from '@folioline/core';
import { dateTime, relativeTime, type ReviewItem } from '@folioline/core/views';
import { ArrowUp, Check, RotateCcw, Trash2, X } from 'lucide-react';
import { type KeyboardEvent, useState } from 'react';
import { useI18n, useUI } from './context';
import { Avatar, cx, keepFocus } from './controls';

type CommentItem = Extract<ReviewItem, { kind: 'comment' }>;
type ChangeItem = Extract<ReviewItem, { kind: 'change' }>;

function ReplyForm({ threadId, autoFocus }: { threadId: string; autoFocus?: boolean }) {
  const { t } = useI18n();
  const { editor, user, authorColor } = useUI();
  const [text, setText] = useState('');
  const submit = () => {
    const v = text.trim();
    if (!v) return;
    editor.replyToComment(threadId, v);
    setText('');
  };
  return (
    <form className="fl-reply" onSubmit={(e) => { e.preventDefault(); submit(); }} onClick={(e) => e.stopPropagation()}>
      <Avatar name={user.name} color={authorColor(user.name)} size="sm" />
      <input
        className="fl-reply-input"
        placeholder={t('review.replyPlaceholder')}
        aria-label={t('review.reply')}
        value={text}
        autoFocus={autoFocus}
        data-testid="reply-input"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e: KeyboardEvent) => e.stopPropagation()}
      />
      <button type="submit" className="fl-reply-send" aria-label={t('review.reply')} title={t('review.reply')} disabled={!text.trim()} data-testid="reply-send"><ArrowUp size={15} /></button>
    </form>
  );
}

/** A comment thread: in the rail beside the page, or in the Changes tab. */
export function CommentCard({ item, active, variant, onActivate }: { item: CommentItem; active: boolean; variant: 'rail' | 'panel'; onActivate: () => void }) {
  const { t, locale } = useI18n();
  const { editor, authorColor, store } = useUI();
  const th = item.thread;
  const ro = store.getSnapshot().editMode === 'viewing';
  const color = authorColor(th.author);
  const actions = !ro && (variant === 'rail' || active) && (
    <div className="fl-card-actions">
      {th.done ? (
        <button type="button" className="fl-icon-btn is-small" aria-label={t('review.reopen')} title={t('review.reopen')} data-testid="comment-reopen" onMouseDown={keepFocus} onClick={(e) => { e.stopPropagation(); editor.resolveComment(th.id, false); }}><RotateCcw size={15} /></button>
      ) : (
        <button type="button" className="fl-icon-btn is-small" aria-label={t('review.resolve')} title={t('review.resolve')} data-testid="comment-resolve" onMouseDown={keepFocus} onClick={(e) => { e.stopPropagation(); editor.resolveComment(th.id, true); }}><Check size={15} /></button>
      )}
      <button type="button" className="fl-icon-btn is-small" aria-label={t('review.deleteComment')} title={t('review.deleteComment')} data-testid="comment-delete" onMouseDown={keepFocus} onClick={(e) => { e.stopPropagation(); editor.deleteComment(th.id); }}><Trash2 size={15} /></button>
    </div>
  );
  return (
    <div
      className={cx('fl-card', 'is-comment', active && 'is-active', th.done && 'is-resolved', variant === 'rail' && 'is-rail')}
      style={{ ['--author' as string]: color }}
      role="button"
      tabIndex={0}
      aria-label={`${t('review.comment')} · ${th.author}`}
      data-testid={variant === 'rail' ? 'rail-card' : 'review-card'}
      data-comment-id={th.id}
      onClick={onActivate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.target === e.currentTarget) onActivate();
      }}
    >
      <div className="fl-card-head">
        <Avatar name={th.author} color={color} />
        <div className="fl-card-who">
          <span className="fl-card-author">{th.author}</span>
          <time className="fl-card-time" dateTime={th.date}>{variant === 'rail' ? dateTime(th.date, locale) : relativeTime(th.date, t, locale)}</time>
        </div>
        {th.done && <span className="fl-badge">{t('review.resolved')}</span>}
        {actions}
      </div>
      <div className="fl-card-body">
        {variant === 'panel' && <span className="fl-card-verb">{t('review.comment')}</span>}
        <span className="fl-card-text" dir="auto">{th.text}</span>
      </div>
      {th.replies.length > 0 && (
        <ul className="fl-card-replies">
          {th.replies.map((r) => (
            <li key={r.id}>
              <b>{r.author}</b> {variant === 'panel' && <span className="fl-card-verb">{t('review.reply')}:</span>} <span dir="auto">{r.text}</span>
            </li>
          ))}
        </ul>
      )}
      {!ro && !th.done && (variant === 'rail' || active) && <ReplyForm threadId={th.id} />}
    </div>
  );
}

const VERBS: Record<ChangeItem['summary']['verb'], MessageKey> = {
  added: 'review.added',
  deleted: 'review.deleted',
  replaced: 'review.replaced',
  formatted: 'review.formatted',
  paragraphAdded: 'review.paragraphAdded',
  paragraphDeleted: 'review.paragraphDeleted',
};

/** A tracked change with Accept and Reject. */
export function ChangeCard({ item, active, onActivate }: { item: ChangeItem; active: boolean; onActivate: () => void }) {
  const { t, locale } = useI18n();
  const { editor, authorColor, store } = useUI();
  const ro = store.getSnapshot().editMode === 'viewing';
  const color = authorColor(item.author);
  const s = item.summary;
  const label = t(VERBS[s.verb]);
  return (
    <div
      className={cx('fl-card', 'is-change', active && 'is-active')}
      style={{ ['--author' as string]: color }}
      role="button"
      tabIndex={0}
      aria-label={`${label} · ${item.author}`}
      data-testid="change-card"
      onClick={onActivate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.target === e.currentTarget) onActivate();
      }}
    >
      <div className="fl-card-head">
        <Avatar name={item.author} color={color} />
        <div className="fl-card-who">
          <span className="fl-card-author">{item.author}</span>
          <time className="fl-card-time" dateTime={item.date}>{relativeTime(item.date, t, locale)}</time>
        </div>
        {!ro && (
          <div className="fl-card-actions is-always">
            <button type="button" className="fl-icon-btn is-small" aria-label={t('review.accept')} title={t('review.accept')} data-testid="change-accept" onMouseDown={keepFocus} onClick={(e) => { e.stopPropagation(); editor.decideChanges(item.changes, true); }}><Check size={15} /></button>
            <button type="button" className="fl-icon-btn is-small" aria-label={t('review.reject')} title={t('review.reject')} data-testid="change-reject" onMouseDown={keepFocus} onClick={(e) => { e.stopPropagation(); editor.decideChanges(item.changes, false); }}><X size={15} /></button>
          </div>
        )}
      </div>
      <div className="fl-card-body">
        <span className="fl-card-verb">{label}</span>
        {s.verb === 'replaced' && (
          <>
            {' '}<del className="fl-del" dir="auto">{s.text}</del>{' '}<ins className="fl-ins" dir="auto">{s.with}</ins>
          </>
        )}
        {s.verb === 'deleted' && <>{' '}<del className="fl-del" dir="auto">{s.text}</del></>}
        {s.verb === 'added' && <>{' '}<ins className="fl-ins" dir="auto">{s.text}</ins></>}
        {s.verb === 'formatted' && <>{' '}<span className="fl-card-text" dir="auto">{s.text}</span></>}
      </div>
    </div>
  );
}

/** The new-comment draft for a selection. */
export function DraftCard({ onDone }: { onDone?: () => void }) {
  const { t } = useI18n();
  const { editor, user, composerRange, closeComposer, authorColor } = useUI();
  const [text, setText] = useState('');
  const submit = () => {
    const v = text.trim();
    if (!v || !composerRange) return;
    editor.addCommentAt(composerRange, v);
    closeComposer();
    onDone?.();
  };
  return (
    <form className="fl-card is-draft is-active" style={{ ['--author' as string]: authorColor(user.name) }} data-testid="comment-draft" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <div className="fl-card-head">
        <Avatar name={user.name} color={authorColor(user.name)} />
        <div className="fl-card-who"><span className="fl-card-author">{user.name}</span></div>
      </div>
      <textarea
        className="fl-input fl-draft-input"
        placeholder={t('review.addComment')}
        aria-label={t('review.addComment')}
        value={text}
        rows={2}
        autoFocus
        data-testid="comment-input"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit();
          if (e.key === 'Escape') {
            closeComposer();
            onDone?.();
            editor.focus();
          }
        }}
      />
      <div className="fl-draft-actions">
        <button type="button" className="fl-btn is-small is-quiet" data-testid="comment-cancel" onClick={() => { closeComposer(); onDone?.(); editor.focus(); }}>{t('common.cancel')}</button>
        <button type="submit" className="fl-btn is-small is-primary" disabled={!text.trim()} data-testid="comment-submit">{t('review.comment')}</button>
      </div>
    </form>
  );
}
