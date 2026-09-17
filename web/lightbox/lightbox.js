// The photo viewer, on every page (the default layout loads this bundle). A photo in the
// page content opens large over a dark backdrop, with its description and "3 of 12", and
// previous and next move through every photo on the page: buttons, the arrow keys, or a
// swipe on a phone. Esc, the close button or a tap outside the photo closes it, and focus
// goes back to the photo it came from. Without JavaScript the page is simply as it was.
//
// Put there by website-builder for every new site. Leave this file alone; mark an image
// that should not open with data-no-zoom. Logos, icons, small images, photos inside a link
// and anything in the header, footer or navigation never open.

const MIN_WIDTH = 120; // shown this wide or wider, in CSS pixels: smaller is an icon or decoration

const style = `
[data-photo] { cursor: zoom-in; }
[data-photo]:focus-visible { outline: 3px solid var(--accent, #fff); outline-offset: 3px; }
.photo-viewer { border: 0; padding: 0; margin: 0; width: 100vw; height: 100vh; max-width: 100vw; max-height: 100vh;
  background: rgba(8, 10, 14, 0.94); color: #fff; overflow: hidden; }
.photo-viewer::backdrop { background: rgba(8, 10, 14, 0.94); }
.photo-viewer[open] { display: flex; align-items: center; justify-content: center; }
.photo-viewer figure { margin: 0; display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
  max-width: calc(100vw - 7rem); max-height: 100vh; padding: 3.5rem 0 1rem; box-sizing: border-box; }
.photo-viewer img { display: block; max-width: 100%; max-height: calc(100vh - 8.5rem); width: auto; height: auto;
  object-fit: contain; border-radius: 4px; touch-action: pan-y pinch-zoom; }
.photo-viewer figcaption { font: 0.95rem/1.4 system-ui, sans-serif; text-align: center; max-width: 42rem; color: #e8e8e8; }
.photo-viewer .photo-count { font: 0.85rem system-ui, sans-serif; color: #bdbdbd; margin: 0; }
.photo-viewer button { position: absolute; display: grid; place-items: center; width: 2.9rem; height: 2.9rem;
  border: 1px solid rgba(255, 255, 255, 0.35); border-radius: 999px; background: rgba(0, 0, 0, 0.45);
  color: #fff; font: 1.6rem/1 system-ui, sans-serif; cursor: pointer; padding: 0; }
.photo-viewer button:hover { background: rgba(255, 255, 255, 0.16); }
.photo-viewer button:focus-visible { outline: 3px solid #fff; outline-offset: 2px; }
.photo-viewer .photo-close { top: 0.75rem; right: 0.75rem; }
.photo-viewer .photo-prev { left: 0.75rem; top: 50%; transform: translateY(-50%); }
.photo-viewer .photo-next { right: 0.75rem; top: 50%; transform: translateY(-50%); }
.photo-viewer[data-single] .photo-prev, .photo-viewer[data-single] .photo-next, .photo-viewer[data-single] .photo-count { display: none; }
@media (max-width: 600px) {
  .photo-viewer figure { max-width: 100vw; padding: 3.5rem 0.5rem 4.5rem; }
  .photo-viewer .photo-prev, .photo-viewer .photo-next { top: auto; bottom: 0.9rem; transform: none; }
}
`;

function isPhoto(img) {
  if (img.closest('a, button, header, footer, nav, dialog, [data-no-zoom]')) return false;
  if (img.matches('[data-no-zoom], .logo-light, .logo-dark') || /\.svg(\?|#|$)/i.test(img.currentSrc || img.src)) return false;
  const shown = img.getBoundingClientRect().width || Number(img.getAttribute('width')) || 0;
  return shown >= MIN_WIDTH;
}

// The biggest file the image offers: a srcset's widest entry, or what it shows.
function largest(img) {
  const set = img.getAttribute('srcset');
  if (set) {
    let best = null, bestW = 0;
    for (const part of set.split(',')) {
      const [url, size] = part.trim().split(/\s+/);
      const w = size && size.endsWith('w') ? parseInt(size, 10) : 0;
      if (url && w >= bestW) { best = url; bestW = w; }
    }
    if (best) return new URL(best, document.baseURI).href;
  }
  return img.currentSrc || img.src;
}

function caption(img) {
  const fig = img.closest('figure');
  const text = fig && fig.querySelector('figcaption') ? fig.querySelector('figcaption').textContent : img.alt;
  return (text || '').trim();
}

let viewer = null;
let list = [];
let at = 0;
let opener = null;

function build() {
  const el = document.createElement('style');
  el.textContent = style;
  document.head.appendChild(el);
  const d = document.createElement('dialog');
  d.className = 'photo-viewer';
  d.setAttribute('aria-label', 'Photo viewer');
  const fig = document.createElement('figure');
  const img = document.createElement('img');
  img.alt = '';
  // A mouse drag on an image starts the browser's own image drag, which cancels the swipe.
  img.draggable = false;
  const cap = document.createElement('figcaption');
  const count = document.createElement('p');
  count.className = 'photo-count';
  count.setAttribute('aria-live', 'polite');
  fig.append(img, cap, count);
  const button = (cls, label, text, onClick) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = cls;
    b.setAttribute('aria-label', label);
    b.textContent = text;
    b.addEventListener('click', e => { e.stopPropagation(); onClick(); });
    return b;
  };
  d.append(fig,
    button('photo-prev', 'Previous photo', '‹', () => show(at - 1)),
    button('photo-next', 'Next photo', '›', () => show(at + 1)),
    button('photo-close', 'Close', '×', () => d.close()));
  // A tap on the dark space around the photo closes it; a tap on the photo does not.
  d.addEventListener('click', e => { if (e.target === d || e.target === fig) d.close(); });
  d.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); show(at + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(at - 1); }
  });
  let startX = null, startY = null;
  d.addEventListener('dragstart', e => e.preventDefault());
  d.addEventListener('pointerdown', e => { startX = e.clientX; startY = e.clientY; });
  d.addEventListener('pointercancel', () => { startX = null; });
  d.addEventListener('pointerup', e => {
    if (startX === null) return;
    const dx = e.clientX - startX, dy = e.clientY - startY;
    startX = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) show(at + (dx < 0 ? 1 : -1));
  });
  d.addEventListener('close', () => {
    document.documentElement.style.overflow = '';
    if (opener && document.contains(opener)) opener.focus();
  });
  document.body.appendChild(d);
  return d;
}

function show(i) {
  if (!list.length) return;
  at = (i + list.length) % list.length;
  const photo = list[at];
  const img = viewer.querySelector('img');
  img.src = largest(photo);
  img.alt = photo.alt || '';
  const text = caption(photo);
  const cap = viewer.querySelector('figcaption');
  cap.textContent = text;
  cap.hidden = !text;
  viewer.querySelector('.photo-count').textContent = (at + 1) + ' of ' + list.length;
  // The next and previous files start loading now, so moving on is instant.
  for (const j of [at + 1, at - 1]) {
    const n = list[(j + list.length) % list.length];
    if (n && n !== photo) new Image().src = largest(n);
  }
}

function open(photo) {
  list = [...document.querySelectorAll('[data-photo]')];
  if (!list.includes(photo)) list.push(photo);
  viewer = viewer || build();
  opener = photo;
  viewer.toggleAttribute('data-single', list.length < 2);
  show(list.indexOf(photo));
  document.documentElement.style.overflow = 'hidden';
  viewer.showModal();
  viewer.querySelector('.photo-close').focus();
}

function mark(img) {
  if (img.hasAttribute('data-photo') || !isPhoto(img)) return;
  img.setAttribute('data-photo', '');
  img.tabIndex = 0;
  img.setAttribute('role', 'button');
  img.setAttribute('aria-label', 'Show larger' + (img.alt ? ': ' + img.alt : ''));
}

function start() {
  if (typeof HTMLDialogElement === 'undefined') return;
  const main = document.querySelector('main') || document.body;
  for (const img of main.querySelectorAll('img')) {
    // A lazy photo has no size until it loads, so it is judged again then.
    if (img.complete) mark(img);
    img.addEventListener('load', () => mark(img));
  }
  main.addEventListener('click', e => {
    const img = e.target.closest('[data-photo]');
    if (img) open(img);
  });
  main.addEventListener('keydown', e => {
    const img = e.target.closest('[data-photo]');
    if (img && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(img); }
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
