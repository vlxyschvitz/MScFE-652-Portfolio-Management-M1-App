/* ==========================================================================
   Ambient background: a slow drifting particle network rendered on a fixed
   full-viewport canvas, sitting behind the .bg-fx orbs/grid. Purely
   decorative — pauses under prefers-reduced-motion and on hidden tabs.
   ========================================================================== */
(function () {
  const canvas = document.getElementById('bg-particles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W, H, DPR;
  let particles = [];
  let raf = null;
  let running = true;

  function cssVar(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  function hexToRgb(hex) {
    const m = hex.replace('#', '');
    const bigint = parseInt(m.length === 3 ? m.split('').map(c => c + c).join('') : m, 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
  }

  function palette() {
    // Falls back gracefully if a CSS var isn't a plain hex (e.g. rgba strings)
    const tryHex = (name, fb) => {
      const v = cssVar(name, fb);
      return /^#/.test(v) ? v : fb;
    };
    return [
      tryHex('--steel', '#4fd6ff'),
      tryHex('--brass', '#ff5fce'),
      tryHex('--gain', '#39ffa0'),
    ].map(hexToRgb);
  }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.width = Math.floor(window.innerWidth * DPR);
    H = canvas.height = Math.floor(window.innerHeight * DPR);
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    const density = Math.min(70, Math.floor((window.innerWidth * window.innerHeight) / 26000));
    seed(density);
  }

  function seed(n) {
    const cols = palette();
    particles = new Array(n).fill(0).map(() => {
      const c = cols[Math.floor(Math.random() * cols.length)];
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.18 * DPR,
        vy: (Math.random() - 0.5) * 0.18 * DPR,
        r: (Math.random() * 1.4 + 0.6) * DPR,
        c,
      };
    });
  }

  function step() {
    ctx.clearRect(0, 0, W, H);
    const linkDist = 130 * DPR;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -20 || p.x > W + 20) p.vx *= -1;
      if (p.y < -20 || p.y > H + 20) p.vy *= -1;

      for (let j = i + 1; j < particles.length; j++) {
        const q = particles[j];
        const dx = p.x - q.x, dy = p.y - q.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < linkDist) {
          const alpha = (1 - dist / linkDist) * 0.16;
          ctx.strokeStyle = `rgba(${p.c[0]},${p.c[1]},${p.c[2]},${alpha})`;
          ctx.lineWidth = DPR * 0.6;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
        }
      }
    }
    for (const p of particles) {
      ctx.beginPath();
      ctx.fillStyle = `rgba(${p.c[0]},${p.c[1]},${p.c[2]},0.55)`;
      ctx.shadowColor = `rgba(${p.c[0]},${p.c[1]},${p.c[2]},0.9)`;
      ctx.shadowBlur = 6 * DPR;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  function loop() {
    if (!running) return;
    step();
    raf = requestAnimationFrame(loop);
  }

  function start() {
    if (raf) return;
    running = true;
    raf = requestAnimationFrame(loop);
  }
  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }

  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop(); else if (!reduceMotion) start();
  });

  resize();
  if (reduceMotion) {
    // Draw a single static frame instead of animating continuously.
    step();
  } else {
    start();
  }

  // Re-seed colors (without losing motion) when the theme toggle flips.
  window.addEventListener('m1-theme-changed', () => {
    const cols = palette();
    particles.forEach(p => { p.c = cols[Math.floor(Math.random() * cols.length)]; });
  });
})();
