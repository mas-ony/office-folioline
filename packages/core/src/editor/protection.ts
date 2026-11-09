import type { Node as PMNode } from 'prosemirror-model';
import { Plugin, PluginKey, type Transaction } from 'prosemirror-state';
import { schema } from '../core/model/schema';
import { AddMarkStep, RemoveMarkStep, ReplaceAroundStep, ReplaceStep } from 'prosemirror-transform';
import { REMOTE } from './meta';

export const protectionKey = new PluginKey('dx-protection');

/** Transaction meta for edits the editor itself makes while the document is protected. */
export const ALLOW_PROTECTED = 'dx-allow-protected';

function hasField(node: PMNode | null | undefined): boolean {
  return !!node?.marks.some((m) => m.type === schema.marks.field);
}

/** Whether an edit of [from, to) stays inside fields (content controls). */
export function editableRange(doc: PMNode, from: number, to: number): boolean {
  const $from = doc.resolve(from);
  if (from === to) return hasField($from.nodeBefore) || hasField($from.nodeAfter);
  let ok = true;
  doc.nodesBetween(from, to, (node) => {
    if (node.isInline && !hasField(node)) ok = false;
    return ok;
  });
  // A range that spans paragraph boundaries is never a field edit.
  return ok && $from.sameParent(doc.resolve(to));
}

function stepsStayInFields(tr: Transaction): boolean {
  for (let i = 0; i < tr.steps.length; i++) {
    const doc = tr.docs[i];
    const step = tr.steps[i];
    let ok = true;
    if (step instanceof AddMarkStep || step instanceof RemoveMarkStep) ok = editableRange(doc, step.from, step.to);
    else if (!(step instanceof ReplaceStep || step instanceof ReplaceAroundStep)) ok = false;
    else {
      step.getMap().forEach((from, to) => {
        if (ok && !editableRange(doc, from, to)) ok = false;
      });
    }
    if (!ok) return false;
  }
  return true;
}

/**
 * Document protection for forms: while it is on, only the content of fields can change.
 * Refused edits call `onBlocked`.
 */
export function protectionPlugin(isProtected: () => boolean, onBlocked: () => void): Plugin {
  return new Plugin({
    key: protectionKey,
    filterTransaction(tr) {
      if (!tr.docChanged || !isProtected() || tr.getMeta(REMOTE) || tr.getMeta(ALLOW_PROTECTED)) return true;
      if (stepsStayInFields(tr)) return true;
      onBlocked();
      return false;
    },
  });
}
