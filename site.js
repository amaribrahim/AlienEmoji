// Shared nav + footer + small site helpers.
// Usage: include after <body> opens; pass `data-page` on <body> for active state.

(function () {
  const page = document.body.getAttribute('data-page') || 'home';

  const NAV = `
    <nav class="nav">
      <div class="shell nav-inner">
        <a class="brand" href="index.html" aria-label="Alien Emoji home" data-link="home" data-section="hero">
          <span class="brand-mark"></span>
          <span>Alien Emoji</span>
        </a>
        <div class="nav-links">
          <a href="index.html#products" data-link="products" data-section="products">Products</a>
         <!--  <a href="approach.html" data-link="approach">Approach</a>  -->
          <a href="index.html#contact" data-link="contact" data-section="contact">Contact</a>
        </div>
        <div class="nav-cta">amar@alienemoji.com</div>
      </div>
    </nav>
  `;

  const FOOTER = `
    <footer class="footer">
      <div class="shell">
        <div class="footer-grid">
          <div>
            <div style="display:flex; align-items:center; gap:12px; margin-bottom:18px;">
              <span class="brand-mark"></span>
              <strong style="color:var(--ink); font-weight:600; letter-spacing:-0.01em;">Alien Emoji</strong>
            </div>
            <p style="max-width: 36ch; margin: 0 0 16px; color: var(--muted);">
              An independent, audio-first studio. We design tomorrow's tools and experiences.
            </p>
            <div class="mono">— Amar Ibrahim, founder</div>
          </div>
          <div>
            <h4>Products</h4>
            <ul>
              <li><a href="birdsong.html">Birdsong</a></li>
              <li><a href="sleepy-aliens.html">Sleepy Aliens</a></li>
                <!-- <li><a href="approach.html">Approach</a></li>-->
            </ul>
          </div>
          <div>
            <h4>Studio</h4>
            <ul>
              <li><a href="index.html#about">About</a></li>
              <li><a href="mailto:amar@alienemoji.com">Contact us</a></li>
              <li><a href="privacy.html">Privacy</a></li>
            </ul>
          </div>
          <div>
            <h4>Elsewhere</h4>
            <ul>
              <li><a href="https://apps.apple.com/us/app/birdsong-listen-to-the-forest/id6761444546?mt=12" target="_blank" rel="noopener">Mac App Store</a></li>
              <li><a href="mailto:amar@alienemoji.com">Email</a></li>
            </ul>
          </div>
        </div>
        <div class="footer-bottom">
          <span>© 2026 Alien Emoji</span>
          <span>Studio · Los Angeles / Remote</span>
          <span>v.2026.04</span>
        </div>
      </div>
    </footer>
  `;

  // mount
  document.addEventListener('DOMContentLoaded', () => {
    const navMount = document.getElementById('site-nav');
    const footMount = document.getElementById('site-footer');
    if (navMount) navMount.innerHTML = NAV;
    if (footMount) footMount.innerHTML = FOOTER;

    // page-level active state (non-home pages)
    const pageMap = {
      birdsong: 'products',
      'sleepy-aliens': 'products',
      approach: 'approach',
      privacy: null,
    };
    if (page !== 'home') {
      const active = pageMap[page];
      if (active) {
        document.querySelectorAll(`[data-link="${active}"]`).forEach(a => a.classList.add('active'));
      }
      return;
    }

    // scroll-spy for home page — light up nav link based on which section is in view
    const sections = [
      { id: null,       link: 'home',     el: document.querySelector('.section.first') },
      { id: 'products', link: 'products', el: document.getElementById('products') },
      { id: 'about',    link: null,       el: document.getElementById('about') },
      { id: 'contact',  link: 'contact',  el: document.getElementById('contact') },
    ].filter(s => s.el);

    function setActive(link) {
      document.querySelectorAll('.nav-links a, .brand').forEach(a => a.classList.remove('active'));
      if (link) {
        document.querySelectorAll(`[data-link="${link}"]`).forEach(a => a.classList.add('active'));
      }
    }

    // default to home on load
    setActive('home');

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const s = sections.find(s => s.el === entry.target);
        if (s) setActive(s.link);
      });
    }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });

    sections.forEach(s => observer.observe(s.el));
  });
})();

// ─── Hero sine waves ──────────────────────────────────────────────────────────

(function () {
  const canvas = document.querySelector('.hero-waves');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  const waves = [
    { amplitude: 14, period: 0.0016, speed: 0.00022, phase: 0,   opacity: 0.10, width: 1.0 },
    { amplitude: 9,  period: 0.0022, speed: 0.00034, phase: 2.4, opacity: 0.07, width: 0.8 },
    { amplitude: 20, period: 0.0011, speed: 0.00015, phase: 1.1, opacity: 0.06, width: 1.2 },
    { amplitude: 7,  period: 0.0028, speed: 0.00048, phase: 3.8, opacity: 0.05, width: 0.7 },
    { amplitude: 26, period: 0.0008, speed: 0.00010, phase: 5.2, opacity: 0.04, width: 1.5 },
  ];

  let W, H, raf;

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    ctx.scale(dpr, dpr);
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);

    waves.forEach((wave, i) => {
      const yBase = H * (0.38 + i * 0.055);
      ctx.beginPath();
      ctx.moveTo(0, yBase + Math.sin(wave.phase + t * wave.speed) * wave.amplitude);

      for (let x = 2; x <= W; x += 2) {
        const y = yBase + Math.sin(x * wave.period + wave.phase + t * wave.speed) * wave.amplitude;
        ctx.lineTo(x, y);
      }

      ctx.strokeStyle = `rgba(10, 10, 10, ${wave.opacity})`;
      ctx.lineWidth = wave.width;
      ctx.stroke();
    });
  }

  let start = null;
  function loop(ts) {
    if (!start) start = ts;
    const t = ts - start;
    ctx.save();
    draw(t);
    ctx.restore();
    raf = requestAnimationFrame(loop);
  }

  resize();
  window.addEventListener('resize', () => { ctx.setTransform(1, 0, 0, 1, 0, 0); resize(); });
  raf = requestAnimationFrame(loop);
})();

// ─── Hero entrance stagger ────────────────────────────────────────────────────

(function () {
  document.addEventListener('DOMContentLoaded', () => {
    const els = document.querySelectorAll('.reveal-hero');
    els.forEach(el => {
      const delay = parseInt(el.dataset.delay || '0', 10);
      setTimeout(() => el.classList.add('is-visible'), delay + 80);
    });
  });
})();

// ─── Scroll-reveal ────────────────────────────────────────────────────────────

(function () {
  document.addEventListener('DOMContentLoaded', () => {
    const targets = document.querySelectorAll('.reveal-scroll');
    if (!targets.length) return;

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (!entry.isIntersecting) return;
        // stagger siblings in the same grid
        const siblings = [...entry.target.parentElement.querySelectorAll('.reveal-scroll')];
        const idx = siblings.indexOf(entry.target);
        setTimeout(() => entry.target.classList.add('is-visible'), idx * 80);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.08 });

    targets.forEach(t => io.observe(t));
  });
})();
