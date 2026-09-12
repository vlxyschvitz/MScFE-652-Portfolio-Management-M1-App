/* ==========================================================================
   Lesson 2 — Value at Risk
   ========================================================================== */
const Lesson2 = (() => {

  let varChart = null;

  function fmt(n, d=2){ return Number.isFinite(n) ? n.toFixed(d) : '—'; }

  // Chart.js plugin: draws a labelled vertical line at a given x-scale value.
  function verticalLinePlugin(getSpecs){
    return {
      id: 'verticalLine-' + Math.random().toString(36).slice(2),
      afterDatasetsDraw(chart){
        const specs = getSpecs();
        const { ctx, chartArea, scales } = chart;
        if(!chartArea) return;
        specs.forEach(spec => {
          const xScale = scales.x;
          const xPix = xScale.getPixelForValue(spec.value);
          if(xPix < chartArea.left || xPix > chartArea.right) return;
          ctx.save();
          ctx.strokeStyle = spec.color;
          ctx.lineWidth = 2;
          ctx.setLineDash(spec.dash || []);
          ctx.beginPath();
          ctx.moveTo(xPix, chartArea.top);
          ctx.lineTo(xPix, chartArea.bottom);
          ctx.stroke();
          ctx.fillStyle = spec.color;
          ctx.font = "600 11px 'IBM Plex Mono', monospace";
          ctx.textAlign = xPix > chartArea.right - 60 ? 'right' : 'left';
          ctx.fillText(spec.label, xPix + (ctx.textAlign==='right'?-6:6), chartArea.top + 14);
          ctx.restore();
        });
      }
    };
  }

  function computeVaR(series, confPct, method){
    const alpha = confPct/100;
    const mu = Stat.mean(series);
    const sigma = Stat.std(series);

    if(method === 'historical'){
      const cutoff = Stat.percentile(series, (1-alpha)*100);
      const tail = series.filter(r => r <= cutoff);
      const cvarTail = tail.length ? Stat.mean(tail) : cutoff;
      return { varPct: -cutoff, cvarPct: -cvarTail, distribution: series };
    }

    if(method === 'parametric'){
      const z = Stat.normInv(1-alpha); // negative
      const cutoff = mu + z*sigma;
      // Expected shortfall for normal: mu - sigma * phi(z)/(1-alpha)
      const phi = Math.exp(-0.5*z*z)/Math.sqrt(2*Math.PI);
      const cvar = mu - sigma * phi/(1-alpha);
      return { varPct: -cutoff, cvarPct: -cvar, distribution: series };
    }

    // Monte Carlo: simulate from fitted normal
    const N = 20000;
    const sims = new Array(N);
    for(let i=0;i<N;i++) sims[i] = mu + sigma*Stat.randNormal();
    const cutoff = Stat.percentile(sims, (1-alpha)*100);
    const tail = sims.filter(r => r <= cutoff);
    const cvarTail = tail.length ? Stat.mean(tail) : cutoff;
    return { varPct: -cutoff, cvarPct: -cvarTail, distribution: sims };
  }

  function render(){
    const seriesKey = document.getElementById('var-series-select').value;
    const method = document.getElementById('var-method').value;
    const conf = parseFloat(document.getElementById('var-conf').value);
    const horizon = parseInt(document.getElementById('var-horizon').value, 10);

    document.getElementById('var-conf-out').textContent = conf + '%';
    document.getElementById('var-horizon-out').textContent = horizon + (horizon===1 ? ' day' : ' days');

    const series = SampleSeries.get(seriesKey);
    const result = computeVaR(series, conf, method);
    const scale = Math.sqrt(horizon);
    const varScaled = result.varPct * scale;
    const cvarScaled = result.cvarPct * scale;

    document.getElementById('var-value').textContent = fmt(varScaled) + '%';
    document.getElementById('var-cvar').textContent = fmt(cvarScaled) + '%';

    const { counts, min, width } = Stat.histogramBins(result.distribution, 30);
    const labels = counts.map((_,i)=> (min + i*width));
    const pal = ChartTheme.palette();

    // colour bars in the loss tail differently
    const varCutoffValue = -varScaled; // 1-day equivalent position on original (unscaled) distribution axis for visual cutoff
    const barColors = labels.map(v => v <= -result.varPct ? pal.loss : pal.steel);

    if(varChart) varChart.destroy();
    varChart = new Chart(document.getElementById('var-hist-canvas'), {
      type:'bar',
      data:{ labels: labels.map(v=>v.toFixed(1)), datasets:[{
        data: counts,
        backgroundColor: barColors,
        borderRadius:1,
        barPercentage:1.0,
        categoryPercentage:1.0,
      }]},
      options:{
        responsive:true,
        plugins:{
          legend:{ display:false },
          tooltip:{ callbacks:{ title:(items)=> `${items[0].label}%` } },
        },
        scales:{
          x:{ ticks:{ maxTicksLimit:8 }, grid:{ display:false }, title:{ display:true, text:'1-day return (%)' } },
          y:{ ticks:{ display:false }, grid:{ color: pal.line } },
        }
      },
      plugins:[ verticalLinePlugin(() => ([
        { value: -result.varPct, color: pal.loss, label: `VaR ${conf}%`, dash:[] },
        { value: -result.cvarPct, color: pal.ink, label: 'CVaR', dash:[4,3] },
      ])) ]
    });
    ChartTheme.applyDefaults();
  }

  function bindEvents(){
    ['var-series-select','var-method'].forEach(id=>{
      document.getElementById(id).addEventListener('change', render);
    });
    ['var-conf','var-horizon'].forEach(id=>{
      document.getElementById(id).addEventListener('input', render);
    });
  }

  function init(){
    bindEvents();
    render();
    ChartTheme.register(render);
  }

  return { init };
})();
