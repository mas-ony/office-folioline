/**
 * Table formatting beyond prosemirror-tables' commands: border presets drawn with a "pen"
 * (style, width, colour), cell alignment, header rows, column widths, table alignment and
 * splitting a cell into rows and columns.
 */
import type { Node as PMNode } from 'prosemirror-model';
import { type EditorState, TextSelection } from 'prosemirror-state';
import { CellSelection, isInTable, selectedRect, TableMap } from 'prosemirror-tables';
import type { EditorView } from 'prosemirror-view';
import { schema } from '../core/model/schema';
import type { BorderSpec, BoxBorders } from '../core/model/types';
import { REFRESH } from './meta';
import { tableAt } from './tableActions';

export type BorderPreset = 'all' | 'outside' | 'inside' | 'none' | 'top' | 'bottom' | 'left' | 'right';
export type BorderStyle = 'single' | 'dashed' | 'dotted' | 'double' | 'triple' | 'thick';

export interface BorderPen {
  style: BorderStyle;
  /** Width in points. */
  width: number;
  /** RRGGBB or auto. */
  color: string;
}

export const DEFAULT_PEN: BorderPen = { style: 'single', width: 0.5, color: '000000' };
export const BORDER_STYLES: BorderStyle[] = ['single', 'dashed', 'dotted', 'double', 'triple', 'thick'];
export const BORDER_WIDTHS = [0.5, 1, 1.5, 2, 3];
export const BORDER_PRESETS: BorderPreset[] = ['all', 'outside', 'inside', 'none', 'top', 'bottom', 'left', 'right'];

const NIL: BorderSpec = { val: 'nil' };

function spec(pen: BorderPen): BorderSpec {
  return { val: pen.style, sz: Math.round(pen.width * 8), space: 0, color: pen.color };
}

interface CellRef {
  pos: number;
  node: PMNode;
  row: number;
  col: number;
  rowspan: number;
  colspan: number;
}

/** The cells a table command works on: the cell selection, or every cell of the table. */
function targetCells(state: EditorState, wholeTableWithoutSelection = true): { cells: CellRef[]; rect: { top: number; left: number; bottom: number; right: number }; tableStart: number; map: TableMap } | null {
  if (!isInTable(state)) return null;
  const rect = selectedRect(state);
  const map = rect.map;
  const sel = state.selection;
  const area = sel instanceof CellSelection || !wholeTableWithoutSelection
    ? { top: rect.top, left: rect.left, bottom: rect.bottom, right: rect.right }
    : { top: 0, left: 0, bottom: map.height, right: map.width };
  const seen = new Set<number>();
  const cells: CellRef[] = [];
  for (let r = area.top; r < area.bottom; r++) {
    for (let c = area.left; c < area.right; c++) {
      const rel = map.map[r * map.width + c];
      if (seen.has(rel)) continue;
      seen.add(rel);
      const node = rect.table.nodeAt(rel)!;
      const box = map.findCell(rel);
      cells.push({ pos: rect.tableStart + rel, node, row: box.top, col: box.left, rowspan: box.bottom - box.top, colspan: box.right - box.left });
    }
  }
  return { cells, rect: area, tableStart: rect.tableStart, map };
}

/** Apply a border preset with the pen to the selected cells (or the whole table). */
export function applyBorders(view: EditorView, preset: BorderPreset, pen: BorderPen): boolean {
  const t = targetCells(view.state);
  if (!t) return false;
  const line = spec(pen);
  const { top, left, bottom, right } = t.rect;
  const tr = view.state.tr;
  for (const c of t.cells) {
    const b: BoxBorders = { ...((c.node.attrs.borders as BoxBorders) ?? {}) };
    const atTop = c.row === top;
    const atBottom = c.row + c.rowspan === bottom;
    const atLeft = c.col === left;
    const atRight = c.col + c.colspan === right;
    const set = (side: 'top' | 'bottom' | 'left' | 'right', on: boolean) => {
      b[side] = on ? line : NIL;
    };
    switch (preset) {
      case 'all': set('top', true); set('bottom', true); set('left', true); set('right', true); break;
      case 'none': set('top', false); set('bottom', false); set('left', false); set('right', false); break;
      case 'outside':
        if (atTop) set('top', true);
        if (atBottom) set('bottom', true);
        if (atLeft) set('left', true);
        if (atRight) set('right', true);
        break;
      case 'inside':
        if (!atTop) set('top', true);
        if (!atBottom) set('bottom', true);
        if (!atLeft) set('left', true);
        if (!atRight) set('right', true);
        break;
      case 'top': if (atTop) set('top', true); break;
      case 'bottom': if (atBottom) set('bottom', true); break;
      case 'left': if (atLeft) set('left', true); break;
      case 'right': if (atRight) set('right', true); break;
    }
    tr.setNodeMarkup(c.pos, undefined, { ...c.node.attrs, borders: b });
  }
  if (preset === 'none' && !(view.state.selection instanceof CellSelection)) {
    const table = tableAt(view.state);
    if (table) tr.setNodeMarkup(table.pos, undefined, { ...table.node.attrs, borders: { top: NIL, left: NIL, bottom: NIL, right: NIL, insideH: NIL, insideV: NIL } });
  }
  view.dispatch(tr.setMeta(REFRESH, true));
  return true;
}

/** Redraw the visible borders of the selected cells (or table) with the pen. */
export function repaintBorders(view: EditorView, pen: BorderPen): boolean {
  const t = targetCells(view.state);
  if (!t) return false;
  const line = spec(pen);
  const tr = view.state.tr;
  const table = tableAt(view.state);
  if (table && !(view.state.selection instanceof CellSelection)) {
    const tb: BoxBorders = { ...((table.node.attrs.borders as BoxBorders) ?? {}) };
    const sides = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'] as const;
    const anyTable = sides.some((s) => tb[s] && tb[s]!.val !== 'nil' && tb[s]!.val !== 'none');
    // A table drawn by its style gets explicit borders so the pen has something to change.
    for (const s of sides) if (!anyTable || (tb[s] && tb[s]!.val !== 'nil' && tb[s]!.val !== 'none')) tb[s] = line;
    tr.setNodeMarkup(table.pos, undefined, { ...table.node.attrs, borders: tb });
  }
  for (const c of t.cells) {
    const b = c.node.attrs.borders as BoxBorders | null;
    if (!b) continue;
    const next: BoxBorders = { ...b };
    for (const s of ['top', 'left', 'bottom', 'right'] as const) if (b[s] && b[s]!.val !== 'nil' && b[s]!.val !== 'none') next[s] = line;
    tr.setNodeMarkup(tr.mapping.map(c.pos), undefined, { ...c.node.attrs, borders: next });
  }
  view.dispatch(tr.setMeta(REFRESH, true));
  return true;
}

/** Vertical alignment of the selected cells (or the cell with the caret). */
export function setCellVAlign(view: EditorView, align: 'top' | 'center' | 'bottom'): boolean {
  const t = targetCells(view.state, false);
  if (!t) return false;
  const tr = view.state.tr;
  for (const c of t.cells) tr.setNodeMarkup(c.pos, undefined, { ...c.node.attrs, vAlign: align === 'top' ? null : align });
  view.dispatch(tr.setMeta(REFRESH, true));
  return true;
}

export function cellVAlign(state: EditorState): 'top' | 'center' | 'bottom' | null {
  const t = targetCells(state, false);
  const v = t?.cells[0]?.node.attrs.vAlign;
  return t ? (v === 'center' || v === 'bottom' ? v : 'top') : null;
}

/** Toggle "no wrap" on the selected cells. */
export function toggleNoWrap(view: EditorView): boolean {
  const t = targetCells(view.state, false);
  if (!t) return false;
  const on = !t.cells[0].node.attrs.noWrap;
  const tr = view.state.tr;
  for (const c of t.cells) tr.setNodeMarkup(c.pos, undefined, { ...c.node.attrs, noWrap: on || null });
  view.dispatch(tr.setMeta(REFRESH, true));
  return true;
}

/** Make the first row a header row (repeated on every page) or a normal row again. */
export function toggleHeaderRow(view: EditorView): boolean {
  const table = tableAt(view.state);
  if (!table) return false;
  const first = table.node.firstChild;
  if (!first) return false;
  const pos = table.pos + 1;
  view.dispatch(view.state.tr.setNodeMarkup(pos, undefined, { ...first.attrs, header: !first.attrs.header }).setMeta(REFRESH, true));
  return true;
}

export function hasHeaderRow(state: EditorState): boolean {
  return !!tableAt(state)?.node.firstChild?.attrs.header;
}

/** Give every column the same width (keeping the table width). */
export function distributeColumns(view: EditorView): boolean {
  const table = tableAt(view.state);
  if (!table) return false;
  const map = TableMap.get(table.node);
  let total = 0;
  for (let c = 0; c < map.width; c++) {
    const rel = map.map[c];
    const cell = table.node.nodeAt(rel)!;
    const box = map.findCell(rel);
    const cw = cell.attrs.colwidth as number[] | null;
    total += cw ? cw[c - box.left] ?? 0 : 0;
  }
  if (!total) total = map.width * 120;
  const w = Math.max(16, Math.round(total / map.width));
  const tr = view.state.tr;
  table.node.descendants((n, p) => {
    if (n.type === schema.nodes.table_cell) {
      tr.setNodeMarkup(table.pos + 1 + p, undefined, { ...n.attrs, colwidth: Array.from({ length: n.attrs.colspan }, () => w), width: null });
      return false;
    }
    return true;
  });
  tr.setNodeMarkup(table.pos, undefined, { ...table.node.attrs, grid: Array.from({ length: map.width }, () => w * 15) });
  view.dispatch(tr.setMeta(REFRESH, true));
  return true;
}

/** Fit columns to their content: widths proportional to the longest text in each column. */
export function autoFitColumns(view: EditorView, maxWidthPx: number): boolean {
  const table = tableAt(view.state);
  if (!table) return false;
  const map = TableMap.get(table.node);
  const need = new Array(map.width).fill(4);
  for (let i = 0; i < map.map.length; i++) {
    const rel = map.map[i];
    const box = map.findCell(rel);
    if (box.right - box.left !== 1 || i % map.width !== box.left || Math.floor(i / map.width) !== box.top) continue;
    const cell = table.node.nodeAt(rel)!;
    let longest = 0;
    cell.forEach((block) => {
      longest = Math.max(longest, block.textContent.length);
    });
    need[box.left] = Math.max(need[box.left], Math.min(longest, 60));
  }
  const sum = need.reduce((a, b) => a + b, 0);
  const widths = need.map((n) => Math.max(24, Math.round((n / sum) * maxWidthPx)));
  const tr = view.state.tr;
  table.node.descendants((n, p) => {
    if (n.type === schema.nodes.table_cell) {
      const box = map.findCell(p);
      tr.setNodeMarkup(table.pos + 1 + p, undefined, { ...n.attrs, colwidth: widths.slice(box.left, box.right), width: null });
      return false;
    }
    return true;
  });
  tr.setNodeMarkup(table.pos, undefined, { ...table.node.attrs, grid: widths.map((w) => w * 15), width: null });
  view.dispatch(tr.setMeta(REFRESH, true));
  return true;
}

/** Table alignment between the margins. */
export function setTableAlign(view: EditorView, align: 'left' | 'center' | 'right'): boolean {
  const table = tableAt(view.state);
  if (!table) return false;
  view.dispatch(view.state.tr.setNodeMarkup(table.pos, undefined, { ...table.node.attrs, align: align === 'left' ? null : align }).setMeta(REFRESH, true));
  return true;
}

export function tableAlign(state: EditorState): 'left' | 'center' | 'right' | null {
  const t = tableAt(state);
  if (!t) return null;
  const a = t.node.attrs.align;
  return a === 'center' ? 'center' : a === 'right' || a === 'end' ? 'right' : 'left';
}

/** Select every cell of the table. */
export function selectTable(view: EditorView): boolean {
  const table = tableAt(view.state);
  if (!table) return false;
  const map = TableMap.get(table.node);
  const start = table.pos + 1;
  const sel = CellSelection.create(view.state.doc, start + map.map[0], start + map.map[map.map.length - 1]);
  view.dispatch(view.state.tr.setSelection(sel));
  return true;
}

/** Limits for splitting the cell with the caret: how many rows and columns it can become. */
export function splitLimits(state: EditorState): { cell: CellRef; maxRows: number; maxCols: number } | null {
  const t = targetCells(state, false);
  if (!t || t.cells.length !== 1) return null;
  const cell = t.cells[0];
  return { cell, maxRows: cell.rowspan > 1 ? cell.rowspan : 20, maxCols: cell.colspan > 1 ? cell.colspan : Math.max(1, Math.floor((cell.node.attrs.colwidth?.[0] ?? 200) / 16)) };
}

/**
 * Split the cell with the caret into `rows` × `cols` cells. Inside a merged cell the split
 * follows the merged columns and rows; a plain cell gains grid columns or new rows, and the
 * other cells of those columns or rows span them.
 */
export function splitCellInto(view: EditorView, rows: number, cols: number): boolean {
  const lim = splitLimits(view.state);
  if (!lim || rows < 1 || cols < 1 || (rows === 1 && cols === 1)) return false;
  const { cell } = lim;
  if (cell.rowspan > 1 && cell.rowspan % rows !== 0) return false;
  if (cell.colspan > 1 && cell.colspan % cols !== 0) return false;
  const table = tableAt(view.state);
  if (!table) return false;
  const tr = view.state.tr;
  const tableNode = table.node;
  const map = TableMap.get(tableNode);

  // Columns: widen the grid when the cell spans fewer columns than requested.
  let addCols = 0;
  if (cols > 1 && cell.colspan === 1) addCols = cols - 1;
  let addRows = 0;
  if (rows > 1 && cell.rowspan === 1) addRows = rows - 1;

  const cellW: number[] = (cell.node.attrs.colwidth as number[] | null) ?? Array.from({ length: cell.colspan }, () => 120);
  const totalW = cellW.reduce((a, b) => a + b, 0);
  const newColW = Math.max(16, Math.floor(totalW / cols));

  // Rebuild the rows of the table.
  const rowNodes: PMNode[] = [];
  tableNode.forEach((row, rowOffset, r) => {
    const cells: PMNode[] = [];
    row.forEach((c, offset) => {
      const rel = rowOffset + 1 + offset;
      const box = map.findCell(rel);
      const isTarget = rel + table.pos + 1 === cell.pos;
      if (isTarget) {
        const perRowSpan = cell.rowspan > 1 ? cell.rowspan / rows : 1;
        const perColSpan = cell.colspan > 1 ? cell.colspan / cols : 1;
        for (let k = 0; k < cols; k++) {
          const content = k === 0 ? c.content : schema.nodes.paragraph.create();
          const widths = cell.colspan > 1 ? cellW.slice(k * perColSpan, (k + 1) * perColSpan) : [newColW];
          cells.push(schema.nodes.table_cell.create({ ...c.attrs, colspan: perColSpan, rowspan: perRowSpan, colwidth: widths, width: null }, content));
        }
      } else if (addCols && box.left <= cell.col && box.right > cell.col) {
        // Cells in the widened column now span the new grid columns.
        const cw = (c.attrs.colwidth as number[] | null) ?? Array.from({ length: c.attrs.colspan }, () => 120);
        const idx = cell.col - box.left;
        const widths = [...cw.slice(0, idx), ...Array.from({ length: cols }, () => newColW), ...cw.slice(idx + 1)];
        cells.push(schema.nodes.table_cell.create({ ...c.attrs, colspan: c.attrs.colspan + addCols, colwidth: widths }, c.content));
      } else if (addRows && box.top <= cell.row && box.bottom > cell.row && r === box.top) {
        // Cells in the split row now span the new rows.
        cells.push(schema.nodes.table_cell.create({ ...c.attrs, rowspan: c.attrs.rowspan + addRows }, c.content));
      } else {
        cells.push(c);
      }
    });
    rowNodes.push(row.type.create(row.attrs, cells));
    // New rows directly after the split row (a plain cell split into rows).
    if (addRows && r === cell.row) {
      for (let k = 0; k < addRows; k++) {
        const extra: PMNode[] = [];
        for (let i = 0; i < cols; i++) {
          extra.push(schema.nodes.table_cell.create({ ...cell.node.attrs, colspan: 1, rowspan: 1, colwidth: cell.colspan > 1 ? cellW.slice(i * (cell.colspan / cols), (i + 1) * (cell.colspan / cols)) : [cols > 1 ? newColW : cellW[0]] }, schema.nodes.paragraph.create()));
        }
        rowNodes.push(row.type.create({ ...row.attrs, header: false }, extra));
      }
    }
  });
  // Splitting a merged cell into rows: the extra cells go into the rows the merge covered.
  if (cell.rowspan > 1 && rows > 1) {
    const perRowSpan = cell.rowspan / rows;
    for (let k = 1; k < rows; k++) {
      const r = cell.row + k * perRowSpan;
      const row = rowNodes[r];
      if (!row) continue;
      // Insert after the cells that start left of the split cell (cells spanning down from
      // earlier rows occupy columns too, so count by the table map).
      let insertAt = 0;
      row.forEach((c, offset, i) => {
        let rowStart = 0;
        for (let j = 0; j < r; j++) rowStart += tableNode.child(j).nodeSize;
        void c;
        const box = map.findCell(rowStart + 1 + offset);
        if (box.left < cell.col) insertAt = i + 1;
      });
      const extra: PMNode[] = [];
      const perColSpan = cell.colspan > 1 ? cell.colspan / cols : 1;
      for (let i = 0; i < cols; i++) extra.push(schema.nodes.table_cell.create({ ...cell.node.attrs, colspan: perColSpan, rowspan: perRowSpan, colwidth: cell.colspan > 1 ? cellW.slice(i * perColSpan, (i + 1) * perColSpan) : [newColW] }, schema.nodes.paragraph.create()));
      const kids: PMNode[] = [];
      row.forEach((c) => kids.push(c));
      kids.splice(insertAt, 0, ...extra);
      rowNodes[r] = row.type.create(row.attrs, kids);
    }
  }
  const next = tableNode.type.create({ ...tableNode.attrs, grid: null }, rowNodes);
  tr.replaceWith(table.pos, table.pos + tableNode.nodeSize, next);
  try {
    tr.setSelection(TextSelection.near(tr.doc.resolve(Math.min(cell.pos + 2, tr.doc.content.size))));
  } catch {
    // Keep the mapped selection.
  }
  view.dispatch(tr.setMeta(REFRESH, true));
  return true;
}
