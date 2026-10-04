(() => {
  const root = document.documentElement;
  root.classList.add('js');
  const config = window.ASSALAM_CONFIG || {};
  const page = document.body.dataset.page || '';

  /* ---------- Language: BM first, EN on request, remembered per visitor ---------- */
  const langButtons = document.querySelectorAll('[data-set-lang]');
  const setLang = (lang) => {
    root.dataset.lang = lang;
    root.lang = lang;
    langButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.setLang === lang)));
    try { localStorage.setItem('assalam-lang', lang); } catch (e) { /* storage blocked: switch for this visit only */ }
  };
  langButtons.forEach((b) => b.addEventListener('click', () => setLang(b.dataset.setLang)));
  setLang(root.dataset.lang === 'en' ? 'en' : 'ms');

  /* ---------- Header hairline once the page moves ---------- */
  const header = document.querySelector('.site-header');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Mobile menu (native dialog: focus trapped, Esc closes) ---------- */
  const menu = document.getElementById('menu');
  const menuBtn = document.querySelector('.menu-btn');
  if (menu && menuBtn && typeof menu.showModal === 'function') {
    menuBtn.addEventListener('click', () => { menu.showModal(); menuBtn.setAttribute('aria-expanded', 'true'); });
    menu.addEventListener('close', () => menuBtn.setAttribute('aria-expanded', 'false'));
    menu.addEventListener('click', (e) => {
      if (e.target === menu || e.target.closest('[data-close-menu]')) menu.close();
    });
  } else if (menuBtn) {
    menuBtn.addEventListener('click', () => document.querySelector('.site-footer').scrollIntoView());
  }

  /* ---------- Settings from config.js ---------- */
  if (config.whatsappGroupUrl) document.querySelectorAll('[data-wa-group]').forEach((a) => { a.href = config.whatsappGroupUrl; });
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  if (config.liveSchedule && config.liveSchedule.ms) {
    document.querySelectorAll('[data-live-schedule]').forEach((el) => {
      el.querySelector('.ms').innerHTML = '<strong>Jadual Live:</strong> ' + esc(config.liveSchedule.ms) + '.';
      el.querySelector('.en').innerHTML = '<strong>Live schedule:</strong> ' + esc(config.liveSchedule.en || config.liveSchedule.ms) + '.';
    });
  }

  /* ---------- TikTok live status: one read per page load, never polled ---------- */
  // TikTok has no supported public LIVE-status API, so the state is set in config.js.
  // If a status endpoint is configured later, it is called once here (no loop).
  const live = config.tiktokLive || {};
  const applyLive = (state) => {
    const isLive = state === 'live';
    root.dataset.live = isLive ? 'live' : 'offline';
    document.querySelectorAll('[data-live-status] .ls-on').forEach((el) => el.setAttribute('aria-hidden', String(!isLive)));
    document.querySelectorAll('[data-live-status] .ls-off').forEach((el) => el.setAttribute('aria-hidden', String(isLive)));
  };
  applyLive(live.status);
  if (live.endpoint && document.querySelector('[data-live-status]')) {
    const ctl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = ctl ? setTimeout(() => ctl.abort(), 3000) : null;
    fetch(live.endpoint, { signal: ctl ? ctl.signal : undefined, headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d && (d.status === 'live' || d.status === 'offline')) applyLive(d.status); })
      .catch(() => { /* keep the configured state */ })
      .finally(() => { if (timer) clearTimeout(timer); });
  }

  /* ---------- Numbered steps light up one by one while scrolling ---------- */
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('.path4, .steps').forEach((list) => {
    const items = [...list.children];
    if (!items.length) return;
    let ticking = false;
    const update = () => {
      ticking = false;
      const n = items.length;
      let lit;
      if (reduceMotion.matches) {
        lit = n;
      } else {
        const vh = window.innerHeight;
        const tops = items.map((li) => li.getBoundingClientRect().top);
        const sideBySide = Math.abs(tops[0] - tops[n - 1]) < 8;
        if (sideBySide) {
          // One row: light in sequence as the row travels from 85% to 35% of the screen.
          const progress = (vh * 0.85 - tops[0]) / (vh * 0.5);
          lit = Math.max(0, Math.min(n, Math.ceil(progress * n)));
        } else {
          // Stacked: each step lights as its number passes 65% of the screen.
          const line = vh * 0.65;
          lit = items.filter((li) => { const r = (li.querySelector('.n') || li).getBoundingClientRect(); return r.top + r.height / 2 < line; }).length;
        }
      }
      items.forEach((li, i) => li.classList.toggle('is-lit', i < lit));
      list.style.setProperty('--p', n > 1 ? Math.max(0, lit - 1) / (n - 1) : lit);
    };
    const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) window.addEventListener('scroll', request, { passive: true });
        else window.removeEventListener('scroll', request);
        request();
      });
    }, { rootMargin: '20% 0px 20% 0px' }).observe(list);
    window.addEventListener('resize', request, { passive: true });
    update();
  });

  /* ---------- Mobile dock: the step that fits what is on screen ---------- */
  const dock = document.querySelector('[data-dock]');
  if (dock) {
    const book = dock.querySelector('[data-dock-state="book"]');
    const live = dock.querySelector('[data-dock-state="live"]');
    const hiders = new Set();
    let inLive = page === 'live';
    const setState = (showLive) => {
      [[book, !showLive], [live, showLive]].forEach(([el, on]) => { el.setAttribute('aria-hidden', String(!on)); el.tabIndex = on ? 0 : -1; });
    };
    const render = () => {
      const show = hiders.size === 0 && !(menu && menu.open);
      dock.classList.toggle('is-shown', show);
      dock.inert = !show;
      setState(inLive);
    };
    const watch = (el, onChange, rootMargin = '-15% 0px -30% 0px') => {
      if (!el) return;
      new IntersectionObserver(([e]) => { onChange(e.isIntersecting); render(); }, { rootMargin }).observe(el);
    };
    // Step aside where the page already shows the same actions: the hero, the page intro, the final call.
    document.querySelectorAll('.hero, .page-hero, .final').forEach((el, i) => watch(el, (v) => (v ? hiders.add(i) : hiders.delete(i))));
    // On the homepage the Live band carries its own TikTok actions: the dock steps aside there
    // instead of adding a third TikTok button. On /tiktok-live/ the dock offers TikTok itself.
    if (page !== 'live') watch(document.getElementById('live'), (v) => (v ? hiders.add('live') : hiders.delete('live')), '-40% 0px -40% 0px');
    if (menu) menu.addEventListener('close', render);
    render();
  }

  /* ---------- Analytics: Umami (cookieless), off until config.analytics.umamiWebsiteId is set ---------- */
  // Only the event name and where it happened are sent: never the link URL, the WhatsApp message
  // text, or anything a visitor typed. A click is a click, not a confirmed booking.
  // Staff and automated tests opt out on a device with: localStorage.setItem('umami.disabled', '1')
  let optedOut = false;
  try { optedOut = !!localStorage.getItem('umami.disabled'); } catch (e) { /* storage blocked */ }
  const analytics = optedOut ? {} : (config.analytics || {});
  const queue = [];
  const track = (name, data) => {
    if (!analytics.umamiWebsiteId) return;
    if (window.umami && typeof window.umami.track === 'function') window.umami.track(name, data);
    else if (queue.length < 20) queue.push([name, data]);
  };
  if (analytics.umamiWebsiteId) {
    const s = document.createElement('script');
    s.defer = true;
    s.src = analytics.umamiScript || 'https://pulse.ahader.cloud/insight.js'; // self-hosted Umami (AHADER)
    s.dataset.websiteId = analytics.umamiWebsiteId;
    s.dataset.domains = 'dzikirassalam.com'; // local previews and test runs are never counted
    s.addEventListener('load', () => { while (queue.length && window.umami) window.umami.track(...queue.shift()); });
    document.head.appendChild(s);
  }
  // Event name from where the link goes; the booking offers win over the generic WhatsApp click.
  const eventFor = (a) => {
    if (a.dataset.offer === 'rdt-1') return 'cta_treatment_rm150';
    if (a.dataset.offer === 'rdt-3') return 'cta_package_3_session';
    let host = '';
    let path = '';
    try { const u = new URL(a.href, location.href); host = u.hostname.replace(/^www\./, ''); path = u.pathname; } catch (e) { return null; }
    if (host === 'wa.me') return 'cta_whatsapp_click';
    if (host === 'chat.whatsapp.com') return 'cta_whatsapp_group';
    if (host === 'tiktok.com') return path.indexOf('@rawatanassalam2') !== -1 ? 'cta_tiktok_shop' : 'cta_tiktok_free_treatment';
    if (host === 'pay.chip-in.asia') return 'cta_sedekah_chip';
    if (a.protocol === 'mailto:') return 'cta_email';
    if (host && host !== location.hostname) return 'outbound_click';
    return null;
  };
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const name = eventFor(a);
    if (!name) return;
    const where = a.dataset.cta || (a.closest('.site-footer') ? 'footer' : a.closest('.menu') ? 'menu' : 'page');
    const data = { location: where, page: page || 'home', lang: root.dataset.lang };
    if (name === 'outbound_click') data.host = new URL(a.href).hostname;
    track(name, data);
  });
  // Script errors from this site's own files, so a broken button shows up without a separate tool.
  let errors = 0;
  window.addEventListener('error', (e) => {
    if (errors >= 3 || !e.filename || e.filename.indexOf(location.origin) !== 0) return;
    errors += 1;
    track('js_error', { message: String(e.message).slice(0, 120), source: e.filename.replace(location.origin, '').split('?')[0], line: e.lineno || 0, page: page || 'home' });
  });

  /* ---------- Booking: today WhatsApp; later the hosted checkout (PAYMENTS.md) ---------- */
  const checkout = config.checkout || { mode: 'whatsapp' };
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-cta], a[data-offer]');
    if (!a) return;
    document.dispatchEvent(new CustomEvent('assalam:cta', { detail: { cta: a.dataset.cta || null, offer: a.dataset.offer || null, page } }));
    if (!a.dataset.offer || checkout.mode !== 'api' || !checkout.endpoint) return;
    e.preventDefault();
    const fallback = a.href;
    fetch(checkout.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ offer: a.dataset.offer, lang: root.dataset.lang }) })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('checkout ' + r.status))))
      .then((d) => { if (!d || typeof d.checkoutUrl !== 'string' || !/^https:\/\//.test(d.checkoutUrl)) throw new Error('no url'); window.location.assign(d.checkoutUrl); })
      .catch(() => { window.open(fallback, '_blank', 'noopener'); });
  });
})();
