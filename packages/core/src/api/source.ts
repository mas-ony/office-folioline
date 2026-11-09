/** Reading documents from the ways they can be given, and saving files. */

export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** A DOCX to open: a URL, a File or Blob, or the bytes. */
export type DocumentSource = string | Blob | ArrayBuffer | Uint8Array;

/** A document option: a source, or a source with the name to show. */
export type DocumentInput = DocumentSource | { data?: DocumentSource; url?: string; name?: string };

/** The source and name of a document option (no source for an empty object). */
export function documentOf(input: DocumentInput): { source?: DocumentSource; name?: string } {
  if (typeof input === 'string' || input instanceof Blob || input instanceof ArrayBuffer || input instanceof Uint8Array) return { source: input };
  return { source: input.data ?? input.url, name: typeof input.name === 'string' ? input.name : undefined };
}

/** File name in a URL: its last path segment. */
export function nameOfUrl(url: string): string {
  return decodeURIComponent(url.split(/[?#]/)[0].split('/').pop() || 'Document.docx');
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Why a file did not open, for the "This file did not open" dialog. */
export function openFailure(bytes: Uint8Array, name: string, error: unknown): { reason: 'legacy' | 'notDocx' | 'tooLarge' | 'damaged' | 'unknown'; code: string } {
  const ole = bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0;
  if (ole || /\.doc$/i.test(name)) return { reason: 'legacy', code: 'open.legacy-word' };
  if (!(bytes[0] === 0x50 && bytes[1] === 0x4b)) return { reason: 'notDocx', code: 'open.not-zip' };
  if (bytes.length > 200 * 1024 * 1024) return { reason: 'tooLarge', code: 'open.too-large' };
  const msg = (error as Error)?.message ?? '';
  if (/document\.xml|main document|officeDocument/i.test(msg)) return { reason: 'notDocx', code: 'open.no-main-part' };
  if (/zip|inflate|deflate|xml|parse|unexpected|invalid/i.test(msg)) return { reason: 'damaged', code: 'open.damaged' };
  return { reason: 'unknown', code: 'open.unknown' };
}
