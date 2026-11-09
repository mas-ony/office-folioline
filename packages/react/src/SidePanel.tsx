import { LOCALES, type SidePanelTab } from '@folioline/core';
import { collabStatusKey, qrSvg, reviewItems } from '@folioline/core/views';
import { BookOpen, Bug, Copy, Info, Keyboard, ListChecks, LogOut, MessageSquarePlus, Moon, Radio, Settings2, Sun, X } from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useCommands, useI18n, useSnapshot, useUI } from './context';
import { Avatar, Check, cx, keepFocus } from './controls';
import { ChangeCard, CommentCard, DraftCard } from './ReviewCards';

function ChangesTab() {
  const { t } = useI18n();
  const { editor, store, authorColor, composerRange, mobile, openComposer } = useUI();
  const version = useSnapshot(store, (s) => `${s.commentsVersion}:${s.changesVersion}`);
  const hidden = useSnapshot(store, (s) => s.hiddenReviewers);
  const activeComment = useSnapshot(store, (s) => s.activeComment);
  const selected = useSnapshot(store, (s) => !!s.cursor?.textSelected);
  const mode = useSnapshot(store, (s) => s.editMode);
  const [activeChange, setActiveChange] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);
  const body = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const reviewers = useMemo(() => editor.reviewers(), [editor, version]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const items = useMemo(() => reviewItems(editor, { hidden, resolved: showResolved }), [editor, version, hidden, showResolved]);
  const resolvedCount = useMemo(() => editor.comments().filter((c) => c.done).length, [editor, version]);
  useEffect(() => {
    if (!activeComment) return;
    body.current?.querySelector(`[data-comment-id="${CSS.escape(activeComment)}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeComment]);
  const toggle = (name: string) => editor.setHiddenReviewers(hidden.includes(name) ? hidden.filter((h) => h !== name) : [...hidden, name]);
  return (
    <div ref={body} className="fl-panel-body" data-testid="changes-tab">
      {reviewers.length > 0 && (
        <div className="fl-chips" role="group" aria-label={t('review.reviewers')}>
          {reviewers.map((name) => (
            <button key={name} type="button" className={cx('fl-chip', !hidden.includes(name) && 'is-on')} aria-pressed={!hidden.includes(name)} data-testid={`chip-${name}`} onClick={() => toggle(name)}>
              <span className="fl-chip-dot" style={{ background: authorColor(name) }} aria-hidden="true" />
              {name}
            </button>
          ))}
        </div>
      )}
      {mobile && composerRange && <DraftCard />}
      <ul className="fl-card-list" data-testid="review-list">
        {items.map((it) => (
          <li key={it.key}>
            {it.kind === 'comment' ? (
              <CommentCard
                item={it}
                variant="panel"
                active={activeComment === it.thread.id}
                onActivate={() => {
                  setActiveChange(null);
                  editor.selectComment(it.thread.id);
                }}
              />
            ) : (
              <ChangeCard
                item={it}
                active={activeChange === it.key}
                onActivate={() => {
                  setActiveChange(it.key);
                  editor.selectComment(null);
                  editor.selectChange(it.changes[0]);
                }}
              />
            )}
          </li>
        ))}
      </ul>
      {!items.length && (
        <div className="fl-empty" data-testid="review-empty">
          <ListChecks size={22} aria-hidden="true" />
          <p><b>{t('review.empty')}</b></p>
          <p>{t('review.emptyHint')}</p>
        </div>
      )}
      <div className="fl-panel-foot">
        {resolvedCount > 0 && <Check label={t('review.showResolved')} checked={showResolved} onChange={setShowResolved} testId="show-resolved" />}
        {mobile && mode !== 'viewing' && !composerRange && (
          <button type="button" className="fl-btn is-small" disabled={!selected} data-testid="panel-add-comment" onClick={openComposer}>
            <MessageSquarePlus size={15} /> {t('review.addComment')}
          </button>
        )}
      </div>
    </div>
  );
}

function SessionBox() {
  const { t } = useI18n();
  const { collab, relay, startSession, leaveSession, toast } = useUI();
  const [starting, setStarting] = useState(false);
  const invite = useRef<HTMLInputElement>(null);
  const qr = useMemo(() => (collab?.link ? qrSvg(collab.link) : ''), [collab?.link]);
  if (!collab) {
    return (
      <>
        <p className="fl-note">{t('settings.collabIntro')}</p>
        {!relay && <p className="fl-note is-warn">{t('settings.collabNoRelay')}</p>}
        <button
          type="button"
          className="fl-btn is-dark is-block"
          disabled={!relay || starting}
          data-testid="start-session"
          onClick={async () => {
            setStarting(true);
            try {
              await startSession();
            } finally {
              setStarting(false);
            }
          }}
        >
          <Radio size={16} /> {starting ? t('settings.starting') : t('settings.startSession')}
        </button>
      </>
    );
  }
  const copy = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard');
      await navigator.clipboard.writeText(collab.link);
      toast(t('settings.inviteCopied'));
    } catch {
      invite.current?.select();
      toast(t('settings.inviteCopyFailed'));
    }
  };
  return (
    <div className="fl-session" data-testid="session-box">
      <div className={cx('fl-session-status', `is-${collab.status}`)} role="status">
        <span className="fl-dot" aria-hidden="true" />
        {t(collabStatusKey(collab.status))}
      </div>
      <div className="fl-invite">
        <input ref={invite} className="fl-input" readOnly value={collab.link} aria-label={t('settings.copyInvite')} data-testid="invite-link" onFocus={(e) => e.target.select()} />
        <button type="button" className="fl-btn is-small" data-testid="copy-invite" onClick={copy}><Copy size={14} /> {t('settings.copyInvite')}</button>
      </div>
      {qr && <div className="fl-qr" role="img" aria-label={t('settings.qr')} title={t('settings.qr')} dangerouslySetInnerHTML={{ __html: qr }} />}
      <div className="fl-subhead">{t('settings.inSession')}</div>
      <ul className="fl-people-list">
        {collab.participants.map((p) => (
          <li key={p.clientID}><Avatar name={p.name} color={p.color} size="sm" /> {p.name}{p.self ? ` (${t('settings.you')})` : ''}</li>
        ))}
      </ul>
      <button type="button" className="fl-btn is-small" data-testid="leave-session" onClick={leaveSession}><LogOut size={14} /> {t('settings.leave')}</button>
    </div>
  );
}

function SettingsTab() {
  const { t, locale, setLocale } = useI18n();
  const { user, setUser, scheme, setScheme, rulersOn, setRulersOn, mobile } = useUI();
  const cmd = useCommands();
  const [name, setName] = useState(user.name);
  useEffect(() => setName(user.name), [user.name]);
  const commitName = () => {
    const v = name.trim();
    if (v && v !== user.name) setUser({ name: v });
    else setName(user.name);
  };
  return (
    <div className="fl-panel-body fl-settings" data-testid="settings-tab">
      <section>
        <h3 className="fl-section-title">{t('settings.collaboration')}</h3>
        <label className="fl-field-label" htmlFor="fl-user-name">{t('settings.yourName')}</label>
        <input id="fl-user-name" className="fl-input" value={name} placeholder={t('settings.yourName')} aria-describedby="fl-user-note" data-testid="user-name" onChange={(e) => setName(e.target.value)} onBlur={commitName} onKeyDown={(e) => { if (e.key === 'Enter') commitName(); }} />
        <p id="fl-user-note" className="fl-note">{t('settings.yourNameNote')}</p>
        <SessionBox />
      </section>
      <section>
        <h3 className="fl-section-title">{t('settings.appearance')}</h3>
        <div className="fl-segmented is-wide" role="radiogroup" aria-label={t('settings.theme')}>
          <button type="button" role="radio" aria-checked={scheme === 'light'} className={cx(scheme === 'light' && 'is-on')} data-testid="scheme-light" onMouseDown={keepFocus} onClick={() => setScheme('light')}><Sun size={15} /> {t('settings.light')}</button>
          <button type="button" role="radio" aria-checked={scheme === 'dark'} className={cx(scheme === 'dark' && 'is-on')} data-testid="scheme-dark" onMouseDown={keepFocus} onClick={() => setScheme('dark')}><Moon size={15} /> {t('settings.dark')}</button>
        </div>
        {!mobile && <Check label={t('settings.rulers')} checked={rulersOn} onChange={setRulersOn} testId="show-rulers" />}
      </section>
      <section>
        <h3 className="fl-section-title"><label htmlFor="fl-locale">{t('settings.language')}</label></h3>
        <select id="fl-locale" className="fl-input" value={locale} data-testid="locale" onChange={(e) => setLocale(e.target.value as typeof locale)}>
          {LOCALES.map((l) => <option key={l.id} value={l.id}>{l.id === 'en' ? l.native : `${l.native} · ${l.english}`}</option>)}
        </select>
        <p className="fl-note">{t('settings.languageNote')}</p>
      </section>
      <section>
        <h3 className="fl-section-title">{t('settings.learnMore')}</h3>
        <ul className="fl-links">
          <li><button type="button" className="fl-link" onClick={cmd.shortcuts}><Keyboard size={15} /> {t('menu.shortcuts')}</button></li>
          <li><button type="button" className="fl-link" onClick={cmd.about}><Info size={15} /> {t('menu.about')}</button></li>
          <li><button type="button" className="fl-link" onClick={cmd.reportIssue}><Bug size={15} /> {t('menu.reportIssue')}</button></li>
          <li><button type="button" className="fl-link" onClick={() => cmd.navigation('headings')}><BookOpen size={15} /> {t('menu.navigation')}</button></li>
        </ul>
      </section>
    </div>
  );
}

/** The panel at the right: Changes (comments and tracked changes) and Settings. */
export function SidePanel() {
  const { t } = useI18n();
  const { editor, store, panelTab, setPanelTab, mobile, setPanelOpen } = useUI();
  const version = useSnapshot(store, (s) => `${s.commentsVersion}:${s.changesVersion}`);
  const hidden = useSnapshot(store, (s) => s.hiddenReviewers);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const count = useMemo(() => reviewItems(editor, { hidden }).length, [editor, version, hidden]);
  const tabs: { id: SidePanelTab; label: string; icon: ReactNode }[] = [
    { id: 'changes', label: t('panel.changes'), icon: <ListChecks size={15} /> },
    { id: 'settings', label: t('panel.settings'), icon: <Settings2 size={15} /> },
  ];
  return (
    <aside id="fl-side-panel" className={cx('fl-panel', mobile && 'is-sheet')} aria-label={t('panel.label')} data-testid="side-panel">
      <div className="fl-panel-head">
        <div className="fl-segmented is-tabs" role="tablist" aria-label={t('panel.tabs')}>
          {tabs.map((tab) => (
            <button key={tab.id} type="button" role="tab" aria-selected={panelTab === tab.id} className={cx(panelTab === tab.id && 'is-on')} data-testid={`panel-tab-${tab.id}`} onClick={() => setPanelTab(tab.id)}>
              {tab.icon}
              <span>{tab.label}</span>
              {tab.id === 'changes' && count > 0 && <span className="fl-count" data-testid="changes-count">{count}</span>}
            </button>
          ))}
        </div>
        {mobile && <button type="button" className="fl-icon-btn" aria-label={t('common.close')} onClick={() => setPanelOpen(false)}><X size={18} /></button>}
      </div>
      <div role="tabpanel" aria-label={panelTab === 'changes' ? t('panel.changes') : t('panel.settings')} className="fl-panel-scroll">
        {panelTab === 'changes' ? <ChangesTab /> : <SettingsTab />}
      </div>
    </aside>
  );
}
