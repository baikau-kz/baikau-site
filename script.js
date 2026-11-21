// Kazakh/Russian text helper (see i18n.js) — falls back to the Russian string.
const tr = (ru, vars) => (window.I18N ? window.I18N.t(ru, vars) : ru);

// Glowing cursor-tracking card border — a gold arc traces the card's edge
// following the mouse. Applied only to the "problems we solve" cards.
(function initGlowCards(){
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const selectors = ['.problem-card'];
  const cardEls = document.querySelectorAll(selectors.join(','));
  if (!cardEls.length) return;

  const PROXIMITY = 80;
  const SPREAD_DEG = 26;
  const INACTIVE_ZONE = 0.4;
  const MOVEMENT_MS = 260;

  const cards = Array.from(cardEls).map(el => {
    el.classList.add('glow-card');
    const border = document.createElement('span');
    border.className = 'glow-border';
    border.setAttribute('aria-hidden', 'true');
    el.prepend(border);
    return { el, rect: null, angle: 0, targetAngle: 0, animFrom: 0, animStart: 0, animating: false, active: false };
  });

  let mouseX = -9999;
  let mouseY = -9999;

  // Card positions only change on scroll/resize, not every frame — cache
  // them there instead of forcing a synchronous layout read (getBoundingClientRect)
  // for every card on every single animation frame.
  function refreshRects(){
    cards.forEach(c => { c.rect = c.el.getBoundingClientRect(); });
  }
  refreshRects();
  window.addEventListener('scroll', refreshRects, { passive: true });
  window.addEventListener('resize', refreshRects, { passive: true });

  function shortestAngleDiff(from, to){
    return (((to - from) % 360) + 540) % 360 - 180;
  }

  function tick(now){
    cards.forEach(c => {
      const rect = c.rect;
      if (!rect || rect.bottom < -200 || rect.top > window.innerHeight + 200) {
        if (c.active) { c.active = false; c.el.style.setProperty('--active', '0'); }
        return;
      }

      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const distFromCenter = Math.hypot(mouseX - cx, mouseY - cy);
      const inactiveRadius = 0.5 * Math.min(rect.width, rect.height) * INACTIVE_ZONE;

      let active = false;
      if (distFromCenter >= inactiveRadius) {
        active =
          mouseX > rect.left - PROXIMITY &&
          mouseX < rect.right + PROXIMITY &&
          mouseY > rect.top - PROXIMITY &&
          mouseY < rect.bottom + PROXIMITY;
      }

      if (active !== c.active) {
        c.active = active;
        c.el.style.setProperty('--active', active ? '1' : '0');
      }
      if (!active) return;

      const rawTarget = (180 * Math.atan2(mouseY - cy, mouseX - cx)) / Math.PI + 90;
      const diff = shortestAngleDiff(c.angle, rawTarget);
      const newTarget = c.angle + diff;

      if (!c.animating || Math.abs(newTarget - c.targetAngle) > 0.5) {
        c.animFrom = c.angle;
        c.targetAngle = newTarget;
        c.animStart = now;
        c.animating = true;
      }
    });

    let stillAnimating = false;
    cards.forEach(c => {
      if (!c.animating) return;
      const t = Math.min((now - c.animStart) / MOVEMENT_MS, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      c.angle = c.animFrom + (c.targetAngle - c.animFrom) * eased;
      c.el.style.setProperty('--start', String(c.angle));
      if (t >= 1) c.animating = false; else stillAnimating = true;
    });

    // Keep ticking only while something is actually moving or a card is
    // active (mouse nearby). Otherwise stop — no need to burn a frame budget
    // every 16ms across the whole site when nothing on screen is changing.
    const anyActive = cards.some(c => c.active);
    if (stillAnimating || anyActive) {
      requestAnimationFrame(tick);
    } else {
      loopRunning = false;
    }
  }

  let loopRunning = false;
  function ensureLoopRunning(){
    if (!loopRunning) {
      loopRunning = true;
      requestAnimationFrame(tick);
    }
  }

  document.addEventListener('pointermove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    ensureLoopRunning();
  }, { passive: true });

  ensureLoopRunning();
})();

// Hero beams — animated warm-gold light beams drifting upward behind the
// hero content, drawn on a canvas scoped to the hero section.
(function initHeroBeams(){
  const canvas = document.getElementById('heroBeams');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const section = canvas.closest('.hero-beams');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MINIMUM_BEAMS = 16;
  let beams = [];
  let animId = null;

  function createBeam(width, height){
    const angle = -35 + Math.random() * 10;
    return {
      x: Math.random() * width * 1.5 - width * 0.25,
      y: Math.random() * height * 1.5 - height * 0.25,
      width: 30 + Math.random() * 60,
      length: height * 2.5,
      angle,
      speed: 0.6 + Math.random() * 1.2,
      opacity: 0.12 + Math.random() * 0.16,
      hue: 32 + Math.random() * 26,
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: 0.02 + Math.random() * 0.03,
    };
  }

  function resetBeam(beam, index, total){
    const column = index % 3;
    const spacing = canvas.width / 3;
    beam.y = canvas.height + 100;
    beam.x = column * spacing + spacing / 2 + (Math.random() - 0.5) * spacing * 0.5;
    beam.width = 100 + Math.random() * 100;
    beam.speed = 0.5 + Math.random() * 0.4;
    beam.hue = 32 + (index * 26) / total;
    beam.opacity = 0.2 + Math.random() * 0.1;
    return beam;
  }

  function drawBeam(beam){
    ctx.save();
    ctx.translate(beam.x, beam.y);
    ctx.rotate((beam.angle * Math.PI) / 180);

    const pulsingOpacity = beam.opacity * (0.8 + Math.sin(beam.pulse) * 0.2);
    const gradient = ctx.createLinearGradient(0, 0, 0, beam.length);
    gradient.addColorStop(0, `hsla(${beam.hue}, 70%, 60%, 0)`);
    gradient.addColorStop(0.1, `hsla(${beam.hue}, 70%, 60%, ${pulsingOpacity * 0.5})`);
    gradient.addColorStop(0.4, `hsla(${beam.hue}, 70%, 60%, ${pulsingOpacity})`);
    gradient.addColorStop(0.6, `hsla(${beam.hue}, 70%, 60%, ${pulsingOpacity})`);
    gradient.addColorStop(0.9, `hsla(${beam.hue}, 70%, 60%, ${pulsingOpacity * 0.5})`);
    gradient.addColorStop(1, `hsla(${beam.hue}, 70%, 60%, 0)`);

    ctx.fillStyle = gradient;
    ctx.fillRect(-beam.width / 2, 0, beam.width, beam.length);
    ctx.restore();
  }

  function updateCanvasSize(){
    const rect = (section || canvas).getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    const total = Math.floor(MINIMUM_BEAMS * 1.5);
    beams = Array.from({ length: total }, () => createBeam(canvas.width, canvas.height));
  }

  function renderFrame(){
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    beams.forEach(drawBeam);
  }

  // Note: no ctx.filter blur here — the canvas element already gets a CSS
  // blur (cheap, GPU-composited). Blurring every pixel of every beam inside
  // the 2D context every frame is much more expensive and was competing with
  // other on-page animations for the main thread.
  function animate(){
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const total = beams.length;
    beams.forEach((beam, i) => {
      beam.y -= beam.speed;
      beam.pulse += beam.pulseSpeed;
      if (beam.y + beam.length < -100) resetBeam(beam, i, total);
      drawBeam(beam);
    });
    animId = requestAnimationFrame(animate);
  }

  updateCanvasSize();
  window.addEventListener('resize', () => {
    if (animId) cancelAnimationFrame(animId);
    updateCanvasSize();
    if (reducedMotion) renderFrame(); else animate();
  });

  if (reducedMotion){
    renderFrame();
  } else {
    animate();
  }
})();

// Origin CTA button — fill expands from the pointer/tap/focus origin point,
// sized so it always fully covers the button regardless of where it started.
(function initOriginButton(){
  const btn = document.getElementById('originCta');
  const fill = btn ? btn.querySelector('.origin-fill') : null;
  if (!btn || !fill) return;

  function coverDiameter(w, h, x, y){
    return Math.ceil(2 * Math.max(
      Math.hypot(x, y),
      Math.hypot(w - x, y),
      Math.hypot(x, h - y),
      Math.hypot(w - x, h - y)
    ));
  }

  function setOrigin(x, y){
    const rect = btn.getBoundingClientRect();
    const size = coverDiameter(rect.width, rect.height, x, y);
    fill.style.left = x + 'px';
    fill.style.top = y + 'px';
    fill.style.width = size + 'px';
    fill.style.height = size + 'px';
  }

  function setOriginFromEvent(e){
    const rect = btn.getBoundingClientRect();
    setOrigin(e.clientX - rect.left, e.clientY - rect.top);
  }

  function setOriginFromCenter(){
    const rect = btn.getBoundingClientRect();
    setOrigin(rect.width / 2, rect.height / 2);
  }

  btn.addEventListener('pointerenter', (e) => {
    setOriginFromEvent(e);
    btn.classList.add('is-filled');
  });
  btn.addEventListener('pointerdown', (e) => {
    setOriginFromEvent(e);
    btn.classList.add('is-filled');
  });
  btn.addEventListener('pointerleave', () => {
    btn.classList.remove('is-filled');
  });
  btn.addEventListener('focus', () => {
    setOriginFromCenter();
    btn.classList.add('is-filled');
  });
  btn.addEventListener('blur', () => {
    btn.classList.remove('is-filled');
  });
})();

// Scroll reveal — headings, leads and cards fade/rise into place the first
// time they enter the viewport, so the page feels alive while scrolling
// instead of every section just being fully present from the start.
// Content already visible in the first viewport on load is left alone
// (marking it .reveal there would hide it and then "pop" it back in,
// reading as a glitch rather than an entrance).
(function initScrollReveal(){
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;

  const selector = [
    '.section h2', '.cta-text h2', '.section-lead',
    '.problem-card', '.service-card', '.package-card', '.stat',
    '.cycle-card', '.review-card', '.goldkey-visual', '.goldkey-tags span',
    '.steps-list li', '.sla-list li',
  ].join(',');
  const els = Array.from(document.querySelectorAll(selector));
  if (!els.length) return;

  // Stagger siblings revealing together (cards in the same grid, items in
  // the same list) instead of every matched element sharing one counter.
  const siblingIndex = new Map();

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      el.classList.add('revealed');
      observer.unobserve(el);
      el.addEventListener('animationend', () => {
        el.classList.remove('reveal', 'revealed');
        el.style.animationDelay = '';
      }, { once: true });
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

  els.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) return;

    const parent = el.parentElement;
    const i = siblingIndex.get(parent) || 0;
    siblingIndex.set(parent, i + 1);

    el.classList.add('reveal');
    el.style.animationDelay = (Math.min(i, 6) * 70) + 'ms';
    observer.observe(el);
  });
})();

// Stat counters — numbers in the "about" section count up from zero the
// first time they scroll into view instead of just sitting there static.
(function initStatCounters(){
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;

  const nums = Array.from(document.querySelectorAll('.stat-num'));
  if (!nums.length) return;

  function animateCount(el, target, suffix){
    const duration = 900;
    const start = performance.now();
    function step(now){
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = Number(el.dataset.countTarget);
      el.textContent = '0' + el.dataset.countSuffix;
      animateCount(el, target, el.dataset.countSuffix);
      observer.unobserve(el);
    });
  }, { threshold: 0.6 });

  nums.forEach(el => {
    const match = el.textContent.trim().match(/^(\d+)(.*)$/);
    if (!match) return;

    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) return; // already visible — leave the static value as-is

    el.dataset.countTarget = match[1];
    el.dataset.countSuffix = match[2];
    observer.observe(el);
  });
})();

// Mobile menu toggle
const burgerBtn = document.getElementById('burgerBtn');
const mobileNav = document.getElementById('mobileNav');

burgerBtn.addEventListener('click', () => {
  mobileNav.classList.toggle('open');
  burgerBtn.classList.toggle('open');
});

mobileNav.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => mobileNav.classList.remove('open'));
});

// Services carousel controls
const svcCarousel = document.getElementById('svcCarousel');
const svcPrev = document.getElementById('svcPrev');
const svcNext = document.getElementById('svcNext');

function scrollByCard(direction){
  const card = svcCarousel.querySelector('.service-card');
  const gap = 20;
  const distance = (card ? card.offsetWidth : 300) + gap;
  svcCarousel.scrollBy({ left: direction * distance, behavior: 'smooth' });
}

svcPrev.addEventListener('click', () => scrollByCard(-1));
svcNext.addEventListener('click', () => scrollByCard(1));

// Toast notifications — small transient cards in the corner that confirm an
// action happened (like a "push notification") without blocking the page
// the way an alert() or an inline message would.
function showToast({ title, message, duration = 6000 } = {}){
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  toast.style.setProperty('--toast-duration', duration + 'ms');
  toast.innerHTML = `
    <span class="toast-icon" aria-hidden="true">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
    </span>
    <span class="toast-body">
      <span class="toast-title"></span>
      <span class="toast-message"></span>
    </span>
    <button type="button" class="toast-close" aria-label="Закрыть уведомление">&times;</button>
    <span class="toast-progress" aria-hidden="true"></span>
  `;
  toast.querySelector('.toast-title').textContent = title || '';
  toast.querySelector('.toast-message').textContent = message || '';

  function remove(){
    if (!toast.isConnected) return;
    clearTimeout(timer);
    toast.classList.add('toast-out');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }

  toast.querySelector('.toast-close').addEventListener('click', remove);
  container.appendChild(toast);
  const timer = setTimeout(remove, duration);
}

// One Google Apps Script Web App serves everything dynamic: form requests
// and reviews (POST), reviews and completed works (GET ?action=...).
const SITE_API_URL = 'https://script.google.com/macros/s/AKfycbyZI1_83BDqEzABMASYSYEPKhd0TWNXSXopKr5qJASh9Ca0DffQEyM9hVLYuSGqxW2r/exec';

// Contact form — no backend on this site, so a submission does two things:
// 1) hands off to WhatsApp (the same number as the contact dock), pre-filled
//    with what the visitor entered, matching the form's own
//    "Телефон / WhatsApp" field;
// 2) if GOOGLE_SHEET_WEBHOOK_URL is set (see README-google-sheet.md for how
//    to get one), also fire-and-forgets the same data to a Google Apps
//    Script Web App that appends it as a row in a Google Sheet.
(function initCtaForm(){
  const form = document.getElementById('ctaForm');
  if (!form) return;

  // Dispatcher WhatsApp number (changed 21.11 per Дамеля): +7 700 780 24 26.
  // The resident never types it — it is the wa.me target below.
  const WHATSAPP_NUMBER = '77007802426';

  // Paste the URL you get from "Deploy > Web app" in Google Apps Script here
  // (looks like https://script.google.com/macros/s/AKfycb.../exec). Leave it
  // empty to skip the Google Sheet step entirely — WhatsApp still works.
  const GOOGLE_SHEET_WEBHOOK_URL = SITE_API_URL;

  function sendToGoogleSheet(name, phone, comment){
    if (!GOOGLE_SHEET_WEBHOOK_URL) return;
    // no-cors + text/plain: Apps Script Web Apps don't handle a CORS
    // preflight (which a JSON content-type would trigger), and we don't
    // need to read the response back — the site already shows its own
    // confirmation message regardless of whether this call succeeds.
    fetch(GOOGLE_SHEET_WEBHOOK_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ name, phone, comment, date: new Date().toISOString() }),
    }).catch(() => {}); // best-effort — a failed sheet write shouldn't block the visitor
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;

    const name = form.elements.name.value.trim();
    const phone = form.elements.phone.value.trim();
    const comment = form.elements.comment.value.trim();

    sendToGoogleSheet(name, phone, comment);

    // Format Дамеля asked for (21.08): a natural greeting instead of a
    // labeled data dump — phone isn't repeated here since WhatsApp already
    // shows the sender's number to whoever receives the chat.
    let text = tr('Здравствуйте, меня зовут {name}.', { name });
    if (comment) text += `\n\n${tr('Заявка:')} ${comment}`;

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener');

    showToast({
      title: tr('Заявка принята!'),
      message: tr('{name}, мы получили вашу заявку. Продолжите отправку в открывшемся окне WhatsApp.', { name }),
    });
    form.reset();
  });
})();

// Completed-work showcase (до/после) — same idea as the contact form: a
// Google Form the dispatcher fills in feeds a Google Sheet, and a small
// Apps Script Web App (doGet, not doPost this time) hands that sheet back
// as JSON. WORKS_FEED_URL stays empty until that Form/Sheet/Apps Script is
// set up — until then the section just keeps the "раздел наполняется"
// placeholder already in index.html, so nothing looks broken in the
// meantime. Expected shape once wired up:
//   [{ title: "ЖК Арман, дом 3", description: "Замена стояков", beforeUrl: "...", afterUrl: "..." }, ...]
(function initWorksGallery(){
  const grid = document.getElementById('worksGrid');
  if (!grid) return;

  const WORKS_FEED_URL = SITE_API_URL + '?action=works';

  // Interim content (01.09) — Дамеля sent these photos directly over
  // WhatsApp before the Форма/Таблица existed, so they're hardcoded here
  // rather than pulled from a feed. Once WORKS_FEED_URL is set, real
  // dispatcher-submitted entries take over and this list can be deleted.
  const STARTER_ITEMS = [
    { type: 'video', title: 'Видео «До и после»', description: 'Несколько объектов подряд: инженерные сети, освещение, входная группа.', videoUrl: 'videos/do-i-posle.mp4', posterUrl: 'videos/do-i-posle-poster.webp' },
    { title: 'Ремонт уличного освещения', description: 'Восстановили плафоны на опоре — все три работают.', beforeUrl: 'images/works/lamp-before.webp', afterUrl: 'images/works/lamp-after.webp' },
    { title: 'Ремонт дверного доводчика', description: 'Заменили изношенный доводчик входной группы на новый.', beforeUrl: 'images/works/door-after.webp', afterUrl: 'images/works/door-before.webp' },
    { title: 'Ремонт опоры ограждения', description: 'Загерметизировали основание опоры.', beforeUrl: 'images/works/bollard-before.webp', afterUrl: 'images/works/bollard-after.webp' },
  ];

  function escapeHtml(str){
    return String(str).replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[ch]));
  }

  let currentWorks = [];
  function renderWorks(items){
    if (!Array.isArray(items) || !items.length) return; // keep the placeholder
    currentWorks = items;

    const LIMIT = 6;
    let more = document.getElementById('worksMore');
    if (more) more.remove();

    grid.innerHTML = items.map((item, index) => {
      const title = escapeHtml(tr(item.title || ''));
      const description = escapeHtml(tr(item.description || '').replace(' · Мастер: ', ' · ' + tr('Мастер:') + ' '));

      const media = item.type === 'video'
        ? `<div class="work-video-thumb"><video controls preload="none" poster="${item.posterUrl}"><source src="${item.videoUrl}" type="video/mp4"></video></div>`
        : `<div class="work-photos">
            <div class="work-photo" data-label="${tr('До')}"><img src="${escapeHtml(item.beforeUrl)}" alt="${tr('До')} — ${title}" loading="lazy"></div>
            <div class="work-photo" data-label="${tr('После')}"><img src="${escapeHtml(item.afterUrl)}" alt="${tr('После')} — ${title}" loading="lazy"></div>
          </div>`;

      return `
        <article class="work-card"${index >= LIMIT ? ' hidden' : ''}>
          ${media}
          <div class="work-info">
            <h4>${title}</h4>
            ${description ? `<p>${description}</p>` : ''}
          </div>
        </article>
      `;
    }).join('');

    if (items.length > LIMIT) {
      more = document.createElement('button');
      more.type = 'button';
      more.id = 'worksMore';
      more.className = 'btn btn-ghost works-more';
      more.textContent = tr('Показать все работы');
      more.addEventListener('click', () => {
        grid.querySelectorAll('.work-card[hidden]').forEach((card) => card.removeAttribute('hidden'));
        more.remove();
      });
      grid.after(more);
    }
  }

  document.addEventListener('langchange', () => { if (currentWorks.length) renderWorks(currentWorks); });

  // Showing the starter set right away, then putting live entries (newest
  // first) ahead of it once the feed answers — the section never sits empty.
  renderWorks(STARTER_ITEMS);

  fetch(WORKS_FEED_URL)
    .then((r) => r.json())
    .then((feed) => {
      if (Array.isArray(feed) && feed.length) renderWorks(feed.concat(STARTER_ITEMS));
    })
    .catch(() => {});
})();

// Resident reviews — same Apps Script as the contact form. Submitting is a
// fire-and-forget POST (no-cors, like the form); the new review is shown
// right away on this device and everyone else sees it on next load. Masters
// (sheet tab «Мастера») are optional: when present, residents can rate a
// specific master. The director's mode (password checked server-side)
// shows a delete button on every review.
(function initReviews(){
  const form = document.getElementById('reviewForm');
  const list = document.getElementById('reviewsList');
  const summary = document.getElementById('reviewsSummary');
  const moreBtn = document.getElementById('reviewsMore');
  const mastersBlock = document.getElementById('mastersBlock');
  const mastersGrid = document.getElementById('mastersGrid');
  const masterSelect = document.getElementById('reviewMaster');
  const adminToggle = document.getElementById('adminToggle');
  if (!form || !list) return;

  const PAGE = 5;
  const COOLDOWN_MS = 60 * 1000;
  let reviews = [];
  let masters = [];
  let shown = PAGE;
  let adminPassword = '';
  try { adminPassword = sessionStorage.getItem('baikauAdmin') || ''; } catch (err) {}

  function esc(str){
    return String(str).replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[ch]));
  }

  function stars(n){
    const full = Math.max(0, Math.min(5, Math.round(n)));
    return '★'.repeat(full) + `<span class="off">${'★'.repeat(5 - full)}</span>`;
  }

  function fmtDate(iso){
    const d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleDateString('ru-RU');
  }

  function plural(n){
    if (window.I18N && window.I18N.lang === 'kk') return 'пікір';
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return 'отзыв';
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'отзыва';
    return 'отзывов';
  }

  function renderMasters(){
    if (!masters.length) { mastersBlock.hidden = true; masterSelect.hidden = true; return; }
    mastersBlock.hidden = false;
    masterSelect.hidden = false;

    const card = (m) => `
      <article class="master-card">
        ${m.photo ? `<img src="${esc(m.photo)}" alt="${esc(m.name)}" loading="lazy">` : '<div class="master-photo-empty"></div>'}
        <div class="master-info">
          <strong>${esc(m.name)}</strong>
          ${m.role ? `<span>${esc(m.role)}</span>` : ''}
          <div class="master-rating">${m.count ? `<span class="stars">${stars(m.average)}</span> ${String(m.average).replace('.', ',')} <span class="muted">· ${m.count}</span>` : '<span class="muted">Пока без оценок</span>'}</div>
          <button type="button" class="master-rate" data-name="${esc(m.name)}">Оценить</button>
        </div>
      </article>
    `;
    const isDispatcher = (m) => /диспетчер/i.test(m.role);
    const crew = masters.filter((m) => !isDispatcher(m));
    const dispatchers = masters.filter(isDispatcher);

    mastersGrid.innerHTML = crew.map(card).join('') +
      (dispatchers.length ? '<div class="masters-divider" role="separator"></div>' + dispatchers.map(card).join('') : '');

    masterSelect.innerHTML = '<option value="">Мастер (необязательно)</option>' +
      masters.map((m) => `<option value="${esc(m.name)}">${esc(m.name)}</option>`).join('');
  }

  mastersGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.master-rate');
    if (!btn) return;
    masterSelect.value = btn.dataset.name;
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    form.elements.name.focus({ preventScroll: true });
  });

  function render(){
    if (!reviews.length) {
      list.innerHTML = '<p class="reviews-empty">Пока нет отзывов — станьте первым.</p>';
      summary.hidden = true;
      moreBtn.hidden = true;
      return;
    }

    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    summary.hidden = false;
    summary.innerHTML = `<span class="stars">${stars(avg)}</span> ${avg.toFixed(1).replace('.', ',')} <span class="muted">· ${reviews.length} ${plural(reviews.length)}</span>`;

    list.innerHTML = reviews.slice(0, shown).map((r, i) => `
      <article class="review-item">
        <div class="review-item-head">
          <strong>${esc(r.name)}</strong>
          <span class="stars">${stars(r.rating)}</span>
        </div>
        ${r.master ? `<div class="review-master">${tr('Мастер:')} ${esc(tr(r.master))}</div>` : ''}
        <p>${esc(r.text)}</p>
        <div class="review-item-foot">
          ${r.date ? `<time>${fmtDate(r.date)}</time>` : '<span></span>'}
          ${adminPassword && r.id ? `<button type="button" class="review-delete" data-i="${i}">Удалить</button>` : ''}
        </div>
      </article>
    `).join('');

    moreBtn.hidden = shown >= reviews.length;
  }

  moreBtn.addEventListener('click', () => { shown += PAGE; render(); });

  function post(body){
    return fetch(SITE_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
    }).then((r) => r.json());
  }

  function updateAdminUi(){
    adminToggle.textContent = adminPassword ? tr('Выйти из режима директора') : tr('Вход для директора');
    render();
  }

  adminToggle.addEventListener('click', () => {
    if (adminPassword) {
      adminPassword = '';
      try { sessionStorage.removeItem('baikauAdmin'); } catch (err) {}
      updateAdminUi();
      return;
    }
    const pw = window.prompt(tr('Пароль директора:'));
    if (!pw) return;
    post({ type: 'admin_check', password: pw })
      .then((res) => {
        if (res.result === 'ok') {
          adminPassword = pw;
          try { sessionStorage.setItem('baikauAdmin', pw); } catch (err) {}
          updateAdminUi();
          showToast({ title: tr('Режим директора'), message: tr('Рядом с отзывами появилась кнопка «Удалить».') });
        } else {
          showToast({ title: tr(res.result === 'locked' ? 'Слишком много попыток' : 'Неверный пароль'), message: tr(res.result === 'locked' ? 'Попробуйте через 15 минут.' : 'Проверьте пароль и попробуйте ещё раз.') });
        }
      })
      .catch(() => showToast({ title: tr('Нет связи'), message: tr('Не удалось проверить пароль. Попробуйте позже.') }));
  });

  list.addEventListener('click', (e) => {
    const btn = e.target.closest('.review-delete');
    if (!btn || !adminPassword) return;
    const review = reviews.slice(0, shown)[parseInt(btn.dataset.i, 10)];
    if (!review || !window.confirm(tr('Удалить этот отзыв с сайта?'))) return;
    post({ type: 'admin_hide', password: adminPassword, id: review.id })
      .then((res) => {
        if (res.result === 'success') {
          reviews = reviews.filter((r) => r !== review);
          render();
          // Row numbers shift for nobody (rows are only hidden, never removed), so the rest stay valid.
          loadMasters();
        } else {
          showToast({ title: tr('Не удалось удалить'), message: tr('Войдите в режим директора заново.') });
        }
      })
      .catch(() => showToast({ title: tr('Нет связи'), message: tr('Не удалось удалить отзыв. Попробуйте позже.') }));
  });

  function loadMasters(){
    return fetch(SITE_API_URL + '?action=masters')
      .then((r) => r.json())
      .then((data) => { masters = Array.isArray(data) ? data : []; renderMasters(); })
      .catch(() => {});
  }

  fetch(SITE_API_URL + '?action=reviews')
    .then((r) => r.json())
    .then((data) => {
      reviews = Array.isArray(data.reviews) ? data.reviews : [];
      render();
    })
    .catch(() => render());
  loadMasters();

  document.addEventListener('langchange', () => { render(); renderMasters(); updateAdminUi(); });

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = form.elements.name.value.trim();
    const text = form.elements.text.value.trim();
    const master = form.elements.master.value;
    const ratingEl = form.querySelector('input[name="rating"]:checked');
    const rating = ratingEl ? parseInt(ratingEl.value, 10) : 0;

    form.classList.toggle('has-error', !rating);
    if (!name || !text || !rating) {
      showToast({ title: tr('Заполните все поля'), message: tr('Нужны имя, оценка (звёзды) и текст отзыва.') });
      return;
    }

    let last = 0;
    try { last = parseInt(localStorage.getItem('baikauReviewAt') || '0', 10); } catch (err) {}
    if (Date.now() - last < COOLDOWN_MS) {
      showToast({ title: tr('Подождите минуту'), message: tr('Отзыв уже отправлен — повторно можно через минуту.') });
      return;
    }

    fetch(SITE_API_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ type: 'review', name, rating, text, master, website: form.elements.website.value }),
    }).catch(() => {});

    try { localStorage.setItem('baikauReviewAt', String(Date.now())); } catch (err) {}

    // No row id yet for a just-posted review, so it can't be deleted until the page is reloaded.
    reviews.unshift({ name, rating, text, master, date: new Date().toISOString() });
    shown = Math.max(shown, PAGE);
    render();
    form.reset();
    showToast({ title: tr('Спасибо за отзыв!'), message: tr('Ваш отзыв опубликован на сайте.') });
  });
})();

// Documents — links come from the «Документы» tab of the Google Sheet
// (Название, Категория, Ссылка, Показывать), so the director can publish a new
// file by pasting its Drive link into the sheet.
(function initDocuments(){
  const box = document.getElementById('docsGrid');
  if (!box) return;

  function esc(str){
    return String(str).replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[ch]));
  }

  function render(items){
    if (!Array.isArray(items) || !items.length) return;
    const groups = [];
    items.forEach((d) => {
      const cat = d.category || 'Документы';
      let g = groups.find((x) => x.cat === cat);
      if (!g) { g = { cat, items: [] }; groups.push(g); }
      g.items.push(d);
    });
    box.innerHTML = groups.map((g) => `
      <div class="docs-group">
        <h3>${esc(g.cat)}</h3>
        <div class="docs-list">
          ${g.items.map((d) => `
            <a class="doc-card" href="${esc(d.url)}" target="_blank" rel="noopener">
              <span class="doc-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg></span>
              <span class="doc-name">${esc(d.title)}</span>
              <span class="doc-arrow">↗</span>
            </a>`).join('')}
        </div>
      </div>
    `).join('');
  }

  fetch(SITE_API_URL + '?action=documents')
    .then((r) => r.json())
    .then(render)
    .catch(() => {});
})();

// Sticky header shadow on scroll
const header = document.querySelector('.site-header');
window.addEventListener('scroll', () => {
  if (window.scrollY > 8) {
    header.style.boxShadow = '0 4px 20px rgba(0,0,0,.06)';
  } else {
    header.style.boxShadow = 'none';
  }
});

// Own time-based smooth scroll instead of the native `behavior:'smooth'`.
function animateScrollTo(targetY, duration){
  const startY = window.scrollY;
  const diff = targetY - startY;
  const startTime = performance.now();

  if (Math.abs(diff) < 1) return;

  function step(now){
    const t = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    if (t >= 1) {
      window.scrollTo({ top: targetY, behavior: 'instant' });
      return;
    }
    window.scrollTo({ top: startY + diff * eased, behavior: 'instant' });
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// How far below the header a section's content should rest. Tall content
// (already filling most of the viewport on its own) gets a small fixed
// offset — there's no spare room to push it down further without cutting
// its own top off-screen. Short content settles at the section's own top
// padding: the same breathing room the design already gives every section
// between its edge and its content, so it never reads as an arbitrary
// number. It's also provably the offset that leaves the least empty space
// showing below a short section — any smaller offset just pushes the
// section's own bottom edge higher for no benefit, exposing more of
// whatever comes after it (see computeTargetY, which caps at this same
// padding to guarantee the section's background always reaches the header —
// the two constraints meeting at the same value isn't a coincidence, it's
// the same "how far can we safely push this down" question).
function computeVisualOffset(contentHeight, viewportHeight, sectionPaddingTop){
  const isTall = contentHeight >= viewportHeight * 0.75;
  return isTall ? 40 : sectionPaddingTop;
}

// The actual content wrapper inside a section — not the <section> itself,
// which also carries its own top/bottom padding and can run taller than
// where the reader's eye actually lands.
function sectionContent(target){
  return target.querySelector('.container') || target.firstElementChild || target;
}

// The scroll position where a section's content settles at its computed
// visual offset below the header. Single source of truth for "where does
// this target want to be" — scrollToSection() uses it to actually scroll.
function computeTargetY(target){
  const headerHeight = header ? header.offsetHeight : 0;
  const content = sectionContent(target);
  const rect = content.getBoundingClientRect();
  const viewportHeight = window.innerHeight - headerHeight;

  // Read live from the section's actual CSS instead of a hardcoded number,
  // so it stays correct if the spacing scale changes and adapts on its own
  // at the mobile breakpoint.
  const sectionPaddingTop = parseFloat(getComputedStyle(target).paddingTop) || 0;
  const visualOffset = computeVisualOffset(rect.height, viewportHeight, sectionPaddingTop);

  // Defensive cap, not the primary mechanism: computeVisualOffset already
  // never returns more than sectionPaddingTop. Kept so the two can't drift
  // apart and silently reopen the white-seam bug if either one changes later.
  const cappedOffset = Math.min(visualOffset, sectionPaddingTop);

  return Math.max(0, window.scrollY + rect.top - headerHeight - cappedOffset);
}

// Anchor scroll: a section's content always settles the same computed
// distance below the header, derived from its own content height rather
// than the section's full padded height — see computeVisualOffset.
function scrollToSection(id, instant) {
  const target = document.getElementById(id);
  if (!target) return;

  const targetY = computeTargetY(target);

  if (instant) {
    window.scrollTo({ top: targetY, behavior: 'instant' });
  } else {
    animateScrollTo(targetY, 500);
  }
}

// The last section (Контакты) has nothing below it to scroll into — if
// computeTargetY wants more scroll than the page naturally allows, the
// browser's own scrollTo clamps to the document's end and the section
// settles slightly short of its ideal offset. That's a small, rare cosmetic
// shortfall; the alternative (reserving that shortfall as permanent empty
// space after the page) meant every visitor who just scrolled to the very
// bottom normally landed on a dead gap below the footer — worse than the
// centering it was protecting. No spacer, no reservation: the browser's
// native clamping handles this on its own.

document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', (e) => {
    const id = link.getAttribute('href').slice(1);
    if (!document.getElementById(id)) return;
    e.preventDefault();

    // The logo always means "go home" — plain scroll-to-top. It can't go
    // through scrollToSection below: #top is the sticky header itself,
    // which always reports its own position as pinned to the viewport top
    // regardless of actual scroll position, so the offset math on it
    // wouldn't reflect where the page actually is.
    if (id === 'top') {
      animateScrollTo(0, 500);
      history.pushState(null, '', '#top');
      return;
    }

    scrollToSection(id);
    history.pushState(null, '', '#' + id);

    // Fonts loading after the click can reflow the page and shift the
    // section's height, so re-align once they've fully settled.
    if (document.fonts && document.fonts.status !== 'loaded') {
      document.fonts.ready.then(() => scrollToSection(id, true));
    }
  });
});

// The URL can already contain a #hash on load (direct link, reload, new tab).
// The browser's own native jump-to-anchor can fire at various points during
// load — sometimes after our script runs — and overrides whatever position we
// set. So we correct repeatedly: immediately, after full load, and once fonts
// have definitely settled, so our centering always has the last word.
function correctInitialHash() {
  if (!location.hash) return;
  const initialId = location.hash.slice(1);
  if (initialId === 'top') {
    window.scrollTo({ top: 0, behavior: 'instant' });
    return;
  }
  if (document.getElementById(initialId)) {
    scrollToSection(initialId, true);
  }
}

correctInitialHash();
window.addEventListener('load', () => {
  correctInitialHash();
  requestAnimationFrame(correctInitialHash);
});
if (document.fonts && document.fonts.status !== 'loaded') {
  document.fonts.ready.then(correctInitialHash);
}