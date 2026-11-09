import { textWatermarkBox, type Watermark } from '../core/model/watermark';

export * from '../core/model/watermark';

/** Paint a watermark inside a page's margin box (sizes in CSS pixels). */
export function renderWatermark(el: HTMLElement, w: Watermark | null, box: { x: number; y: number; w: number; h: number }, mediaUrl: (path: string) => string) {
  if (!w) {
    el.replaceChildren();
    el.hidden = true;
    return;
  }
  el.hidden = false;
  el.style.cssText = `left:${box.x}px;top:${box.y}px;width:${box.w}px;height:${box.h}px`;
  const key = JSON.stringify(w) + box.w + box.h;
  if (el.dataset.key === key) return;
  el.dataset.key = key;
  const pxPerPt = 96 / 72;
  if (w.kind === 'text') {
    const size = textWatermarkBox(w, box.w / pxPerPt, box.h / pxPerPt);
    const width = size.width * pxPerPt;
    const height = size.height * pxPerPt;
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('aria-hidden', 'true');
    svg.classList.add('dx-watermark-text');
    if (w.layout === 'diagonal') svg.style.transform = 'rotate(-45deg)';
    const text = document.createElementNS(svgNS, 'text');
    text.setAttribute('x', '0');
    text.setAttribute('y', String(height * 0.82));
    text.setAttribute('textLength', String(width));
    text.setAttribute('lengthAdjust', 'spacingAndGlyphs');
    text.setAttribute('font-size', String(height * 0.95));
    text.setAttribute('fill', `#${w.color}`);
    text.setAttribute('fill-opacity', String(Math.max(0, Math.min(1, 1 - w.transparency / 100))));
    text.style.fontFamily = `"${w.font}", sans-serif`;
    if (w.bold) text.setAttribute('font-weight', '700');
    if (w.italic) text.setAttribute('font-style', 'italic');
    text.textContent = w.text;
    svg.appendChild(text);
    el.replaceChildren(svg);
    return;
  }
  const img = document.createElement('img');
  img.alt = '';
  img.src = mediaUrl(w.mediaPath);
  img.className = 'dx-watermark-img';
  if (w.washout) img.classList.add('is-washout');
  const fit = () => {
    const nw = (w.width ? w.width * pxPerPt : img.naturalWidth) || box.w;
    const nh = (w.height ? w.height * pxPerPt : img.naturalHeight) || box.w * 0.66;
    const k = w.scale === 'auto' ? Math.min(box.w / nw, box.h / nh) : w.scale / 100;
    img.style.width = `${nw * k}px`;
    img.style.height = `${nh * k}px`;
  };
  if (img.complete) fit();
  else img.addEventListener('load', fit, { once: true });
  el.replaceChildren(img);
}
