import type { NavTab } from '@folioline/core';
import { ArrowLeft, Bookmark, ChevronDown, ChevronUp, Plus, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSnapshot, useT, useUI } from './context';
import { Check, cx, keepFocus } from './controls';

function Headings() {
  const t = useT();
  const { editor, store, mobile, setNavOpen } = useUI();
  useSnapshot(store, (s) => s.layoutVersion);
  const selFrom = useSnapshot(store, (s) => (s.cursor ? editor.view.state.selection.from : 0));
  const [q, setQ] = useState('');
  const headings = editor.headings();
  const current = [...headings].reverse().find((h) => h.pos <= selFrom)?.pos ?? -1;
  const shown = headings.filter((h) => h.text.toLowerCase().includes(q.trim().toLowerCase()));
  const min = Math.min(...headings.map((h) => h.level), 9);
  const listRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    listRef.current?.querySelector('.is-current')?.scrollIntoView({ block: 'nearest' });
  }, [current]);
  return (
    <div className="fl-nav-panel" role="tabpanel" aria-label={t('nav.headings')}>
      <label className="fl-searchbox">
        <Search size={15} aria-hidden="true" />
        <input type="search" role="searchbox" aria-label={t('nav.searchDocument')} placeholder={t('nav.searchDocument')} value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      {headings.length ? (
        <ul className="fl-nav-list" ref={listRef} data-testid="nav-headings">
          {shown.map((h) => (
            <li key={h.pos}>
              <button
                type="button"
                className={cx('fl-nav-heading', h.pos === current && 'is-current')}
                dir="auto"
                style={{ paddingInlineStart: 8 + (h.level - min) * 14 }}
                title={h.text}
                onClick={() => {
                  editor.goToPos(h.pos + 1);
                  if (mobile) setNavOpen(false);
                }}
              >
                {h.text}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="fl-nav-empty">{t('nav.noHeadings')}</p>
      )}
    </div>
  );
}

function Find() {
  const t = useT();
  const { editor, store, mobile, setNavOpen, toast } = useUI();
  const search = useSnapshot(store, (s) => s.search);
  const [query, setQuery] = useState(() => editor.searchResults()?.query ?? '');
  const [caseSensitive, setCase] = useState(false);
  const [wholeWord, setWhole] = useState(false);
  const [replaceOn, setReplaceOn] = useState(false);
  const [replaceWith, setReplaceWith] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.focus();
    input.current?.select();
  }, []);
  // Searched a moment after typing stops. Enter and the buttons first run a search that is still
  // waiting, so they never act on the previous query.
  const pending = useRef<(() => void) | null>(null);
  useEffect(() => {
    const run = () => {
      clearTimeout(id);
      pending.current = null;
      editor.search({ query, caseSensitive, wholeWord, regex: false });
    };
    const id = setTimeout(run, 120);
    pending.current = run;
    return () => {
      clearTimeout(id);
      pending.current = null;
    };
  }, [editor, query, caseSensitive, wholeWord]);
  const step = (dir: 1 | -1) => {
    pending.current?.();
    editor.searchStep(dir);
  };
  const replaceOne = () => {
    pending.current?.();
    editor.replace(replaceWith);
  };
  const replaceAll = () => {
    pending.current?.();
    toast(t('nav.replaced', { count: editor.replaceAll(replaceWith) }));
  };
  useEffect(() => () => editor.clearSearch(), [editor]);
  const results = useMemo(() => editor.searchResults()?.results ?? [], [editor, search]);
  const listRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    listRef.current?.querySelector('.is-current')?.scrollIntoView({ block: 'nearest' });
  }, [search.index]);
  const ro = editor.readOnly;
  return (
    <div className="fl-nav-panel" role="tabpanel" aria-label={t('nav.find')}>
      <label className="fl-searchbox">
        <Search size={15} aria-hidden="true" />
        <input
          ref={input}
          type="search"
          role="searchbox"
          aria-label={t('nav.searchDocument')}
          placeholder={t('nav.searchDocument')}
          value={query}
          data-testid="find-input"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              step(e.shiftKey ? -1 : 1);
            }
          }}
        />
        {query && (
          <button type="button" className="fl-icon-btn is-small" aria-label={t('nav.clearSearch')} onClick={() => { setQuery(''); input.current?.focus(); }}>
            <X size={14} />
          </button>
        )}
      </label>
      <div className="fl-find-options" role="group" aria-label={t('nav.searchOptions')}>
        <Check label={t('nav.matchCase')} checked={caseSensitive} onChange={setCase} testId="find-case" />
        <Check label={t('nav.wholeWords')} checked={wholeWord} onChange={setWhole} testId="find-whole" />
      </div>
      <div className="fl-find-bar">
        <span className="fl-find-count" role="status" data-testid="find-count">{query ? (search.count ? t('nav.results', { count: search.count }) : t('nav.noResults')) : ''}</span>
        <button type="button" className="fl-icon-btn" aria-label={t('nav.previous')} title={t('nav.previous')} disabled={!search.count} data-testid="find-prev" onClick={() => step(-1)}><ChevronUp size={16} /></button>
        <button type="button" className="fl-icon-btn" aria-label={t('nav.next')} title={t('nav.next')} disabled={!search.count} data-testid="find-next" onClick={() => step(1)}><ChevronDown size={16} /></button>
        {!ro && (
          <button type="button" className={cx('fl-btn is-small is-quiet', replaceOn && 'is-active')} aria-pressed={replaceOn} data-testid="find-replace-toggle" onClick={() => setReplaceOn(!replaceOn)}>{t('nav.replace')}</button>
        )}
      </div>
      {replaceOn && !ro && (
        <div className="fl-replace">
          <input className="fl-input" aria-label={t('nav.replaceWith')} placeholder={t('nav.replaceWith')} value={replaceWith} data-testid="replace-input" onChange={(e) => setReplaceWith(e.target.value)} />
          <div className="fl-replace-actions">
            <button type="button" className="fl-btn is-small" disabled={!search.count} data-testid="replace-one" onClick={replaceOne}>{t('nav.replaceOne')}</button>
            <button type="button" className="fl-btn is-small" disabled={!search.count} data-testid="replace-all" onClick={replaceAll}>{t('nav.replaceAll')}</button>
          </div>
        </div>
      )}
      <ul className="fl-nav-list fl-find-results" ref={listRef} aria-label={t('nav.resultsList')} data-testid="find-results">
        {results.slice(0, 500).map((r, i) => (
          <li key={`${r.from}-${i}`}>
            <button
              type="button"
              className={cx('fl-find-result', i === search.index && 'is-current')}
              dir="auto"
              onClick={() => {
                editor.search({ index: i });
                if (mobile) setNavOpen(false);
              }}
            >
              {r.context.slice(0, r.matchStart)}
              <mark>{r.context.slice(r.matchStart, r.matchEnd)}</mark>
              {r.context.slice(r.matchEnd)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Bookmarks() {
  const t = useT();
  const { editor, store, openModal, mobile, setNavOpen } = useUI();
  useSnapshot(store, (s) => s.version);
  const [q, setQ] = useState('');
  const all = editor.bookmarks();
  const shown = all.filter((b) => b.name.toLowerCase().includes(q.trim().toLowerCase()));
  const selFrom = editor.view.state.selection.from;
  return (
    <div className="fl-nav-panel" role="tabpanel" aria-label={t('nav.bookmarks')}>
      <label className="fl-searchbox">
        <Search size={15} aria-hidden="true" />
        <input
          type="search"
          role="searchbox"
          aria-label={t('nav.searchBookmarks')}
          placeholder={t('nav.searchBookmarks')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && shown[0]) editor.goToBookmark(shown[0].name);
          }}
        />
      </label>
      {all.length ? (
        <>
          {q && <div className="fl-nav-meta">{t('nav.countFiltered', { shown: shown.length, total: all.length })}</div>}
          <ul className="fl-nav-list" data-testid="nav-bookmarks">
            {shown.map((b) => {
              const here = selFrom >= b.pos && selFrom <= b.pos + b.text.length + 2;
              return (
                <li key={b.id}>
                  <button type="button" className={cx('fl-nav-bookmark', here && 'is-current')} title={here ? t('nav.atCaret') : b.text} onClick={() => { editor.goToBookmark(b.name); if (mobile) setNavOpen(false); }}>
                    <Bookmark size={14} aria-hidden="true" />
                    <span className="fl-nav-bookmark-name">{b.name}</span>
                    {b.text && <span className="fl-nav-bookmark-text">{b.text}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
          {!shown.length && <p className="fl-nav-empty">{t('nav.noBookmarkMatches')}</p>}
        </>
      ) : (
        <div className="fl-nav-empty">
          <Bookmark size={22} aria-hidden="true" />
          <p><b>{t('nav.noBookmarks')}</b></p>
          <p>{t('nav.noBookmarksHint')}</p>
        </div>
      )}
      {!editor.readOnly && (
        <button type="button" className="fl-btn is-small fl-nav-add" data-testid="nav-add-bookmark" onClick={() => openModal('bookmark')}>
          <Plus size={14} /> {t('nav.addBookmark')}
        </button>
      )}
    </div>
  );
}

const TABS: { id: NavTab; key: 'nav.headings' | 'nav.find' | 'nav.bookmarks' }[] = [
  { id: 'headings', key: 'nav.headings' },
  { id: 'find', key: 'nav.find' },
  { id: 'bookmarks', key: 'nav.bookmarks' },
];

/** Headings, search and bookmarks beside the pages. */
export function NavigationPane() {
  const t = useT();
  const { navTab, setNavTab, setNavOpen, editor } = useUI();
  return (
    <aside className="fl-nav" role="complementary" aria-label={t('nav.title')} data-testid="nav-pane" onKeyDown={(e) => { if (e.key === 'Escape') { setNavOpen(false); editor.focus(); } }}>
      <div className="fl-nav-head">
        <button type="button" className="fl-icon-btn" aria-label={t('nav.close')} title={t('nav.close')} data-testid="nav-close" onClick={() => { setNavOpen(false); editor.focus(); }}>
          <ArrowLeft size={18} />
        </button>
        <h2>{t('nav.title')}</h2>
      </div>
      <div className="fl-segmented" role="tablist" aria-label={t('nav.title')}>
        {TABS.map((tab) => (
          <button key={tab.id} type="button" role="tab" aria-selected={navTab === tab.id} className={cx(navTab === tab.id && 'is-on')} data-testid={`nav-tab-${tab.id}`} onMouseDown={keepFocus} onClick={() => setNavTab(tab.id)}>
            {t(tab.key)}
          </button>
        ))}
      </div>
      {navTab === 'headings' && <Headings />}
      {navTab === 'find' && <Find />}
      {navTab === 'bookmarks' && <Bookmarks />}
    </aside>
  );
}
