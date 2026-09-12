/* ==========================================================================
   App bootstrap: hero demo, sidebar nav, theme toggle, KaTeX rendering.
   ========================================================================== */
(function(){

  /* ---------------- Hero: two-asset frontier teaser ---------------- */
  let heroChart = null;
  function renderHero(){
    const rho = parseFloat(document.getElementById('hero-corr').value);
    document.getElementById('hero-corr-out').textContent = rho.toFixed(2);

    const muA=9, sigA=16, muB=4, sigB=7;
    const pts = [];
    for(let w=0; w<=100; w+=2){
      const wa = w/100, wb=1-wa;
      const muP = wa*muA + wb*muB;
      const varP = wa*wa*sigA*sigA + wb*wb*sigB*sigB + 2*wa*wb*rho*sigA*sigB;
      pts.push({ x: Math.sqrt(Math.max(varP,0)), y: muP });
    }
    const pal = ChartTheme.palette();
    if(heroChart) heroChart.destroy();
    heroChart = new Chart(document.getElementById('hero-frontier-canvas'), {
      type:'scatter',
      data:{ datasets:[
        { label:'Attainable set', data:pts, showLine:true, fill:false,
          borderColor: pal.brass, backgroundColor:pal.brass, pointRadius:0, borderWidth:2.5 },
        { label:'Assets', data:[{x:sigA,y:muA},{x:sigB,y:muB}], showLine:false,
          pointRadius:5, pointBackgroundColor: pal.ink },
      ]},
      options:{
        responsive:true,
        plugins:{ legend:{ display:false } },
        scales:{
          x:{ title:{ display:true, text:'σ (risk, %)' }, min:0, grid:{ color: pal.line } },
          y:{ title:{ display:true, text:'μ (expected return, %)' }, grid:{ color: pal.line } },
        }
      }
    });
    ChartTheme.applyDefaults();
  }

  /* ---------------- Sidebar nav highlighting ---------------- */
  function initNavHighlight(){
    const links = Array.from(document.querySelectorAll('.ledger-list a'));
    const sections = links.map(l => document.querySelector(l.getAttribute('href')));

    function setActive(id){
      links.forEach(l => l.classList.toggle('active', l.dataset.nav === id));
    }

    const observer = new IntersectionObserver((entries)=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){
          setActive(entry.target.id);
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

    sections.forEach(s => s && observer.observe(s));
    setActive('overview');
  }

  /* ---------------- Theme toggle (dark is the default) ---------------- */
  function initTheme(){
    const btn = document.getElementById('theme-toggle');
    const stored = localStorage.getItem('m1-theme'); // 'light' | 'dark' | null

    if(stored === 'light'){
      document.documentElement.setAttribute('data-theme','light');
      btn.setAttribute('aria-pressed','true');
      btn.textContent = 'Dark mode';
    } else {
      document.documentElement.removeAttribute('data-theme');
      btn.setAttribute('aria-pressed','false');
      btn.textContent = 'Light mode';
    }

    btn.addEventListener('click', () => {
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      if(isLight){
        document.documentElement.removeAttribute('data-theme');
        btn.setAttribute('aria-pressed','false');
        btn.textContent = 'Light mode';
        localStorage.setItem('m1-theme','dark');
      } else {
        document.documentElement.setAttribute('data-theme','light');
        btn.setAttribute('aria-pressed','true');
        btn.textContent = 'Dark mode';
        localStorage.setItem('m1-theme','light');
      }
      // give the browser a tick to apply CSS vars before charts re-read them
      requestAnimationFrame(() => requestAnimationFrame(() => {
        renderHero();
        ChartTheme.rebuildAll();
        window.dispatchEvent(new Event('m1-theme-changed'));
      }));
    });
  }

  /* ---------------- KaTeX rendering ---------------- */
  function renderMath(){
    document.querySelectorAll('.eq[data-tex]').forEach(el => {
      try{
        katex.render(el.dataset.tex, el, { throwOnError:false, displayMode:true });
      }catch(e){ console.error(e); }
    });
    document.querySelectorAll('.math').forEach(el => {
      try{
        katex.render(el.textContent, el, { throwOnError:false, displayMode:false });
      }catch(e){ /* leave as text on failure */ }
    });
  }

  /* ---------------- Boot ---------------- */
  document.addEventListener('DOMContentLoaded', () => {
    ChartTheme.applyDefaults();
    renderMath();
    initNavHighlight();
    initTheme();

    document.getElementById('hero-corr').addEventListener('input', renderHero);
    renderHero();

    Lesson1.init();
    Lesson2.init();
    Lesson3.init();
    Lesson4.init();
  });

})();
