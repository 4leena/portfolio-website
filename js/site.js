// Anything written in [square brackets] in index.html is a placeholder for you to fill in.
// Placeholders never show on the live site: the parts that hold them are hidden until you replace them.
const isPlaceholder = (t) => !t || /^\s*\[[\s\S]*\]\s*$/.test(t);

// Small pop-up messages (success and error) at the bottom of the screen.
const toast = (() => {
  const box = document.createElement('div');
  box.className = 'toast'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite');
  document.body.appendChild(box);
  let timer;
  return (msg, kind = 'ok') => {
    box.textContent = msg; box.dataset.kind = kind; box.classList.add('on');
    clearTimeout(timer); timer = setTimeout(() => box.classList.remove('on'), 3200);
  };
})();

// Header turns into a frosted bar with the section icons once you scroll past the hero,
// and cards fade up as they come into view.
(function () {
  const header = document.querySelector('.site-header');
  const hero = document.querySelector('.hero');
  const next = document.querySelector('main > .block');
  // The home page sticks while the next section slides over it. On tall phones the home page is longer
  // than the screen, so it sticks only once its bottom reaches the bottom of the screen.
  const placeHero = () => hero.style.setProperty('--hero-top', Math.min(0, window.innerHeight - hero.offsetHeight) + 'px');
  const setSolid = () => {
    const top = next.getBoundingClientRect().top;
    header.classList.toggle('solid', top < 120);
    hero.style.setProperty('--cover', Math.max(0, Math.min(1, 1 - top / window.innerHeight)).toFixed(3));
  };
  placeHero(); window.addEventListener('resize', placeHero);
  setSolid();
  window.addEventListener('scroll', setSolid, { passive: true });
  window.addEventListener('resize', setSolid);

  const items = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) { items.forEach(el => el.classList.add('in')); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: .12 });
  items.forEach(el => io.observe(el));
})();

// Work timeline: while the section is pinned, scrolling down slides the track sideways.
// The line draws itself, and each milestone grows its stem and reveals its words once it
// slides into view, all scrubbed by the scroll so it plays backwards too.
(function () {
  const section = document.querySelector('.journey');
  if (!section) return;
  const track = section.querySelector('.j-track');
  const fill = section.querySelector('.j-fill');
  const items = [...section.querySelectorAll('.j-item')];
  const rail = section.querySelector('.j-rail');
  const wide = window.matchMedia('(min-width: 761px) and (min-height: 561px)');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (v) => Math.max(0, Math.min(1, v));
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  let queued = false;

  function update() {
    queued = false;
    if (!wide.matches) { track.style.transform = ''; return; }
    const rect = section.getBoundingClientRect();
    const travel = rect.height - window.innerHeight;
    const p = clamp(-rect.top / travel);
    const distance = Math.max(0, track.scrollWidth - window.innerWidth);
    track.style.transform = `translate3d(${(-p * distance).toFixed(1)}px, 0, 0)`;
    // footsteps are laid down along the line as you scroll
    const railW = rail.offsetWidth;
    const f = clamp(p / .95) * .985;
    const walk = f * railW;
    fill.style.setProperty('--fill', (f * 100).toFixed(2) + '%');
    // each milestone pops up as the footsteps reach it
    items.forEach((li) => {
      const at = parseFloat(li.style.getPropertyValue('--x')) / 100 * railW;
      const r = reduce.matches ? 1 : clamp((walk - at + 170) / 260);
      li.style.setProperty('--r', ease(clamp(r / .5)).toFixed(3));
      [.25, .38, .5, .62].forEach((start, i) => li.style.setProperty('--r' + (i + 1), ease(clamp((r - start) / .38)).toFixed(3)));
    });
    pickScene(p, railW);
  }
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };

  // Faded place photos: one per job, shown behind the timeline while that job is the nearest.
  // A job only gets a photo once assets/work/bg-<job>.jpg exists; the rest stay plain mauve.
  const scenesBox = section.querySelector('.j-scenes');
  const scenes = new Map();
  let current = null;
  items.forEach((li) => {
    const btn = li.querySelector('.folder');
    const job = btn ? btn.dataset.book.replace('book-', '') : li.dataset.scene;
    if (!job || !scenesBox) return;
    const src = 'assets/work/bg-' + job + '.jpg';
    const img = new Image();
    img.onload = () => {
      const el = document.createElement('div');
      el.className = 'j-scene';
      el.style.backgroundImage = `url("${src}")`;
      scenesBox.appendChild(el);
      scenes.set(li, el);
      queue();
    };
    img.src = src;
    // logo sticker on the folder label, only if the file exists
    if (!btn) return;
    const logo = new Image();
    logo.onload = () => {
      logo.className = 'f-logo'; logo.alt = ''; logo.setAttribute('aria-hidden', 'true');
      btn.querySelector('.f-label').appendChild(logo);
    };
    logo.src = 'assets/work/logo-' + job + '.png';
  });
  function pickScene(p, railW) {
    if (!scenes.size) return;
    // the job nearest the focus point on screen gets its photo
    const mid = window.innerWidth * (.35 + .3 * p), gap = railW * .1;   // focus drifts left to right with the scroll
    let best = null, bestD = Infinity;
    const railLeft = rail.getBoundingClientRect().left;
    items.forEach((li) => {
      const x = railLeft + parseFloat(li.style.getPropertyValue('--x')) / 100 * railW;
      const d = Math.abs(x - mid);
      if (parseFloat(li.style.getPropertyValue('--r') || 1) < .6) return;   // wait until its folder has appeared
      if (d < bestD) { bestD = d; best = li; }
    });
    const el = best && bestD < gap * 1.5 ? scenes.get(best) || null : null;
    if (el === current) return;
    if (current) current.classList.remove('on');
    if (el) el.classList.add('on');
    current = el;
  }

  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  wide.addEventListener('change', queue);
  update();
})();

// Job folders: each folder on the timeline opens into a stack of document pages. Tap the front
// page (or use the arrows) to slide it away and bring the next one forward. The pages come from
// the <template> with the same id as the folder's data-book.
(function () {
  const dialog = document.querySelector('.book-dialog');
  if (!dialog) return;
  const pagesBox = dialog.querySelector('.pages');
  const prev = dialog.querySelector('.book-prev'), next = dialog.querySelector('.book-next');
  const count = dialog.querySelector('.book-count');
  let sheets = [], at = 0, opener = null;

  function show() {
    sheets.forEach((sh, i) => {
      const d = i - at;                                  // how far behind the front page it sits
      sh.classList.toggle('gone', d < 0);
      sh.style.setProperty('--i', Math.max(0, Math.min(d, 3)));
      sh.style.zIndex = String(sheets.length - i);
      sh.inert = d !== 0;
      sh.setAttribute('aria-hidden', d === 0 ? 'false' : 'true');
    });
    prev.disabled = at === 0;
    next.disabled = at === sheets.length - 1;
    count.textContent = `${at + 1} / ${sheets.length}`;
  }
  const go = (i) => { at = Math.max(0, Math.min(sheets.length - 1, i)); show(); };

  // Photos that exist, checked once when the page loads (missing ones are left out of the folders).
  const photoOK = {};
  document.querySelectorAll('template[id^="book-"]').forEach(t => t.content.querySelectorAll('.snap[data-src]').forEach(f => {
    const src = f.dataset.src, im = new Image();
    im.onload = () => { photoOK[src] = true; }; im.onerror = () => { photoOK[src] = false; };
    im.src = src;
  }));
  function tidyBook(box) {
    box.querySelectorAll('.snap[data-src]').forEach(f => { if (!photoOK[f.dataset.src]) f.remove(); });
    box.querySelectorAll('.p-photos').forEach(pg => { if (!pg.querySelector('.snap')) pg.remove(); });
    box.querySelectorAll('.p-rec').forEach(pg => {
      const q = pg.querySelector('.pg-quote'), by = pg.querySelector('.pg-by'), ref = pg.querySelector('.pg-ref');
      if (q && isPlaceholder(q.textContent)) { q.remove(); if (by) by.remove(); }
      else if (by && isPlaceholder(by.textContent.replace(/\]\s*\[/g, ''))) by.remove();
      if (ref && (isPlaceholder(ref.textContent) || !(ref.getAttribute('href') || '').trim())) ref.closest('.pg-ref-line').remove();
      if (!pg.querySelector('.pg-quote, .pg-ref-line')) pg.remove();
    });
    box.querySelectorAll('.pg-hint').forEach(hn => { if (box.querySelectorAll('.page').length < 2) hn.remove(); });
  }

  function open(btn) {
    const tpl = document.getElementById(btn.dataset.book);
    if (!tpl) return;
    opener = btn;
    pagesBox.replaceChildren(tpl.content.cloneNode(true));
    tidyBook(pagesBox);
    sheets = [...pagesBox.querySelectorAll('.page')].map((pg, i) => {
      const sh = document.createElement('div');
      sh.className = 'sheet'; sh.style.setProperty('--n', i);
      pg.replaceWith(sh); sh.appendChild(pg);
      pg.addEventListener('click', (e) => { if (!e.target.closest('a')) go(i + 1 < sheets.length ? i + 1 : 0); });
      return sh;
    });
    dialog.setAttribute('aria-label', 'Folder: ' + btn.querySelector('.f-role').textContent);
    // photos: show them if the file exists, otherwise keep the "add a photo" placeholder
    pagesBox.querySelectorAll('.snap[data-src]').forEach(fig => {
      fig.querySelector('.snap-img').style.backgroundImage = `url("${fig.dataset.src}")`; fig.classList.add('has-photo');
      const cap = fig.querySelector('figcaption'); if (cap && isPlaceholder(cap.textContent)) cap.remove();
    });
    // reference links: plain text until you give them a real address in index.html
    pagesBox.querySelectorAll('.pg-ref').forEach(a => {
      const href = (a.getAttribute('href') || '').trim();
      if (!href || href === '#') { a.removeAttribute('href'); a.removeAttribute('target'); a.classList.add('no-link'); }
      else if (href.startsWith('mailto:')) a.removeAttribute('target');
    });
    at = 0; show();
    dialog.showModal();
    next.focus();
  }

  document.querySelectorAll('.folder[data-book]').forEach(btn => btn.addEventListener('click', () => open(btn)));
  prev.addEventListener('click', () => go(at - 1));
  next.addEventListener('click', () => go(at + 1));
  dialog.querySelector('.book-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });   // click outside the pages
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); go(at + 1); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); go(at - 1); }
  });
  dialog.addEventListener('close', () => { if (opener) opener.focus(); });
})();

// Project cards: a real screenshot replaces the drawing when assets/projects/<name>.jpg exists,
// and clicking anywhere on a card with a link opens it (like the link itself).
(function () {
  document.querySelectorAll('.pc-media[data-src]').forEach(box => {
    const img = new Image();
    img.onload = () => { img.alt = ''; box.appendChild(img); box.querySelector('.pc-art').remove(); };
    img.src = box.dataset.src;
  });
  document.querySelectorAll('.pcard[data-href]').forEach(card => card.addEventListener('click', (e) => {
    if (e.target.closest('a') || window.getSelection().toString()) return;
    card.querySelector('.pc-link').click();
  }));
})();

// Game gallery: tap a game on the Robot Camp Games card to see its photos and description.
// Each game's content lives in a <template id="game-..."> in index.html. Photos that don't
// exist yet are skipped, and a game with no photos shows an "add photos" placeholder.
(function () {
  const dialog = document.querySelector('.gallery-dialog');
  if (!dialog) return;
  const tabs = dialog.querySelector('.g-tabs'), img = dialog.querySelector('.g-img'), cap = dialog.querySelector('.g-cap');
  const prev = dialog.querySelector('.g-prev'), next = dialog.querySelector('.g-next'), dots = dialog.querySelector('.g-dots');
  const title = dialog.querySelector('.g-title'), desc = dialog.querySelector('.g-desc');
  const chips = [...document.querySelectorAll('.game-chip')];
  const cache = {};
  let game = null, photos = [], at = 0, opener = null;

  const load = (src) => new Promise(res => { const i = new Image(); i.onload = () => res(true); i.onerror = () => res(false); i.src = src; });
  async function photosFor(id) {
    if (cache[id]) return cache[id];
    const tpl = document.getElementById('game-' + id);
    const figs = [...tpl.content.querySelectorAll('figure[data-src]')];
    const ok = await Promise.all(figs.map(f => load(f.dataset.src)));
    return (cache[id] = figs.filter((f, i) => ok[i]).map(f => {
      const c = ((f.querySelector('figcaption') || {}).textContent || '').trim();
      return { src: f.dataset.src, cap: isPlaceholder(c) ? '' : c };
    }));
  }

  function showPhoto() {
    img.replaceChildren();
    dialog.querySelector('.g-stage').hidden = !photos.length;   // no photos yet: just the title and description
    if (!photos.length) {
      cap.textContent = '';
    } else {
      const p = photos[at], el = new Image();
      el.src = p.src; el.alt = p.cap || title.textContent;
      img.appendChild(el); cap.textContent = p.cap;
    }
    prev.hidden = next.hidden = photos.length < 2;
    dots.replaceChildren(...photos.map((_, i) => { const d = document.createElement('span'); if (i === at) d.className = 'on'; return d; }));
  }

  async function select(id) {
    game = id; at = 0;
    const tpl = document.getElementById('game-' + id);
    title.textContent = tpl.dataset.title;
    const d = ((tpl.content.querySelector('.g-text') || {}).textContent || '').trim();
    desc.textContent = isPlaceholder(d) ? '' : d;
    tabs.querySelectorAll('.g-tab').forEach(t => t.setAttribute('aria-selected', t.dataset.game === id ? 'true' : 'false'));
    dialog.setAttribute('aria-label', 'Gallery: ' + tpl.dataset.title);
    photos = []; showPhoto();
    const list = await photosFor(id);
    if (game === id) { photos = list; showPhoto(); }
  }
  const step = (d) => { if (photos.length > 1) { at = (at + d + photos.length) % photos.length; showPhoto(); } };

  chips.forEach(chip => {
    const t = document.createElement('button');
    t.type = 'button'; t.className = 'g-tab'; t.dataset.game = chip.dataset.game; t.textContent = chip.textContent;
    t.addEventListener('click', () => select(chip.dataset.game));
    tabs.appendChild(t);
    chip.addEventListener('click', (e) => { e.stopPropagation(); opener = chip; dialog.showModal(); select(chip.dataset.game); dialog.querySelector('.g-close').focus(); });
  });
  prev.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));
  // A game with no photos and no description yet has nothing to open: its chip becomes a plain label.
  chips.forEach(async chip => {
    const id = chip.dataset.game, tpl = document.getElementById('game-' + id);
    const d = ((tpl && tpl.content.querySelector('.g-text')) || {}).textContent || '';
    if (!isPlaceholder(d.trim())) return;
    const list = await photosFor(id);
    if (list.length) return;
    chip.disabled = true; chip.removeAttribute('aria-haspopup'); chip.classList.add('is-plain');
    const tab = tabs.querySelector(`.g-tab[data-game="${id}"]`); if (tab) tab.remove();
    const label = document.querySelector('.pc-games-label');
    if (label && chips.every(c => c.disabled)) label.textContent = 'the five games';
  });

  dialog.querySelector('.g-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
  });
  dialog.addEventListener('close', () => { if (opener) opener.focus(); });
})();

// Recommendations carousel: reads the <figure>s in .ct-data, stacks their photos in 3D and
// shows the current quote word by word. Autoplays every 5s until someone uses the arrows.
(function () {
  const root = document.querySelector('.ctesti');
  if (!root) return;
  root.querySelectorAll('.ct-data figure').forEach(f => {
    if (isPlaceholder(f.querySelector('blockquote').textContent)) f.remove();
  });
  const figs = [...root.querySelectorAll('.ct-data figure')];
  if (!figs.length) {
    document.getElementById('recommendations').classList.add('is-empty');
    document.querySelectorAll('[data-needs="recommendations"]').forEach(el => el.classList.add('is-empty'));
    return;
  }
  const imgs = root.querySelector('.ct-images'), text = root.querySelector('.ct-text');
  const count = root.querySelector('.ct-count');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const n = figs.length;
  let at = 0, timer = null, visible = false, stopped = false;

  const data = figs.map((f) => ({
    quote: f.querySelector('blockquote').textContent.trim(),
    name: f.querySelector('strong').textContent.trim(),
    role: (f.querySelector('figcaption span') || {}).textContent || '',
    photo: f.dataset.photo || ''
  }));
  const initials = (name) => name.replace(/[\[\]]/g, '').split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';

  const cards = data.map((d, i) => {
    const el = document.createElement('figure');
    el.className = 'ct-img';
    const person = '<svg viewBox="0 0 64 64" width="84" height="84" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><circle cx="32" cy="24" r="11"/><path d="M12 54c2-11 10-17 20-17s18 6 20 17"/></svg>';
    el.innerHTML = `<div class="ct-ph">${d.name.startsWith('[') ? person : `<b>${initials(d.name)}</b>`}<small>add a photo</small></div>`;
    if (d.photo) {
      const im = new Image();
      im.alt = '';
      im.onload = () => { el.innerHTML = ''; el.appendChild(im); };
      im.src = d.photo;
    }
    el.addEventListener('click', () => { if (i !== at) { go(i); stop(); } });
    imgs.appendChild(el);
    return el;
  });

  function setGap() {
    const w = imgs.offsetWidth;
    const gap = w <= 340 ? 44 : Math.min(86, 44 + (w - 340) * .1);
    imgs.style.setProperty('--gap', gap.toFixed(0) + 'px');
  }

  function render() {
    cards.forEach((c, i) => {
      c.classList.toggle('is-active', i === at);
      c.classList.toggle('is-left', n > 2 && i === (at - 1 + n) % n);
      c.classList.toggle('is-right', n > 1 && i === (at + 1) % n);
    });
    const d = data[at];
    const words = d.quote.split(/\s+/).map((w, i) => `<span class="ct-w" style="--i:${i}">${w.replace(/</g, '&lt;')}&nbsp;</span>`).join('');
    text.innerHTML = `<h3>${d.name}</h3><p class="ct-role">${d.role}</p><blockquote>${words}</blockquote>`;
    text.classList.remove('swap'); void text.offsetWidth; text.classList.add('swap');
    if (count) count.textContent = `${at + 1} / ${n}`;
  }
  function go(i) { at = (i + n) % n; render(); }
  function stop() { stopped = true; clearInterval(timer); timer = null; }
  function sync() {
    const run = visible && !stopped && !reduce.matches && n > 1 && !document.hidden;
    if (run && !timer) timer = setInterval(() => go(at + 1), 5000);
    if (!run && timer) { clearInterval(timer); timer = null; }
  }

  root.querySelector('.ct-prev').addEventListener('click', () => { go(at - 1); stop(); });
  root.querySelector('.ct-next').addEventListener('click', () => { go(at + 1); stop(); });
  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { go(at - 1); stop(); }
    if (e.key === 'ArrowRight') { go(at + 1); stop(); }
  });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); }, { threshold: .3 }).observe(root);
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('resize', setGap);
  setGap(); render();
})();

// Get in touch form: checks each field, then sends to Netlify Forms without leaving the page.
// Success shows a thank-you note; problems show a message under the field, or an email link if sending fails.
(function () {
  const form = document.querySelector('.gt-form');
  if (!form) return;
  form.noValidate = true;                    // use the friendlier messages below instead of the browser's
  const status = form.querySelector('.gt-status');
  const btn = form.querySelector('.gt-submit');
  const btnText = btn.textContent;
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const rules = {
    name: (v) => v.trim().length < 2 ? 'Please tell me your name.' : '',
    email: (v) => !v.trim() ? 'I need your email so I can write back.' : !emailRe.test(v.trim()) ? 'That email doesn\'t look right. Check for a typo?' : '',
    message: (v) => v.trim().length < 10 ? 'Please write a little more (at least 10 characters).' : ''
  };
  const fields = Object.keys(rules).map(n => form.elements[n]);
  fields.forEach(el => {
    const err = document.createElement('small');
    err.className = 'gt-err'; err.id = 'err-' + el.name; err.setAttribute('aria-live', 'polite');
    el.closest('.gt-field').appendChild(err);
    el.setAttribute('aria-describedby', err.id);
    el.addEventListener('blur', () => { if (el.value) check(el); });
    el.addEventListener('input', () => { if (el.getAttribute('aria-invalid') === 'true') check(el); });
  });
  function check(el) {
    const msg = rules[el.name](el.value);
    el.setAttribute('aria-invalid', msg ? 'true' : 'false');
    document.getElementById('err-' + el.name).textContent = msg;
    return !msg;
  }
  function setStatus(html, kind) { status.className = 'gt-status' + (kind ? ' ' + kind : ''); status.innerHTML = html; }

  if (/[?&]sent=1/.test(location.search)) setStatus('Thanks! Your message is on its way. I\'ll write back soon.', 'ok');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const bad = fields.filter(el => !check(el));
    if (bad.length) {
      setStatus('Please fix the highlighted field' + (bad.length > 1 ? 's' : '') + ' above.', 'err');
      bad[0].focus();
      return;
    }
    btn.disabled = true; btn.textContent = 'Sending…'; setStatus('', '');
    const data = new FormData(form);
    try {
      if (location.protocol === 'file:' || !navigator.onLine) throw new Error('offline');
      const res = await fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(data).toString() });
      if (!res.ok) throw new Error(res.status);
      const who = (data.get('name') || '').trim().split(/\s+/)[0];
      form.reset(); fields.forEach(el => el.removeAttribute('aria-invalid'));
      setStatus(`Thanks${who ? ', ' + who.replace(/</g, '&lt;') : ''}! Your message is on its way. I'll write back soon.`, 'ok');
      toast('Message sent. Thank you!');
    } catch (err) {
      const mail = 'mailto:alina.mukeer@gmail.com?subject=' + encodeURIComponent('Hello from ' + (data.get('name') || 'your website')) +
        '&body=' + encodeURIComponent((data.get('message') || '') + '\n\n' + (data.get('name') || '') + (data.get('org') ? ', ' + data.get('org') : '') + '\n' + (data.get('email') || ''));
      setStatus(`Sorry, that didn't send${navigator.onLine ? '' : ' (you seem to be offline)'}. <a href="${mail}">Email me instead</a>, your message is already filled in.`, 'err');
      toast('Message not sent. Try the email link.', 'err');
    } finally { btn.disabled = false; btn.textContent = btnText; }
  });
})();

// Mobile menu: opens from the button in the header; closes on a link, Escape, or a tap outside.
(function () {
  const btn = document.querySelector('.menu-btn'), menu = document.getElementById('mobile-menu');
  if (!btn || !menu) return;
  const setOpen = (open) => {
    menu.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.documentElement.classList.toggle('menu-open', open);
  };
  btn.addEventListener('click', () => { const open = menu.hidden; setOpen(open); if (open) menu.querySelector('a').focus(); });
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { setOpen(false); btn.focus(); } });
  document.addEventListener('click', (e) => { if (!menu.hidden && !menu.contains(e.target) && !btn.contains(e.target)) setOpen(false); });
  window.matchMedia('(min-width: 761px) and (min-height: 501px)').addEventListener('change', (m) => { if (m.matches) setOpen(false); });
})();

// Footer year stays current, and the email address can be copied with one tap.
(function () {
  document.querySelectorAll('.f-year').forEach(el => { el.textContent = new Date().getFullYear(); });
  const addr = 'alina.mukeer@gmail.com';
  document.querySelectorAll('.gt-copy').forEach(b => b.addEventListener('click', async () => {
    const fallback = () => {                 // older browsers: copy through a hidden text box
      const t = document.createElement('textarea');
      t.value = addr; t.setAttribute('readonly', ''); t.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
      document.body.appendChild(t); t.select();
      const ok = document.execCommand && document.execCommand('copy'); t.remove();
      if (!ok) throw new Error('copy failed');
    };
    try {
      try { await navigator.clipboard.writeText(addr); } catch (e) { fallback(); }
      b.classList.add('done'); b.querySelector('span').textContent = 'Copied';
      toast('Email address copied.');
      setTimeout(() => { b.classList.remove('done'); b.querySelector('span').textContent = 'Copy'; }, 2000);
    } catch (e) {
      toast('Couldn\'t copy. The address is ' + addr, 'err');
    }
  }));
})();

// "Back to top" links (the logo, Home in the menu, the footer link). The home section is pinned while the
// timeline slides over it, so jumping to its anchor wouldn't reach the real top; scroll to 0 instead.
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href="#top"]');
  if (!a || e.metaKey || e.ctrlKey) return;
  e.preventDefault();
  window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  history.replaceState(null, '', location.pathname + location.search);
});
