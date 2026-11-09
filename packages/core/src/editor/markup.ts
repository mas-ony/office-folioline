/**
 * How tracked changes and comments are displayed: the Display for Review mode, the reviewers
 * whose markup is shown, per-author colours and the Track changes options. Everything here is a
 * display setting compiled into a scoped stylesheet; the document is not changed.
 */

/** All Markup shows every mark, Simple Markup the final text with change bars, No Markup the
 * final text, Original the text before the changes. */
export type MarkupMode = 'all' | 'simple' | 'none' | 'original';

export type InsertionStyle = 'none' | 'colorOnly' | 'bold' | 'italic' | 'underline' | 'doubleUnderline' | 'strikethrough' | 'doubleStrikethrough';
export type DeletionStyle = InsertionStyle | 'hidden' | 'caret' | 'pound';
export type ChangedLines = 'none' | 'leftBorder' | 'rightBorder' | 'outsideBorder';

/** Colours offered by the Track changes options dialog (Word's revision colours). */
export const MARKUP_COLORS = {
  black: '#000000',
  blue: '#0000ff',
  turquoise: '#00b0c8',
  green: '#00a000',
  pink: '#ff4fa8',
  red: '#e00000',
  yellow: '#d6b400',
  white: '#ffffff',
  darkBlue: '#000080',
  teal: '#008080',
  darkGreen: '#006400',
  violet: '#800080',
  darkRed: '#800000',
  darkYellow: '#808000',
  gray50: '#808080',
  gray25: '#c0c0c0',
  lightBlue: '#dbeefe',
  lightYellow: '#fff6cc',
  lightOrange: '#fde3c8',
  lightPurple: '#eadcf8',
  lightGreen: '#dcf3dc',
  gray: '#e5e7eb',
} as const;

export type MarkupColor = keyof typeof MARKUP_COLORS;
export type TextColor = 'byAuthor' | MarkupColor;
export type LineColor = 'auto' | 'byAuthor' | MarkupColor;
export type BackColor = 'none' | MarkupColor;

export interface RevisionMarkup {
  insertions: InsertionStyle;
  insertionsColor: TextColor;
  insertionsBackground: BackColor;
  deletions: DeletionStyle;
  deletionsColor: TextColor;
  deletionsBackground: BackColor;
  changedLines: ChangedLines;
  changedLinesColor: LineColor;
  trackMoves: boolean;
  movedFrom: DeletionStyle;
  movedFromColor: TextColor;
  movedFromBackground: BackColor;
  movedTo: InsertionStyle;
  movedToColor: TextColor;
  movedToBackground: BackColor;
  insertedCells: MarkupColor;
  deletedCells: MarkupColor;
  mergedCells: MarkupColor;
  splitCells: MarkupColor;
  trackFormatting: boolean;
}

export const DEFAULT_MARKUP: RevisionMarkup = {
  insertions: 'underline',
  insertionsColor: 'byAuthor',
  insertionsBackground: 'none',
  deletions: 'strikethrough',
  deletionsColor: 'byAuthor',
  deletionsBackground: 'none',
  changedLines: 'outsideBorder',
  changedLinesColor: 'auto',
  trackMoves: true,
  movedFrom: 'doubleStrikethrough',
  movedFromColor: 'green',
  movedFromBackground: 'none',
  movedTo: 'doubleUnderline',
  movedToColor: 'green',
  movedToBackground: 'none',
  insertedCells: 'lightBlue',
  deletedCells: 'pink',
  mergedCells: 'lightYellow',
  splitCells: 'lightOrange',
  trackFormatting: true,
};

export const INSERTION_STYLES: InsertionStyle[] = ['none', 'colorOnly', 'bold', 'italic', 'underline', 'doubleUnderline', 'strikethrough', 'doubleStrikethrough'];
export const DELETION_STYLES: DeletionStyle[] = [...INSERTION_STYLES, 'hidden', 'caret', 'pound'];
export const CHANGED_LINES: ChangedLines[] = ['none', 'leftBorder', 'rightBorder', 'outsideBorder'];

/** Author colours, assigned in order of first appearance in the document. */
export const AUTHOR_COLORS = ['#b53a2f', '#7a3f9d', '#1f6fb2', '#2f5d8a', '#2e7d32', '#b85c00', '#00838f', '#ad1457', '#5d4037', '#3949ab'];

/** Parse stored options, keeping only known values. */
export function normalizeMarkup(raw: unknown): RevisionMarkup {
  const out: RevisionMarkup = { ...DEFAULT_MARKUP };
  if (!raw || typeof raw !== 'object') return out;
  const r = raw as Record<string, unknown>;
  const colors = Object.keys(MARKUP_COLORS);
  const pick = <K extends keyof RevisionMarkup>(k: K, allowed: readonly unknown[]) => {
    if (allowed.includes(r[k])) (out[k] as unknown) = r[k];
  };
  pick('insertions', INSERTION_STYLES);
  pick('deletions', DELETION_STYLES);
  pick('movedFrom', DELETION_STYLES);
  pick('movedTo', INSERTION_STYLES);
  pick('changedLines', CHANGED_LINES);
  for (const k of ['insertionsColor', 'deletionsColor', 'movedFromColor', 'movedToColor'] as const) pick(k, ['byAuthor', ...colors]);
  pick('changedLinesColor', ['auto', 'byAuthor', ...colors]);
  for (const k of ['insertionsBackground', 'deletionsBackground', 'movedFromBackground', 'movedToBackground'] as const) pick(k, ['none', ...colors]);
  for (const k of ['insertedCells', 'deletedCells', 'mergedCells', 'splitCells'] as const) pick(k, colors);
  for (const k of ['trackMoves', 'trackFormatting'] as const) if (typeof r[k] === 'boolean') out[k] = r[k] as boolean;
  return out;
}

function textColor(c: TextColor, fallback: string): string {
  return c === 'byAuthor' ? `var(--dx-author, ${fallback})` : MARKUP_COLORS[c];
}

function backColor(c: BackColor): string {
  return c === 'none' ? 'transparent' : `color-mix(in srgb, ${MARKUP_COLORS[c]} 28%, transparent)`;
}

/** Declarations for one revision kind. */
function markDecls(style: DeletionStyle, color: string, back: BackColor): string {
  const base = `background-color: ${backColor(back)}; outline: none;`;
  switch (style) {
    case 'none': return `${base} color: inherit; text-decoration: inherit;`;
    case 'colorOnly': return `${base} color: ${color}; text-decoration: inherit;`;
    case 'bold': return `${base} color: ${color}; font-weight: 700; text-decoration: inherit;`;
    case 'italic': return `${base} color: ${color}; font-style: italic; text-decoration: inherit;`;
    case 'underline': return `${base} color: ${color}; text-decoration: underline; text-decoration-color: ${color};`;
    case 'doubleUnderline': return `${base} color: ${color}; text-decoration: underline double; text-decoration-color: ${color};`;
    case 'strikethrough': return `${base} color: ${color}; text-decoration: line-through; text-decoration-color: ${color};`;
    case 'doubleStrikethrough': return `${base} color: ${color}; text-decoration: line-through double; text-decoration-color: ${color};`;
    case 'hidden': return 'display: none;';
    case 'caret':
    case 'pound': return `${base} color: ${color}; font-size: 0 !important; letter-spacing: 0;`;
  }
}

function cssString(s: string): string {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ')}"`;
}

/**
 * Stylesheet for the revision display: per-author colours, the configured mark styles, change
 * bars and the reviewers whose changes are hidden (shown as if accepted).
 */
export function buildMarkupCss(scope: string, opts: RevisionMarkup, authors: Map<string, string>, hidden: ReadonlySet<string>): string {
  const s = `.${scope}`;
  const rules: string[] = [];
  for (const [name, color] of authors) {
    rules.push(`${s} [data-author=${cssString(name)}] { --dx-author: ${color}; }`);
  }
  rules.push(`${s} .dx-ins { ${markDecls(opts.insertions, textColor(opts.insertionsColor, 'var(--dx-ins)'), opts.insertionsBackground)} }`);
  rules.push(`${s} .dx-del { ${markDecls(opts.deletions, textColor(opts.deletionsColor, 'var(--dx-del)'), opts.deletionsBackground)} }`);
  if (opts.deletions === 'caret' || opts.deletions === 'pound') {
    rules.push(`${s} .dx-del::after { content: ${opts.deletions === 'caret' ? '"^"' : '"#"'}; font-size: 10pt; vertical-align: super; color: ${textColor(opts.deletionsColor, 'var(--dx-del)')}; }`);
  }
  const bar = opts.changedLinesColor === 'auto' ? 'var(--dx-bar, #5f6368)' : opts.changedLinesColor === 'byAuthor' ? 'var(--dx-author, #5f6368)' : MARKUP_COLORS[opts.changedLinesColor];
  if (opts.changedLines !== 'none') {
    const side = opts.changedLines === 'rightBorder' ? 'right' : 'left';
    rules.push(`${s} .dx-has-change { position: relative; }`);
    rules.push(`${s} .dx-has-change::before { content: ''; position: absolute; ${side}: -14pt; top: 0; bottom: 0; border-left: 2px solid ${bar}; pointer-events: none; }`);
  }
  rules.push(`${s} { --dx-cell-ins: ${MARKUP_COLORS[opts.insertedCells]}; --dx-cell-del: ${MARKUP_COLORS[opts.deletedCells]}; --dx-cell-merge: ${MARKUP_COLORS[opts.mergedCells]}; --dx-cell-split: ${MARKUP_COLORS[opts.splitCells]}; }`);
  // Simple Markup: the final text with red change bars.
  rules.push(`${s}.dx-markup-simple .dx-has-change::before { border-left-color: var(--dx-bar-simple, #d13438); }`);
  for (const name of hidden) {
    const a = `[data-author=${cssString(name)}]`;
    rules.push(`${s} .dx-ins${a} { color: inherit; text-decoration: inherit; background: none; outline: none; font-weight: inherit; font-style: inherit; }`);
    rules.push(`${s} .dx-del${a} { display: none; }`);
  }
  return rules.join('\n');
}
