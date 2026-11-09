import { FONT_SIZES, type MessageKey } from '@folioline/core';
import {
  ALIGNS,
  applyBorders,
  BORDER_PRESETS,
  BORDER_STYLES,
  BORDER_WIDTHS,
  type BorderPen,
  type BorderPreset,
  canRunTableAction,
  displayStyleName,
  fontGroups,
  fontStack,
  highlightCss,
  lineSpacingEntries,
  markupEntries,
  markupLabels,
  parseFontSize,
  PRESET_KEYS,
  presetHasSide,
  repaintBorders,
  sampleStroke,
  selectedImage,
  setCellBackground,
  setFontFamily,
  setFontSize,
  setHighlight,
  setParagraphStyle,
  setTextColor,
  shortcut,
  tableMoreEntries,
  transformEntries,
  wrapEntries,
  wrapKind,
  wrapLabelKey,
} from '@folioline/core/views';
import {
  Baseline,
  Bold,
  ChevronDown,
  Eye,
  Grid2x2,
  Highlighter,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListChevronsUpDown,
  ListIndentDecrease,
  ListIndentIncrease,
  ListOrdered,
  MessageSquarePlus,
  MessagesSquare,
  Paintbrush,
  PaintBucket,
  Pencil,
  Redo2,
  RemoveFormatting,
  RotateCw,
  ScanText,
  Settings2,
  Strikethrough,
  Subscript,
  Superscript,
  TableCellsMerge,
  TableCellsSplit,
  TableProperties,
  TextWrap,
  Underline,
  Undo2,
} from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { ColorPicker, HighlightPicker } from '../ColorPicker';
import { useCommands, useSnapshot, useT, useUI } from '../context';
import { cx, keepFocus, Popover } from '../controls';
import { Icon } from '../icons';
import { MenuButton, MenuList } from '../menu';

export type Variant = 'bar' | 'menu';
const ICON = 17;

function useCursor() {
  const { store } = useUI();
  return useSnapshot(store, (s) => s.cursor);
}

function useReadOnly() {
  const { store } = useUI();
  return useSnapshot(store, (s) => s.editMode === 'viewing');
}

/** An icon button in the bar, or an icon-and-label row in a menu. */
export function Tool({ icon, label, title, onClick, active, disabled, testId, variant, slot }: {
  icon: ReactNode;
  label: string;
  title?: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  testId?: string;
  variant: Variant;
  slot?: string;
}) {
  return (
    <button
      type="button"
      className={cx(variant === 'bar' ? 'fl-tool' : 'fl-tool-row', active && 'is-active')}
      aria-label={label}
      title={title ?? label}
      aria-pressed={active === undefined ? undefined : active}
      disabled={disabled}
      data-testid={testId}
      data-slot={slot}
      onMouseDown={keepFocus}
      onClick={onClick}
    >
      {icon}
      {variant === 'menu' && <span className="fl-tool-label">{label}</span>}
    </button>
  );
}

/** A labelled control row inside "More". */
function Labelled({ label, variant, children }: { label: string; variant: Variant; children: ReactNode }) {
  if (variant === 'bar') return <>{children}</>;
  return (
    <div className="fl-tool-labelled">
      <span className="fl-tool-label">{label}</span>
      <span className="fl-tool-control">{children}</span>
    </div>
  );
}

/** A button with a caret opening a panel. */
function Dropdown({ label, title, icon, text, children, testId, disabled, active, slot, align, className }: {
  label: string;
  title?: string;
  icon?: ReactNode;
  text?: ReactNode;
  children: (close: () => void) => ReactNode;
  testId?: string;
  disabled?: boolean;
  active?: boolean;
  slot?: string;
  align?: 'start' | 'end' | 'center';
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        ref={ref}
        type="button"
        className={cx('fl-tool fl-tool-drop', (open || active) && 'is-active', className)}
        aria-label={label}
        title={title ?? label}
        aria-haspopup="true"
        aria-expanded={open}
        disabled={disabled}
        data-testid={testId}
        data-slot={slot}
        onMouseDown={keepFocus}
        onClick={() => setOpen(!open)}
      >
        {icon}
        {text !== undefined && <span className="fl-tool-text">{text}</span>}
        <ChevronDown size={12} className="fl-caret" />
      </button>
      <Popover anchor={ref.current} open={open} onClose={() => setOpen(false)} title={label} align={align}>
        {children(() => setOpen(false))}
      </Popover>
    </>
  );
}

/** Main button applying the last colour, with a caret opening the colour panel. */
function ColorSplit({ icon, label, color, onApply, panel, testId, disabled, slot }: {
  icon: ReactNode;
  label: string;
  color: string;
  onApply: () => void;
  panel: (close: () => void) => ReactNode;
  testId: string;
  disabled?: boolean;
  slot: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  return (
    <span ref={ref} className="fl-colorsplit" data-slot={slot}>
      <button type="button" className="fl-tool fl-colorsplit-main" aria-label={label} title={label} disabled={disabled} data-testid={testId} onMouseDown={keepFocus} onClick={onApply}>
        {icon}
        <span className="fl-colorsplit-bar" style={{ background: color }} aria-hidden="true" />
      </button>
      <button type="button" className={cx('fl-tool fl-colorsplit-caret', open && 'is-active')} aria-label={label} title={label} aria-haspopup="dialog" aria-expanded={open} disabled={disabled} data-testid={`${testId}-caret`} onMouseDown={keepFocus} onClick={() => setOpen(!open)}>
        <ChevronDown size={11} />
      </button>
      <Popover anchor={ref.current} open={open} onClose={() => setOpen(false)} title={label}>
        {panel(() => setOpen(false))}
      </Popover>
    </span>
  );
}

// -----------------------------------------------------------------------------------------------
// History

export function HistoryGroup({ variant }: { variant: Variant }) {
  const t = useT();
  const { editor, store } = useUI();
  const canUndo = useSnapshot(store, (s) => s.canUndo);
  const canRedo = useSnapshot(store, (s) => s.canRedo);
  return (
    <>
      <Tool variant={variant} icon={<Undo2 size={ICON} />} label={t('toolbar.undo')} title={canUndo ? t('toolbar.undo') : t('toolbar.nothingToUndo')} disabled={!canUndo} testId="tb-undo" slot="history.undo" onClick={() => editor.undo()} />
      <Tool variant={variant} icon={<Redo2 size={ICON} />} label={t('toolbar.redo')} title={canRedo ? t('toolbar.redo') : t('toolbar.nothingToRedo')} disabled={!canRedo} testId="tb-redo" slot="history.redo" onClick={() => editor.redo()} />
    </>
  );
}

// -----------------------------------------------------------------------------------------------
// Styles and fonts

export function StyleGroup({ variant }: { variant: Variant }) {
  const t = useT();
  const { editor, store } = useUI();
  const cursor = useCursor();
  const ro = useReadOnly();
  useSnapshot(store, (s) => s.stylesVersion);
  const styles = editor.docx.styles.paragraphStyleList();
  const cur = cursor?.styleId ?? 'Normal';
  const curLabel = styles.find((s) => s.id === cur)?.label ?? displayStyleName(editor.docx.styles.get(cur)?.name ?? cur);
  return (
    <Labelled label={t('toolbar.paragraphStyle')} variant={variant}>
      <Dropdown label={t('toolbar.style')} text={curLabel} disabled={ro} testId="tb-style" slot="styles.style" className="fl-picker is-style">
        {(close) => (
          <div className="fl-listbox fl-style-list" role="listbox" aria-label={t('toolbar.style')}>
            {styles.map((s) => {
              const eff = editor.docx.styles.effectiveRun(s.id, null, {});
              const size = Math.min(22, Math.max(12, (eff.size ?? 22) / 2));
              return (
                <button
                  key={s.id}
                  type="button"
                  role="option"
                  aria-selected={s.id === cur}
                  aria-label={s.label}
                  className={cx('fl-option', s.id === cur && 'is-selected')}
                  data-testid={`style-${s.id}`}
                  onMouseDown={keepFocus}
                  onClick={() => {
                    close();
                    setParagraphStyle(editor.activeView, editor.docx, s.id);
                    editor.focus();
                  }}
                >
                  <span style={{ fontSize: size, fontWeight: eff.bold ? 700 : 400, fontStyle: eff.italic ? 'italic' : undefined, color: eff.color?.val && eff.color.val !== 'auto' ? `#${eff.color.val}` : undefined }}>{s.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </Dropdown>
    </Labelled>
  );
}

function FontList({ value, onPick }: { value: string; onPick: (f: string) => void }) {
  const t = useT();
  const { editor } = useUI();
  const [q, setQ] = useState('');
  const docFonts = useMemo(() => editor.documentFonts().filter(Boolean).sort((a, b) => a.localeCompare(b)), [editor]);
  const groups = fontGroups(t, docFonts, q);
  return (
    <div className="fl-fontlist">
      <input type="search" className="fl-input fl-font-search" role="searchbox" aria-label={t('toolbar.searchFonts')} placeholder={t('toolbar.searchFonts')} value={q} autoFocus onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && q.trim()) onPick(groups[0]?.fonts[0] ?? q.trim()); }} />
      <div className="fl-listbox" role="listbox" aria-label={t('toolbar.fontFamilyTitle')}>
        {groups.map((g) => (
          <div key={g.label} role="group" aria-label={g.label}>
            <div className="fl-listbox-heading">{g.label}</div>
            {g.fonts.map((f) => (
              <button key={f} type="button" role="option" aria-selected={f === value} className={cx('fl-option', f === value && 'is-selected')} style={{ fontFamily: fontStack(f) }} data-testid={`font-${f}`} onMouseDown={keepFocus} onClick={() => onPick(f)}>
                {f}
              </button>
            ))}
          </div>
        ))}
        {!groups.length && <div className="fl-empty-small">{t('toolbar.noFonts')}</div>}
      </div>
    </div>
  );
}

export function FontGroup({ variant }: { variant: Variant }) {
  const t = useT();
  const { editor } = useUI();
  const cursor = useCursor();
  const ro = useReadOnly();
  const family = cursor?.fontFamily ?? '';
  const size = cursor?.fontSize ?? null;
  const [text, setText] = useState(size ? String(size) : '');
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLSpanElement>(null);
  useEffect(() => setText(size ? String(size) : ''), [size]);
  const apply = (v: string) => {
    const n = parseFontSize(v);
    if (n !== null) setFontSize(editor.activeView, n);
    else setText(size ? String(size) : '');
    setOpen(false);
    editor.focus();
  };
  const step = (dir: 1 | -1) => {
    editor.runAction(dir > 0 ? 'fontGrow' : 'fontShrink');
    editor.focus();
  };
  return (
    <>
      <Labelled label={t('toolbar.font')} variant={variant}>
        <Dropdown label={t('toolbar.fontFamily', { font: family || '—' })} title={t('toolbar.fontFamilyTitle')} text={<span style={{ fontFamily: fontStack(family) }}>{family || '—'}</span>} disabled={ro} testId="tb-font" slot="font.family" className="fl-picker is-font">
          {(close) => <FontList value={family} onPick={(f) => { close(); setFontFamily(editor.activeView, f); editor.focus(); }} />}
        </Dropdown>
      </Labelled>
      <Labelled label={t('toolbar.fontSize')} variant={variant}>
        <span ref={wrap} className="fl-stepper" role="group" aria-label={t('toolbar.fontSize')} data-slot="font.size">
          <button type="button" className="fl-stepper-btn" aria-label={t('toolbar.decreaseFont')} title={t('toolbar.decreaseFont')} disabled={ro} data-testid="tb-size-down" onMouseDown={keepFocus} onClick={() => step(-1)}>−</button>
          <input
            className="fl-stepper-value"
            role="combobox"
            aria-label={t('toolbar.fontSize')}
            aria-expanded={open}
            aria-haspopup="listbox"
            inputMode="decimal"
            autoComplete="off"
            value={text}
            disabled={ro}
            data-testid="tb-size"
            onChange={(e) => setText(e.target.value)}
            onFocus={(e) => e.target.select()}
            onClick={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                apply(text);
              } else if (e.key === 'Escape') {
                setText(size ? String(size) : '');
                setOpen(false);
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setOpen(true);
              }
            }}
          />
          <button type="button" className="fl-stepper-btn" aria-label={t('toolbar.increaseFont')} title={t('toolbar.increaseFont')} disabled={ro} data-testid="tb-size-up" onMouseDown={keepFocus} onClick={() => step(1)}>+</button>
        </span>
        <Popover anchor={wrap.current} open={open} onClose={() => setOpen(false)} title={t('toolbar.fontSizes')} align="center">
          <div className="fl-listbox fl-size-list" role="listbox" aria-label={t('toolbar.fontSizes')}>
            {FONT_SIZES.map((s) => (
              <button key={s} type="button" role="option" aria-selected={s === size} className={cx('fl-option', s === size && 'is-selected')} data-testid={`size-${s}`} onMouseDown={keepFocus} onClick={() => apply(String(s))}>{s}</button>
            ))}
          </div>
        </Popover>
      </Labelled>
    </>
  );
}

// -----------------------------------------------------------------------------------------------
// Text formatting

export function TextGroup({ variant }: { variant: Variant }) {
  const t = useT();
  const { ui, editor } = useUI();
  const { tools } = ui;
  const cmd = useCommands();
  const cursor = useCursor();
  const ro = useReadOnly();
  const [, rerender] = useState(0);
  const marks = (
    <>
      <Tool variant="bar" icon={<Bold size={ICON} />} label={t('toolbar.bold')} active={!!cursor?.bold} disabled={ro} testId="tb-bold" slot="text.bold" onClick={cmd.bold} />
      <Tool variant="bar" icon={<Italic size={ICON} />} label={t('toolbar.italic')} active={!!cursor?.italic} disabled={ro} testId="tb-italic" slot="text.italic" onClick={cmd.italic} />
      <Tool variant="bar" icon={<Underline size={ICON} />} label={t('toolbar.underline')} active={!!cursor?.underline} disabled={ro} testId="tb-underline" slot="text.underline" onClick={cmd.underline} />
      <Tool variant="bar" icon={<Strikethrough size={ICON} />} label={t('toolbar.strikethrough')} active={!!cursor?.strike} disabled={ro} testId="tb-strike" slot="text.strike" onClick={cmd.strike} />
    </>
  );
  const color = (
    <ColorSplit
      slot="text.color"
      icon={<Baseline size={ICON} />}
      label={t('toolbar.fontColor')}
      color={`#${tools.color}`}
      testId="tb-color"
      disabled={ro}
      onApply={() => { setTextColor(editor.activeView, tools.color); editor.focus(); }}
      panel={(close) => (
        <ColorPicker label={t('toolbar.fontColor')} value={cursor?.color ?? null} docx={editor.docx} onPick={(hex) => {
          close();
          if (hex) tools.color = hex;
          rerender((n) => n + 1);
          setTextColor(editor.activeView, hex);
          editor.focus();
        }} />
      )}
    />
  );
  const highlight = (
    <ColorSplit
      slot="text.highlight"
      icon={<Highlighter size={ICON} />}
      label={t('toolbar.highlight')}
      color={highlightCss(tools.highlight)}
      testId="tb-highlight"
      disabled={ro}
      onApply={() => { setHighlight(editor.activeView, tools.highlight); editor.focus(); }}
      panel={(close) => (
        <HighlightPicker label={t('toolbar.highlight')} value={cursor?.highlight ?? null} onPick={(name) => {
          close();
          if (name) tools.highlight = name;
          rerender((n) => n + 1);
          setHighlight(editor.activeView, name);
          editor.focus();
        }} />
      )}
    />
  );
  const link = <Tool variant={variant === 'menu' ? 'menu' : 'bar'} icon={<Link2 size={ICON} />} label={t('toolbar.insertLink')} active={!!cursor?.link} disabled={ro} testId="tb-link" slot="text.link" onClick={cmd.link} />;
  if (variant === 'menu') {
    return (
      <>
        <div className="fl-tool-line">{marks}</div>
        <Labelled label={t('toolbar.fontColor')} variant="menu">{color}</Labelled>
        <Labelled label={t('toolbar.highlight')} variant="menu">{highlight}</Labelled>
        {link}
      </>
    );
  }
  return <>{marks}{color}{highlight}{link}</>;
}

export function ScriptGroup({ variant }: { variant: Variant }) {
  const t = useT();
  const cmd = useCommands();
  const cursor = useCursor();
  const ro = useReadOnly();
  return (
    <>
      <Tool variant={variant} icon={<Superscript size={ICON} />} label={t('toolbar.superscript')} title={`${t('toolbar.superscript')} (${shortcut('Ctrl+Shift+=')})`} active={!!cursor?.superscript} disabled={ro} testId="tb-superscript" slot="script.superscript" onClick={cmd.superscript} />
      <Tool variant={variant} icon={<Subscript size={ICON} />} label={t('toolbar.subscript')} title={`${t('toolbar.subscript')} (${shortcut('Ctrl+=')})`} active={!!cursor?.subscript} disabled={ro} testId="tb-subscript" slot="script.subscript" onClick={cmd.subscript} />
    </>
  );
}

// -----------------------------------------------------------------------------------------------
// Paragraph

export function AlignGroup({ variant }: { variant: Variant }) {
  const t = useT();
  const cmd = useCommands();
  const cursor = useCursor();
  const ro = useReadOnly();
  const cur = ALIGNS.find((a) => a.value === (cursor?.align ?? 'left')) ?? ALIGNS[0];
  return (
    <Labelled label={t('toolbar.alignment')} variant={variant}>
      <Dropdown label={t(cur.key)} icon={<Icon name={cur.icon} size={ICON} />} disabled={ro} testId="tb-align" slot="alignment">
        {(close) => (
          <div className="fl-icon-row" role="group" aria-label={t('toolbar.alignment')}>
            {ALIGNS.map((a) => (
              <button key={a.value} type="button" className={cx('fl-tool', a.value === cur.value && 'is-active')} aria-label={t(a.key)} title={`${t(a.key)} (${shortcut(a.sc)})`} aria-pressed={a.value === cur.value} data-testid={`align-${a.value}`} onMouseDown={keepFocus} onClick={() => { close(); cmd[a.cmd](); }}>
                <Icon name={a.icon} size={ICON} />
              </button>
            ))}
          </div>
        )}
      </Dropdown>
    </Labelled>
  );
}

function LineSpacingMenu({ onClose }: { onClose: () => void }) {
  const t = useT();
  const { ui, store } = useUI();
  const snap = useSnapshot(store, (s) => s);
  return <MenuList entries={lineSpacingEntries(ui, snap)} onClose={onClose} label={t('toolbar.lineSpacing')} />;
}

export function ListGroup({ variant }: { variant: Variant }) {
  const t = useT();
  const cmd = useCommands();
  const cursor = useCursor();
  const ro = useReadOnly();
  return (
    <>
      <Tool variant={variant} icon={<List size={ICON} />} label={t('toolbar.bulletList')} active={cursor?.listKind === 'bullet'} disabled={ro} testId="tb-bullets" slot="lists.bullet" onClick={cmd.bulletList} />
      <Tool variant={variant} icon={<ListOrdered size={ICON} />} label={t('toolbar.numberedList')} active={cursor?.listKind === 'ordered'} disabled={ro} testId="tb-numbers" slot="lists.numbered" onClick={cmd.numberedList} />
      <Tool variant={variant} icon={<ListIndentDecrease size={ICON} />} label={t('toolbar.decreaseIndent')} disabled={ro || !cursor?.canOutdent} testId="tb-outdent" slot="lists.outdent" onClick={cmd.outdent} />
      <Tool variant={variant} icon={<ListIndentIncrease size={ICON} />} label={t('toolbar.increaseIndent')} disabled={ro} testId="tb-indent" slot="lists.indent" onClick={cmd.indent} />
      <Labelled label={t('toolbar.lineSpacing')} variant={variant}>
        <MenuButton label={t('toolbar.lineSpacing')} className="fl-tool fl-tool-drop" testId="tb-line-spacing" disabled={ro} render={(close) => <LineSpacingMenu onClose={close} />}>
          <ListChevronsUpDown size={ICON} />
          <ChevronDown size={12} className="fl-caret" />
        </MenuButton>
      </Labelled>
    </>
  );
}

export function FormatGroup({ variant }: { variant: Variant }) {
  const t = useT();
  const { store } = useUI();
  const cmd = useCommands();
  const painter = useSnapshot(store, (s) => s.painter);
  const ro = useReadOnly();
  return (
    <>
      <Tool variant={variant} icon={<Paintbrush size={ICON} />} label={t('toolbar.formatPainter')} active={painter} disabled={ro} testId="tb-painter" slot="format.painter" onClick={cmd.formatPainter} />
      <Tool variant={variant} icon={<RemoveFormatting size={ICON} />} label={t('toolbar.clearFormatting')} disabled={ro} testId="tb-clear" slot="format.clear" onClick={cmd.clearFormatting} />
    </>
  );
}

// -----------------------------------------------------------------------------------------------
// Tables (contextual)

function BorderIcon({ preset }: { preset: BorderPreset }) {
  const on = (side: string) => presetHasSide(preset, side);
  const s = (side: string) => (on(side) ? 'currentColor' : 'var(--fl-faint)');
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" fill="none" strokeWidth="1.6">
      <path d="M2 2h14" stroke={s('top')} /><path d="M2 16h14" stroke={s('bottom')} /><path d="M2 2v14" stroke={s('left')} /><path d="M16 2v14" stroke={s('right')} />
      <path d="M2 9h14" stroke={s('h')} strokeDasharray={on('h') ? undefined : '1 2'} /><path d="M9 2v14" stroke={s('v')} strokeDasharray={on('v') ? undefined : '1 2'} />
    </svg>
  );
}

function StyleSample({ style, width = 1 }: { style: string; width?: number }) {
  const { dash, width: w } = sampleStroke(style, width);
  return (
    <svg width="64" height="12" viewBox="0 0 64 12" aria-hidden="true">
      {style === 'double' && <><path d="M2 4h60M2 8h60" stroke="currentColor" strokeWidth="1" /></>}
      {style === 'triple' && <><path d="M2 3h60M2 6h60M2 9h60" stroke="currentColor" strokeWidth="1" /></>}
      {style !== 'double' && style !== 'triple' && <path d="M2 6h60" stroke="currentColor" strokeWidth={w} strokeDasharray={dash} />}
    </svg>
  );
}

export function TableGroup({ variant }: { variant: Variant }) {
  const t = useT();
  const { ui, editor, store, openModal } = useUI();
  const ro = useReadOnly();
  useSnapshot(store, (s) => s.version);
  const [, rerender] = useState(0);
  const view = editor.activeView;
  const state = view.state;
  const canMerge = canRunTableAction(state, 'mergeCells');
  const { pen } = ui.tools;
  const setPen = (p: Partial<BorderPen>) => {
    ui.tools.pen = { ...pen, ...p };
    rerender((n) => n + 1);
    repaintBorders(editor.activeView, ui.tools.pen);
    editor.focus();
  };
  return (
    <>
      <Labelled label={t('table.borders')} variant={variant}>
        <Dropdown label={t('table.borders')} icon={<Grid2x2 size={ICON} />} disabled={ro} testId="tb-borders" slot="table.borders">
          {(close) => (
            <div className="fl-icon-grid" role="group" aria-label={t('table.borders')}>
              {BORDER_PRESETS.map((p) => (
                <button key={p} type="button" className="fl-tool" aria-label={t(PRESET_KEYS[p])} title={t(PRESET_KEYS[p])} data-testid={`borders-${p}`} onMouseDown={keepFocus} onClick={() => { close(); applyBorders(editor.activeView, p, pen); editor.focus(); }}>
                  <BorderIcon preset={p} />
                </button>
              ))}
            </div>
          )}
        </Dropdown>
      </Labelled>
      <Labelled label={t('table.borderColor')} variant={variant}>
        <ColorSplit
          slot="table.borderColor"
          icon={<Pencil size={ICON} />}
          label={t('table.borderColor')}
          color={`#${pen.color}`}
          testId="tb-border-color"
          disabled={ro}
          onApply={() => setPen({})}
          panel={(close) => <ColorPicker label={t('table.borderColor')} value={pen.color} docx={editor.docx} onPick={(hex) => { close(); setPen({ color: hex ?? '000000' }); }} />}
        />
      </Labelled>
      <Labelled label={t('table.borderStyle')} variant={variant}>
        <Dropdown label={t('table.borderStyle')} icon={<StyleSample style={pen.style} />} disabled={ro} testId="tb-border-style" slot="table.borderStyle" className="fl-tool-sample">
          {(close) => (
            <div className="fl-listbox" role="listbox" aria-label={t('table.borderStyle')}>
              {BORDER_STYLES.map((s) => (
                <button key={s} type="button" role="option" aria-selected={pen.style === s} aria-label={t(`table.${s === 'single' ? 'solid' : s}` as MessageKey)} className={cx('fl-option', pen.style === s && 'is-selected')} onMouseDown={keepFocus} onClick={() => { close(); setPen({ style: s }); }}>
                  <StyleSample style={s} />
                </button>
              ))}
            </div>
          )}
        </Dropdown>
      </Labelled>
      <Labelled label={t('table.borderWidth')} variant={variant}>
        <Dropdown label={t('table.borderWidth')} icon={<StyleSample style="single" width={pen.width * 1.4} />} disabled={ro} testId="tb-border-width" slot="table.borderWidth" className="fl-tool-sample">
          {(close) => (
            <div className="fl-listbox" role="listbox" aria-label={t('table.borderWidth')}>
              {BORDER_WIDTHS.map((w) => (
                <button key={w} type="button" role="option" aria-selected={pen.width === w} className={cx('fl-option fl-width-option', pen.width === w && 'is-selected')} onMouseDown={keepFocus} onClick={() => { close(); setPen({ width: w }); }}>
                  <StyleSample style="single" width={w * 1.4} /> <span>{w} pt</span>
                </button>
              ))}
            </div>
          )}
        </Dropdown>
      </Labelled>
      <Labelled label={t('table.cellFill')} variant={variant}>
        <ColorSplit
          slot="table.cellFill"
          icon={<PaintBucket size={ICON} />}
          label={t('table.cellFill')}
          color="#FFF2CC"
          testId="tb-cell-fill"
          disabled={ro}
          onApply={() => { setCellBackground(editor.activeView, 'FFF2CC'); editor.focus(); }}
          panel={(close) => <ColorPicker label={t('table.cellFill')} value={null} docx={editor.docx} onPick={(hex) => { close(); setCellBackground(editor.activeView, hex); editor.focus(); }} />}
        />
      </Labelled>
      <Tool variant={variant} icon={<TableCellsMerge size={ICON} />} label={t('table.mergeCells')} title={canMerge ? t('table.mergeCells') : t('table.mergeNeedsSelection')} disabled={ro || !canMerge} testId="tb-merge" slot="table.merge" onClick={() => { editor.tableAction('mergeCells'); editor.focus(); }} />
      <Tool variant={variant} icon={<TableCellsSplit size={ICON} />} label={t('table.splitCell')} disabled={ro} testId="tb-split" slot="table.split" onClick={() => openModal('splitCell')} />
      <Labelled label={t('table.moreOptions')} variant={variant}>
        <MenuButton label={t('table.moreOptions')} className="fl-tool fl-tool-drop" testId="tb-table-more" disabled={ro} entries={() => tableMoreEntries(ui)}>
          <TableProperties size={ICON} />
          <ChevronDown size={12} className="fl-caret" />
        </MenuButton>
      </Labelled>
    </>
  );
}

// -----------------------------------------------------------------------------------------------
// Pictures (contextual)

export function ImageGroup({ variant }: { variant: Variant }) {
  const t = useT();
  const { ui, editor, store, openModal } = useUI();
  const ro = useReadOnly();
  useSnapshot(store, (s) => s.version);
  const img = selectedImage(editor.activeView.state);
  const kind = wrapKind(img?.node.attrs.anchor ?? null);
  return (
    <>
      <Tool variant={variant} icon={<ImageIcon size={ICON} />} label={t('toolbar.image')} title={t('image.insertDisabled')} disabled testId="tb-image-insert" slot="image.insert" onClick={() => undefined} />
      <Tool variant={variant} icon={<Settings2 size={ICON} />} label={t('image.properties')} disabled={ro || !img} testId="tb-image-props" slot="image.properties" onClick={() => openModal('imageProps')} />
      <Labelled label={t('image.wrap')} variant={variant}>
        <MenuButton label={t('image.wrap')} title={t('image.wrapTitle', { label: t(wrapLabelKey(kind)) })} className="fl-tool fl-tool-drop" testId="tb-image-wrap" disabled={ro || !img} entries={() => wrapEntries(ui)} menuLabel={t('image.wrap')}>
          <TextWrap size={ICON} />
          <ChevronDown size={12} className="fl-caret" />
        </MenuButton>
      </Labelled>
      <Tool variant={variant} icon={<ScanText size={ICON} />} label={t('image.altText')} disabled={ro || !img} testId="tb-alt-text" slot="image.alt" onClick={() => openModal('altText')} />
      <Labelled label={t('image.transform')} variant={variant}>
        <MenuButton label={t('image.transform')} className="fl-tool fl-tool-drop" testId="tb-image-transform" disabled={ro || !img} entries={() => transformEntries(ui)}>
          <RotateCw size={ICON} />
          <ChevronDown size={12} className="fl-caret" />
        </MenuButton>
      </Labelled>
    </>
  );
}

// -----------------------------------------------------------------------------------------------
// Review (always in the bar)

export function ReviewGroup() {
  const t = useT();
  const { ui, store, railOpen, setRailOpen, mobile, setPanelOpen, setPanelTab, panelOpen } = useUI();
  const cmd = useCommands();
  const selected = useSnapshot(store, (s) => !!s.cursor?.textSelected);
  const ro = useReadOnly();
  const markup = useSnapshot(store, (s) => s.markup);
  const labels = markupLabels(t);
  const entries = () => markupEntries(ui, store.getSnapshot());
  const commentsOn = mobile ? panelOpen : railOpen;
  return (
    <>
      <Tool variant="bar" icon={<MessageSquarePlus size={ICON} />} label={t('toolbar.comment')} title={selected ? t('toolbar.comment') : t('review.selectFirst')} disabled={ro || !selected} testId="tb-comment" slot="review.comment" onClick={cmd.comment} />
      <MenuButton label={labels[markup]} title={t('toolbar.markup', { mode: labels[markup] })} className="fl-tool fl-tool-drop" testId="tb-markup" entries={entries} menuLabel={t('menu.displayForReview')}>
        <Eye size={ICON} />
        <ChevronDown size={12} className="fl-caret" />
      </MenuButton>
      <Tool
        variant="bar"
        icon={<MessagesSquare size={ICON} />}
        label={t('toolbar.showComments')}
        active={commentsOn}
        testId="tb-show-comments"
        slot="review.showComments"
        onClick={() => {
          if (mobile) {
            setPanelTab('changes');
            setPanelOpen(!panelOpen);
            return;
          }
          // The cards beside the pages repeat the panel's list; without room for both, the panel closes.
          if (!railOpen && panelOpen && window.innerWidth < 1600) setPanelOpen(false);
          setRailOpen(!railOpen);
        }}
      />
    </>
  );
}
