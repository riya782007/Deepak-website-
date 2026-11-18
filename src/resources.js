// Website Resources page: everything the team publishes from the admin console.
import {loadResources} from './integrations.js';
import {RESOURCE_KINDS, embedUrl, thumbUrl, fileSize, safeHttp} from './media.js';
import {arrow} from './components.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const fmt = d => (d ? new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {day: 'numeric', month: 'long', year: 'numeric'}) : '');
const LABEL = {Update: 'Updates', PDF: 'Documents', Video: 'Videos', Image: 'Photos', Link: 'Links'};
const TONE = {Update: 'mint', PDF: 'peach', Video: 'lavender', Image: 'lavender', Link: 'mint'};
const G = {
  Update: '<path d="M6 8h28v20H14l-8 7zM13 15h14M13 21h9"/>',
  PDF: '<path d="M10 5h16l8 8v26H10zM26 5v8h8M16 23h12M16 29h8"/>',
  Video: '<rect x="5" y="10" width="26" height="22" rx="3"/><path d="m31 18 9-5v18l-9-5"/>',
  Image: '<rect x="5" y="8" width="34" height="28" rx="3"/><path d="m5 30 10-10 8 8 5-5 11 11"/><circle cx="29" cy="16" r="3"/>',
  Link: '<path d="M18 26a7 7 0 0 0 10 0l6-6a7 7 0 0 0-10-10l-2 2M26 18a7 7 0 0 0-10 0l-6 6a7 7 0 0 0 10 10l2-2"/>'
};
const glyph = k => `<svg aria-hidden="true" width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${G[k] || G.Update}</svg>`;

export const resourcesPage = hero => `${hero('Resources and<br>latest updates.', 'Brochures, workshop moments, videos and news from Soft Binomials India, shared as they happen.', 'mint')}
<section class="shell section resources">
  <div class="filters" role="group" aria-label="Filter resources" id="res-filters" hidden></div>
  <div class="res-grid" id="res-list" aria-live="polite">${'<div class="res-card skeleton" aria-hidden="true"><div class="res-media"></div><div class="res-body"><span></span><span></span><span></span></div></div>'.repeat(3)}</div>
</section>
<dialog class="res-viewer" id="res-viewer" aria-label="Resource viewer"><button class="res-close" aria-label="Close">×</button><div id="res-viewer-body"></div></dialog>`;

function card(r) {
  const url = safeHttp(r.url);
  const thumb = thumbUrl(r);
  const meta = [r.category, fmt(r.date)].filter(Boolean).map(esc).join(' · ');
  const media = thumb
    ? `<img src="${esc(thumb)}" alt="" loading="lazy">${r.kind === 'Video' ? '<span class="res-play" aria-hidden="true"></span>' : ''}`
    : `<span class="res-glyph">${glyph(r.kind)}</span>${r.kind === 'Video' ? '<span class="res-play" aria-hidden="true"></span>' : ''}`;
  const viewable = (r.kind === 'Image' || r.kind === 'Video') && url;
  let action = '';
  if (r.kind === 'PDF' && url) action = `<a class="text-link" href="${esc(url)}" target="_blank" rel="noopener">Open PDF${r.file && r.file.size ? ` · ${fileSize(r.file.size)}` : ''}${arrow}</a>`;
  else if (r.kind === 'Link' && url) action = `<a class="text-link" href="${esc(url)}" target="_blank" rel="noopener">Visit link${arrow}</a>`;
  else if (viewable) action = `<button class="text-link res-open" data-id="${esc(r.id)}">${r.kind === 'Video' ? 'Watch video' : 'View photo'}${arrow}</button>`;
  return `<article class="res-card ${thumb ? '' : TONE[r.kind] || 'mint'}" id="r-${esc(r.id)}" data-kind="${esc(r.kind)}">
    ${viewable ? `<button class="res-media res-open" data-id="${esc(r.id)}" aria-label="${r.kind === 'Video' ? 'Watch' : 'View'} ${esc(r.title)}">${media}</button>` : `<div class="res-media">${media}</div>`}
    <div class="res-body"><span class="label">${esc(r.kind === 'Update' ? 'Update' : r.kind)}${r.pinned ? ' · Featured' : ''}</span><h2>${esc(r.title)}</h2>${meta ? `<p class="res-meta">${meta}</p>` : ''}
    ${r.summary ? `<p>${esc(r.summary)}</p>` : ''}
    ${r.body ? `<details><summary>Read more ${arrow}</summary><p class="res-text">${esc(r.body)}</p></details>` : ''}
    ${action}</div></article>`;
}

function viewer(r) {
  const url = safeHttp(r.url);
  const emb = embedUrl(url);
  const media = r.kind === 'Image' ? `<img src="${esc(url)}" alt="${esc(r.title)}">`
    : emb ? `<iframe src="${esc(emb)}&autoplay=1" title="${esc(r.title)}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`
    : `<video src="${esc(url)}" controls autoplay playsinline></video>`;
  return `<div class="res-viewer-media">${media}</div><div class="res-viewer-cap"><h2>${esc(r.title)}</h2>${r.summary ? `<p>${esc(r.summary)}</p>` : ''}</div>`;
}

export async function initResources() {
  const list = document.querySelector('#res-list');
  if (!list) return;
  let items;
  try { items = await loadResources(); }
  catch { list.innerHTML = '<p class="res-empty">Resources couldn’t load just now. Please refresh the page in a moment.</p>'; return; }
  if (!items || !items.length) {
    list.innerHTML = `<div class="res-empty"><h2>New resources are on their way.</h2><p>Brochures, workshop photos, videos and updates will appear here as the team shares them.</p><a class="button" href="/contact">Ask us a question${arrow}</a></div>`;
    return;
  }
  const kinds = RESOURCE_KINDS.filter(k => items.some(r => r.kind === k));
  const filters = document.querySelector('#res-filters');
  if (kinds.length > 1) {
    filters.hidden = false;
    filters.innerHTML = ['All', ...kinds].map((k, i) => `<button data-kind="${k}" aria-pressed="${i === 0}">${k === 'All' ? 'All' : LABEL[k]}</button>`).join('');
    filters.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      filters.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      list.querySelectorAll('.res-card').forEach(c => { c.hidden = b.dataset.kind !== 'All' && c.dataset.kind !== b.dataset.kind; });
    });
  }
  list.innerHTML = items.map(card).join('');
  const dialog = document.querySelector('#res-viewer');
  const body = document.querySelector('#res-viewer-body');
  list.addEventListener('click', e => {
    const b = e.target.closest('.res-open'); if (!b) return;
    const r = items.find(x => x.id === b.dataset.id); if (!r) return;
    body.innerHTML = viewer(r);
    dialog.showModal();
  });
  const close = () => { dialog.close(); body.innerHTML = ''; };
  dialog.querySelector('.res-close').addEventListener('click', close);
  dialog.addEventListener('click', e => { if (e.target === dialog) close(); });
  dialog.addEventListener('close', () => { body.innerHTML = ''; });
  const hash = location.hash.slice(1);
  if (hash) document.getElementById('r-' + hash)?.scrollIntoView({behavior: 'smooth', block: 'center'});
}
