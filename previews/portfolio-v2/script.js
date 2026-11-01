/* Mark Polidario portfolio v2: vanilla JS, no libraries.
   Every feature is optional: if anything fails, the HTML is already complete. */
(function () {
  'use strict';
  var d = document, root = d.documentElement, w = window;
  var MOTION = root.classList.contains('motion');
  var FINE = w.matchMedia && w.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };

  /* ---------- 1. Mobile menu + year ---------- */
  var nav = $('#site-nav'), menuBtn = $('#menu-btn');
  function closeMenu() { nav.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); }
  if (nav && menuBtn) {
    menuBtn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    $$('.nav-links a', nav).forEach(function (a) { a.addEventListener('click', closeMenu); });
    d.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('open')) { closeMenu(); menuBtn.focus(); }
    });
  }
  var y = $('#year'); if (y) y.textContent = new Date().getFullYear();

  /* ---------- 2. Preloader (first visit per session, ~1.2s, any input skips) ---------- */
  var heroStarted = false;
  function startHero() { if (heroStarted) return; heroStarted = true; revealHeroTitle(); }
  (function preloader() {
    var el = $('#loader');
    if (!root.classList.contains('preload') || !el) { return; }
    try { sessionStorage.setItem('mp-loaded', '1'); } catch (e) {}
    var num = $('#loader-num'), t0 = performance.now(), dur = 800, finished = false;
    function finish() {
      if (finished) return; finished = true;
      num.textContent = '100';
      el.classList.add('done');
      setTimeout(startHero, 250);
      setTimeout(function () { root.classList.remove('preload'); }, 750);
    }
    function tick(t) {
      if (finished) return;
      var p = clamp((t - t0) / dur, 0, 1);
      num.textContent = String(Math.round((1 - Math.pow(1 - p, 3)) * 100));
      if (p < 1) requestAnimationFrame(tick); else setTimeout(finish, 150);
    }
    requestAnimationFrame(tick);
    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (ev) { w.addEventListener(ev, finish, { once: true, passive: true }); });
    setTimeout(finish, 2000); // safety net
  })();

  /* ---------- 3. Hero title: letter reveal + dancing letters ---------- */
  var title = $('#hero-title');
  function splitTitle() {
    if (!title) return;
    var full = title.textContent.replace(/\s+/g, ' ').trim();
    var sr = d.createElement('span'); sr.className = 'sr-only'; sr.textContent = full;
    var idx = 0;
    $$('.hl', title).forEach(function (line) {
      var words = line.textContent.trim().split(/\s+/);
      line.textContent = '';
      line.setAttribute('aria-hidden', 'true');
      words.forEach(function (word, wi) {
        var wEl = d.createElement('span'); wEl.className = 'w';
        word.split('').forEach(function (c) {
          var ch = d.createElement('span'); ch.className = 'ch';
          var ci = d.createElement('span'); ci.className = 'ci'; ci.textContent = c;
          ci.style.transitionDelay = (idx++ * 28) + 'ms';
          ch.appendChild(ci); wEl.appendChild(ch);
        });
        line.appendChild(wEl);
        if (wi < words.length - 1) line.appendChild(d.createTextNode(' '));
      });
    });
    title.insertBefore(sr, title.firstChild);
    if (MOTION) title.classList.add('clip', 'pre');
  }
  function revealHeroTitle() {
    if (!title || !MOTION) return;
    requestAnimationFrame(function () {
      title.classList.remove('pre');
      var cis = $$('.ci', title), last = cis[cis.length - 1];
      var total = 900 + cis.length * 28;
      setTimeout(function () { title.classList.remove('clip'); cis.forEach(function (c) { c.style.transitionDelay = ''; }); }, total + 50);
      // reveal hero sub/CTAs/flow just after the title starts
      $$('.hero [data-reveal]').forEach(function (el, i) { el.style.setProperty('--d', (350 + i * 110) + 'ms'); el.classList.add('in'); });
    });
  }
  splitTitle();
  if (MOTION) {
    if (!root.classList.contains('preload')) setTimeout(startHero, 60);
    var dance = $('[data-dance]');
    if (dance) {
      var anims = ['dance-rubber', 'dance-hinge', 'dance-jump', 'dance-spin'];
      var play = function (ch) {
        if (!ch || ch.dataset.busy) return;
        var a = anims[Math.floor(Math.random() * anims.length)];
        ch.dataset.busy = '1'; ch.classList.add(a);
        ch.addEventListener('animationend', function done() { ch.classList.remove(a); delete ch.dataset.busy; ch.removeEventListener('animationend', done); });
      };
      dance.addEventListener('pointerover', function (e) {
        var ch = e.target.closest && e.target.closest('.ch'); if (ch && !title.classList.contains('clip')) play(ch);
      });
      var heroVisible = true;
      setInterval(function () {
        if (!heroVisible || d.hidden || title.classList.contains('clip')) return;
        var chars = $$('.ch', dance); play(chars[Math.floor(Math.random() * chars.length)]);
      }, 2600);
      new IntersectionObserver(function (en) { heroVisible = en[0].isIntersecting; }).observe(dance);
    }
  }

  /* ---------- 4. Hero particle field (Aether Flow, lightweight 2D canvas) ---------- */
  (function field() {
    var cv = $('#hero-field'); if (!cv || !cv.getContext) return;
    var ctx = cv.getContext('2d'), hero = cv.parentElement, dpr = Math.min(w.devicePixelRatio || 1, 1.5);
    var W = 0, H = 0, pts = [], mouse = { x: -9999, y: -9999 }, running = false, raf = 0, LINK = 120;
    function size() {
      var r = hero.getBoundingClientRect(); W = r.width; H = r.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.round(clamp(W * H / 16000, 28, 90));
      pts = [];
      for (var i = 0; i < n; i++) pts.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35, r: Math.random() * 1.6 + .6 });
      draw();
    }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        if (MOTION) {
          var dx = p.x - mouse.x, dy = p.y - mouse.y, dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 140 && dist > 0) { var f = (140 - dist) / 140 * .9; p.x += dx / dist * f; p.y += dy / dist * f; }
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0 || p.x > W) p.vx *= -1;
          if (p.y < 0 || p.y > H) p.vy *= -1;
        }
        for (var j = i + 1; j < pts.length; j++) {
          var q = pts[j], ex = p.x - q.x, ey = p.y - q.y, dd = ex * ex + ey * ey;
          if (dd < LINK * LINK) {
            ctx.strokeStyle = 'rgba(200,255,61,' + (0.16 * (1 - Math.sqrt(dd) / LINK)).toFixed(3) + ')';
            ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          }
        }
        ctx.fillStyle = 'rgba(200,255,61,.55)'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      }
    }
    function loop() { if (!running) return; draw(); raf = requestAnimationFrame(loop); }
    function setRun(on) { if (on === running || !MOTION) return; running = on; if (on) raf = requestAnimationFrame(loop); else cancelAnimationFrame(raf); }
    size();
    var rt; w.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(size, 150); });
    hero.addEventListener('pointermove', function (e) { var r = hero.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
    hero.addEventListener('pointerleave', function () { mouse.x = mouse.y = -9999; });
    var vis = false;
    new IntersectionObserver(function (en) { vis = en[0].isIntersecting; setRun(vis && !d.hidden); }).observe(hero);
    d.addEventListener('visibilitychange', function () { setRun(vis && !d.hidden); });
  })();

  /* Pulse rail length for the lead-flow card */
  (function rail() {
    var r = $('.flow-rail'); if (!r) return;
    var set = function () { r.style.setProperty('--rail', Math.max(0, r.offsetHeight - 10) + 'px'); };
    set(); w.addEventListener('resize', set);
  })();

  /* ---------- 5. Line-by-line headings + generic reveals (fire once) ---------- */
  function splitLines(el) {
    var words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', el.textContent.trim());
    el.textContent = '';
    var spans = words.map(function (wd, i) {
      var s = d.createElement('span'); s.textContent = wd + (i < words.length - 1 ? ' ' : ''); s.style.display = 'inline'; el.appendChild(s); return s;
    });
    var lines = [], cur = [], top = null;
    spans.forEach(function (s) { var t = s.offsetTop; if (top !== null && t > top + 2) { lines.push(cur); cur = []; } top = t; cur.push(s.textContent); });
    if (cur.length) lines.push(cur);
    el.textContent = '';
    lines.forEach(function (ws, i) {
      var ln = d.createElement('span'); ln.className = 'ln'; ln.setAttribute('aria-hidden', 'true');
      var inner = d.createElement('span'); inner.textContent = ws.join('').trim(); inner.style.setProperty('--d', (i * 90) + 'ms');
      ln.appendChild(inner); el.appendChild(ln);
    });
  }
  if (MOTION && 'IntersectionObserver' in w) {
    var doSplit = function () { $$('[data-lines]').forEach(function (h) { if (!h.classList.contains('in')) splitLines(h); }); };
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(function () { doSplit(); observeAll(); }); else { doSplit(); observeAll(); }
  } else {
    $$('[data-reveal], [data-lines], .tools').forEach(function (el) { el.classList.add('in'); });
  }
  function observeAll() {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in'); io.unobserve(en.target);
        if (en.target.hasAttribute('data-count-to')) countUp(en.target);
      });
    }, { threshold: 0, rootMargin: '0px 0px -8% 0px' });
    // stagger siblings within the same parent
    var groups = new Map();
    $$('[data-reveal]').forEach(function (el) {
      if (el.closest('.hero')) return;
      var p = el.parentElement, n = groups.get(p) || 0; groups.set(p, n + 1);
      if (!el.style.getPropertyValue('--d')) el.style.setProperty('--d', Math.min(n, 6) * 70 + 'ms');
      io.observe(el);
    });
    $$('[data-lines]').forEach(function (el) { io.observe(el); });
    var tools = $('#tools-list');
    if (tools) { $$('li', tools).forEach(function (li, i) { li.style.setProperty('--d', (i * 45) + 'ms'); }); io.observe(tools); }
    $$('[data-count-to]').forEach(function (el) { el.textContent = '0.0'; io.observe(el); });
  }
  /* Stopwatch count-up for the real 24s figure from the video's live test */
  function countUp(el) {
    var to = parseFloat(el.getAttribute('data-count-to')), t0 = performance.now(), dur = 1400;
    (function f(t) {
      var p = clamp((t - t0) / dur, 0, 1), e = 1 - Math.pow(1 - p, 4);
      el.textContent = p < 1 ? (to * e).toFixed(1) : String(to);
      if (p < 1) requestAnimationFrame(f);
    })(t0);
  }

  /* ---------- 6. Scroll-bound effects (one rAF loop, only on scroll) ---------- */
  var stage = $('#video-stage'), vframe = stage && $('.video-frame', stage);
  var panels = $$('#stack .panel');
  panels.forEach(function (p, i) { p.style.setProperty('--i', i); });
  var footer = $('#footer'), giant = footer && $('.giant', footer);
  var lastY = w.pageYOffset, ticking = false;
  function onScroll() {
    var vh = w.innerHeight, sy = w.pageYOffset;
    // nav hides on scroll down, returns on scroll up
    if (nav && !nav.classList.contains('open')) {
      if (sy > 400 && sy > lastY + 4) nav.classList.add('hide'); else if (sy < lastY - 4 || sy < 400) nav.classList.remove('hide');
    }
    lastY = sy;
    if (!MOTION) { ticking = false; return; }
    // Featured video: tilted screen settles flat as it scrolls in (scrubbed, never scroll-locked)
    if (vframe) {
      var r = stage.getBoundingClientRect();
      var p = clamp((vh - r.top) / (vh * 0.75), 0, 1), e = 1 - Math.pow(1 - p, 3);
      if (e >= 0.999) vframe.style.transform = '';
      else vframe.style.transform = 'rotateX(' + ((1 - e) * 24).toFixed(2) + 'deg) scale(' + (0.86 + e * 0.14).toFixed(4) + ') translateY(' + ((1 - e) * 40).toFixed(1) + 'px)';
    }
    // Process: each panel shrinks/tilts from bottom-left as the next one covers it
    for (var i = 0; i < panels.length - 1; i++) {
      var next = panels[i + 1].getBoundingClientRect(), cur = panels[i].getBoundingClientRect();
      var pr = clamp((cur.bottom - next.top) / cur.height, 0, 1);
      panels[i].style.setProperty('--p', pr.toFixed(3));
    }
    // Footer: giant word rises, then fills left to right with the accent
    if (giant) {
      var fr = footer.getBoundingClientRect();
      var rise = clamp((vh - fr.top) / (fr.height * 0.9), 0, 1);
      var gr = giant.getBoundingClientRect();
      var fill = clamp((vh - gr.top) / (gr.height * 0.8), 0, 1);
      giant.style.setProperty('--rise', rise.toFixed(3));
      $('#giant-fill').style.setProperty('--fill', fill.toFixed(3));
    }
    ticking = false;
  }
  w.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  w.addEventListener('resize', onScroll);
  onScroll();

  /* ---------- 7. Nav section indicator ---------- */
  (function indicator() {
    var num = $('#nav-num'), name = $('#nav-name'); if (!num || !('IntersectionObserver' in w)) return;
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) { num.textContent = e.target.dataset.index; name.textContent = e.target.dataset.name; } });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('[data-index]').forEach(function (s) { io.observe(s); });
  })();

  /* ---------- 8. Throwable card deck (sample projects) ---------- */
  (function deck() {
    var deckEl = $('#deck'); if (!deckEl) return;
    var cards = $$('.pcard', deckEl), N = cards.length;
    var order = cards.map(function (_, i) { return i; });
    var controls = $('#deck-controls'), hint = $('#deck-hint'), dotsEl = $('#deck-dots'), status = $('#deck-status');
    var toggle = $('#deck-toggle'), busy = false;
    controls.hidden = false;
    for (var k = 0; k < N; k++) dotsEl.appendChild(d.createElement('span'));
    var dots = $$('span', dotsEl);

    function fitHeight() {
      if (!deckEl.classList.contains('is-deck')) { deckEl.style.height = ''; return; }
      var h = 0;
      cards.forEach(function (c) { c.style.height = 'auto'; h = Math.max(h, c.offsetHeight); c.style.height = ''; });
      deckEl.style.height = (h + 36) + 'px';
    }
    function layout() {
      order.forEach(function (ci, pos) {
        var c = cards[ci], top = pos === 0;
        var depth = Math.min(pos, 3);
        c.style.zIndex = String(N - pos);
        c.style.transform = pos === 0 ? 'none' : 'translate(' + (depth * 10) + 'px,' + (depth * 12) + 'px) scale(' + (1 - depth * 0.04) + ') rotate(' + (depth * (pos % 2 ? 1.6 : -1.2)) + 'deg)';
        c.style.opacity = pos > 3 ? '0' : '1';
        c.classList.toggle('top', top);
        if (top) { c.removeAttribute('inert'); c.removeAttribute('aria-hidden'); }
        else { c.setAttribute('inert', ''); c.setAttribute('aria-hidden', 'true'); }
      });
      dots.forEach(function (dt, i) { dt.classList.toggle('on', i === order[0]); });
    }
    function announce() { status.textContent = 'Card ' + (order[0] + 1) + ' of ' + N + ': ' + $('h3', cards[order[0]]).textContent; }
    function enable() {
      deckEl.classList.add('is-deck');
      deckEl.setAttribute('tabindex', '0'); deckEl.setAttribute('role', 'region'); deckEl.setAttribute('aria-roledescription', 'card deck');
      hint.hidden = false; dotsEl.hidden = false; $('#deck-prev').hidden = false; $('#deck-next').hidden = false;
      toggle.setAttribute('aria-pressed', 'false'); toggle.textContent = 'Show all';
      fitHeight(); layout();
    }
    function disable() {
      deckEl.classList.remove('is-deck');
      ['tabindex', 'role', 'aria-roledescription'].forEach(function (a) { deckEl.removeAttribute(a); });
      cards.forEach(function (c) { c.style.cssText = ''; c.removeAttribute('inert'); c.removeAttribute('aria-hidden'); c.classList.remove('top'); });
      hint.hidden = true; dotsEl.hidden = true; $('#deck-prev').hidden = true; $('#deck-next').hidden = true;
      toggle.setAttribute('aria-pressed', 'true'); toggle.textContent = 'Stack cards';
      fitHeight();
    }
    function throwTop(dir) { // dir 1 = right, -1 = left
      if (busy) return; busy = true;
      var c = cards[order[0]], wdt = deckEl.offsetWidth;
      if (MOTION) c.style.transform = 'translate(' + (dir * wdt * 1.15) + 'px,-30px) rotate(' + (dir * 24) + 'deg)';
      c.style.opacity = MOTION ? '0' : '1';
      setTimeout(function () {
        order.push(order.shift());
        c.classList.add('instant'); layout(); void c.offsetWidth; c.classList.remove('instant');
        busy = false; announce();
      }, MOTION ? 380 : 0);
    }
    function bringBack() {
      if (busy) return; busy = true;
      var ci = order.pop(); order.unshift(ci);
      var c = cards[ci];
      c.classList.add('instant'); c.style.zIndex = String(N + 1);
      c.style.transform = MOTION ? 'translate(' + (-deckEl.offsetWidth * 1.15) + 'px,-30px) rotate(-24deg)' : 'none';
      c.style.opacity = MOTION ? '0' : '1';
      void c.offsetWidth; c.classList.remove('instant');
      requestAnimationFrame(function () { layout(); setTimeout(function () { busy = false; announce(); }, MOTION ? 400 : 0); });
    }
    $('#deck-next').addEventListener('click', function () { throwTop(1); });
    $('#deck-prev').addEventListener('click', bringBack);
    toggle.addEventListener('click', function () { if (deckEl.classList.contains('is-deck')) disable(); else enable(); });
    deckEl.addEventListener('keydown', function (e) {
      if (!deckEl.classList.contains('is-deck')) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); throwTop(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); bringBack(); }
    });
    // Drag / swipe to throw
    var drag = null, suppressClick = false;
    deckEl.addEventListener('pointerdown', function (e) {
      if (!deckEl.classList.contains('is-deck') || busy || e.button > 0) return;
      var c = e.target.closest('.pcard'); if (!c || !c.classList.contains('top')) return;
      drag = { c: c, x: e.clientX, y: e.clientY, dx: 0, id: e.pointerId, moved: false };
    });
    deckEl.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved) {
        if (Math.abs(dx) < 6) return;
        if (Math.abs(dy) > Math.abs(dx)) { drag = null; return; } // vertical: let the page scroll
        drag.moved = true; drag.c.classList.add('dragging');
        try { drag.c.setPointerCapture(e.pointerId); } catch (err) {}
      }
      drag.dx = dx;
      drag.c.style.transform = 'translate(' + dx + 'px,' + (dy * 0.15) + 'px) rotate(' + (dx * 0.06) + 'deg) scale(1.02)';
    });
    function endDrag(e) {
      if (!drag || e.pointerId !== drag.id) return;
      var c = drag.c, dx = drag.dx, moved = drag.moved; drag = null;
      if (!moved) return;
      suppressClick = true; setTimeout(function () { suppressClick = false; }, 50);
      c.classList.remove('dragging');
      if (Math.abs(dx) > deckEl.offsetWidth * 0.1) throwTop(dx > 0 ? 1 : -1); else layout();
    }
    deckEl.addEventListener('pointerup', endDrag);
    deckEl.addEventListener('pointercancel', endDrag);
    deckEl.addEventListener('click', function (e) { if (suppressClick) { e.preventDefault(); e.stopPropagation(); } }, true);
    deckEl.addEventListener('dragstart', function (e) { e.preventDefault(); });

    // Reduced motion starts in the grid view; the stack is still one click away.
    if (MOTION) enable(); else disable();
    var rz; w.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(fitHeight, 150); });
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(fitHeight);
  })();

  /* ---------- 9. Liquid photo (Marcus Vane LiquidImage, hover only on desktop) ---------- */
  (function liquid() {
    var fig = $('#liquid'); if (!fig || !MOTION) return;
    var disp = $('feDisplacementMap', fig), turb = $('feTurbulence', fig);
    new IntersectionObserver(function (en, o) { if (en[0].isIntersecting) { setTimeout(function () { fig.classList.add('seen'); }, 500); o.disconnect(); } }, { threshold: .5 }).observe(fig);
    if (!FINE || w.innerWidth <= 768) return;
    fig.classList.add('fx');
    var target = 0, val = 0, vel = 0, raf = 0;
    function step() { // spring: tension 140 / friction 13 (watery wobble)
      var f = -140 * (val - target) - 13 * vel; vel += f * 0.016; val += vel * 0.016;
      disp.setAttribute('scale', (1 + val * 29).toFixed(2));
      turb.setAttribute('baseFrequency', (0.009 + val * 0.013).toFixed(4));
      if (Math.abs(val - target) > 0.001 || Math.abs(vel) > 0.001) raf = requestAnimationFrame(step); else raf = 0;
    }
    function go(t) { target = t; if (!raf) raf = requestAnimationFrame(step); }
    fig.addEventListener('pointerenter', function () { go(1); });
    fig.addEventListener('pointerleave', function () { go(0); });
  })();

  /* ---------- 10. Cursor ring that morphs onto targets (magnetic cursor prompt) ---------- */
  (function cursor() {
    var cur = $('#cursor'); if (!cur || !MOTION || !FINE) return;
    var x = -100, y = -100, cx = -100, cy = -100, cw = 36, ch = 36, tw = 36, th = 36, snapEl = null, raf = 0, active = false;
    function loop() {
      var tx = x, ty = y;
      if (snapEl) {
        var r = snapEl.getBoundingClientRect();
        tw = r.width + 12; th = r.height + 12;
        tx = r.left + r.width / 2 + (x - (r.left + r.width / 2)) * 0.12; // magnetic pull toward the pointer
        ty = r.top + r.height / 2 + (y - (r.top + r.height / 2)) * 0.12;
      } else { tw = th = 36; }
      cx += (tx - cx) * 0.22; cy += (ty - cy) * 0.22; cw += (tw - cw) * 0.22; ch += (th - ch) * 0.22;
      cur.style.width = cw.toFixed(1) + 'px'; cur.style.height = ch.toFixed(1) + 'px';
      cur.style.transform = 'translate(' + (cx - cw / 2).toFixed(1) + 'px,' + (cy - ch / 2).toFixed(1) + 'px)';
      raf = active ? requestAnimationFrame(loop) : 0;
    }
    function wake() { if (!active) { active = true; cur.classList.add('on'); if (!raf) raf = requestAnimationFrame(loop); } }
    function sleep() { active = false; cur.classList.remove('on'); }
    d.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      x = e.clientX; y = e.clientY;
      var t = e.target;
      // Stay out of the way of embeds and media controls
      if (t.closest && t.closest('.embed, .video-frame, iframe')) { sleep(); return; }
      var s = t.closest && t.closest('[data-cursor]');
      if (s !== snapEl) { snapEl = s; cur.classList.toggle('snap', !!s); cur.style.borderRadius = s && s.tagName !== 'LI' ? '999px' : (s ? '999px' : '999px'); }
      wake();
    }, { passive: true });
    d.addEventListener('pointerleave', sleep);
    w.addEventListener('blur', sleep);
  })();

  /* ---------- 11. Footer "Back to top" tilt (motion footer MagneticButton) ---------- */
  (function pill() {
    var p = $('#top-pill'); if (!p || !MOTION || !FINE) return;
    p.addEventListener('pointermove', function (e) {
      var r = p.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      p.style.transform = 'perspective(500px) translate(' + (dx * 0.3).toFixed(1) + 'px,' + (dy * 0.4).toFixed(1) + 'px) rotateY(' + (dx * 0.15).toFixed(1) + 'deg) scale(1.05)';
    });
    p.addEventListener('pointerleave', function () { p.style.transition = 'transform .5s cubic-bezier(.16,1,.3,1)'; p.style.transform = ''; setTimeout(function () { p.style.transition = ''; }, 500); });
  })();
})();
