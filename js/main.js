/* ============================================================
   main.js — page behaviour
   scroll → 3D state, navigation, reveal, counters, drag-to-rotate, tilt
   ============================================================ */
(function () {
  document.body.classList.add('js');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const slides = $$('.slide');
  const links = { home: document.querySelector('[data-nav="home"]'), about: document.querySelector('[data-nav="about"]'), more: document.getElementById('more-btn') };

  /* ---- read each slide's 3D state from its data-* attributes ---- */
  const num = (v, d) => (v === undefined || v === '' ? d : parseFloat(v));
  const states = slides.map((el) => {
    const d = el.dataset;
    if (d.dim) el.style.setProperty('--dim', d.dim);
    return {
      nx: num(d.nx, 0), ny: num(d.ny, 0), r: num(d.r, 1), lon: num(d.lon, 0),
      sun: (d.sun || '1,.3,.7').split(',').map(parseFloat),
      mx: num(d.mx, -2), my: num(d.my, 1), mr: num(d.mr, .01),
      fx: d.fx || '', nebula: d.nebula ? 1 : 0, planets: d.planets ? 1 : 0,
      flare: d.flare === '1', ice: d.ice === '1'
    };
  });

  /* ---- ice floes for the pollution slide ---- */
  const ice = document.getElementById('ice');
  for (let i = 0; i < 46; i++) {
    const b = document.createElement('i'), s = 6 + Math.random() * 38;
    const pts = Array.from({ length: 7 }, (_, k) => { const a = (k / 7) * Math.PI * 2, r = 38 + Math.random() * 12; return `${50 + Math.cos(a) * r}% ${50 + Math.sin(a) * r}%`; }).join(',');
    b.style.cssText = `clip-path:polygon(${pts});border-radius:0;left:${Math.random() * 100}%;top:${Math.random() * 100}%;width:${s}px;height:${s * (.45 + Math.random() * .4)}px;animation-delay:${-Math.random() * 18}s;animation-duration:${14 + Math.random() * 12}s;opacity:${.3 + Math.random() * .5}`;
    ice.appendChild(b);
  }

  if (reduce) $$('animate').forEach((a) => a.remove());

  /* ---- counters ---- */
  function countUp(el) {
    const end = parseFloat(el.dataset.count), dec = parseInt(el.dataset.dec || '0', 10), sep = 'sep' in el.dataset;
    const fmt = (v) => { const s = v.toFixed(dec); return sep ? Number(s).toLocaleString('en-US') : s; };
    if (reduce) { el.textContent = fmt(end); return; }
    const t0 = performance.now(), dur = 1600;
    (function tick(t) {
      const p = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(end * e);
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }

  /* ---- which slide is in view ---- */
  let active = -1;
  function update() {
    const mid = window.innerHeight * .5;
    let idx = 0;
    slides.forEach((s, i) => { const r = s.getBoundingClientRect(); if (r.top <= mid && r.bottom > mid) idx = i; });
    if (idx !== active) {
      active = idx;
      const st = states[idx], el = slides[idx];
      if (window.EarthScene) window.EarthScene.setState(st);
      document.body.classList.toggle('flare-on', st.flare);
      document.body.classList.toggle('ice-on', st.ice);
      links.home.classList.toggle('active', idx === 0 || idx === slides.length - 1);
      links.about.classList.toggle('active', idx === 1);
      links.more.classList.toggle('active', idx > 1 && idx < slides.length - 1);
      if (!el.classList.contains('is-in')) {
        el.classList.add('is-in');
        $$('[data-count]', el).forEach(countUp);
      }
    }
    const max = document.documentElement.scrollHeight - window.innerHeight;
    document.getElementById('progress-bar').style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + '%';
  }
  let ticking = false;
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { update(); ticking = false; }); } }, { passive: true });
  window.addEventListener('resize', update);
  update();

  /* ---- "More" menu ---- */
  const menu = document.getElementById('more-menu');
  const setMenu = (open) => { menu.hidden = !open; links.more.setAttribute('aria-expanded', String(open)); };
  links.more.addEventListener('click', (e) => { e.stopPropagation(); setMenu(menu.hidden); });
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('click', (e) => { if (!menu.hidden && !e.target.closest('.nav-wrap')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  /* ---- drag the planet (hero, intro, facts, space, thanks) ---- */
  let drag = null;
  document.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('[data-drag]')) return;
    drag = { x: e.clientX, y: e.clientY };
  });
  window.addEventListener('pointermove', (e) => {
    if (!drag || !window.EarthScene) return;
    window.EarthScene.nudge(e.clientX - drag.x, e.clientY - drag.y);
    drag.x = e.clientX; drag.y = e.clientY;
  });
  ['pointerup', 'pointercancel'].forEach((ev) => window.addEventListener(ev, () => { drag = null; }));

  /* ---- 3D tilt on cards ---- */
  if (!reduce && window.matchMedia('(hover: hover)').matches) {
    $$('.tilt').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        card.style.setProperty('--ry', (x * 12).toFixed(2) + 'deg');
        card.style.setProperty('--rx', (-y * 12).toFixed(2) + 'deg');
      });
      card.addEventListener('pointerleave', () => { card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); });
    });
  }
})();
