/* ==========================================================================
   Lesson 1 — Sample Moments & Portfolio Performance
   ========================================================================== */
const Lesson1 = (() => {

  let momChart = null;
  let taChart = null;
  let currentMomSeries = [];

  function parseCustom(text){
    return text.split(/[\s,;\n]+/).map(s=>parseFloat(s)).filter(v=>!isNaN(v));
  }

  function getMomSeries(){
    const sel = document.getElementById('mom-series-select').value;
    if(sel === 'custom'){
      const parsed = parseCustom(document.getElementById('mom-custom').value);
      return parsed.length >= 5 ? parsed : SampleSeries.get('calm');
    }
    return SampleSeries.get(sel);
  }

  function fmt(n, d=2){ return Number.isFinite(n) ? n.toFixed(d) : '—'; }

  function renderMoments(){
    currentMomSeries = getMomSeries();
    const s = currentMomSeries;
    document.getElementById('mom-mean').textContent = fmt(Stat.mean(s)) + '%';
    document.getElementById('mom-std').textContent  = fmt(Stat.std(s)) + '%';
    document.getElementById('mom-skew').textContent = fmt(Stat.skewness(s));
    document.getElementById('mom-kurt').textContent = fmt(Stat.kurtosis(s));

    const { counts, min, width } = Stat.histogramBins(s, 26);
    const labels = counts.map((_,i)=> (min + i*width).toFixed(1));
    const pal = ChartTheme.palette();

    if(momChart) momChart.destroy();
    momChart = new Chart(document.getElementById('mom-hist-canvas'), {
      type: 'bar',
      data: { labels, datasets: [{
        data: counts,
        backgroundColor: pal.steel,
        borderRadius: 1,
        barPercentage: 1.0,
        categoryPercentage: 1.0,
      }]},
      options: {
        responsive:true,
        plugins:{ legend:{display:false}, tooltip:{ callbacks:{ title:(items)=> `${items[0].label}%` } } },
        scales:{
          x:{ ticks:{ maxTicksLimit:8 }, grid:{ display:false } },
          y:{ ticks:{ display:false }, grid:{ color: pal.line } }
        }
      }
    });
    ChartTheme.applyDefaults();
  }

  function twoAssetStats(wA){
    const muA = parseFloat(document.getElementById('ta-muA').value);
    const sigA = parseFloat(document.getElementById('ta-sigA').value);
    const muB = parseFloat(document.getElementById('ta-muB').value);
    const sigB = parseFloat(document.getElementById('ta-sigB').value);
    const rho = parseFloat(document.getElementById('ta-rho').value);
    const rf = parseFloat(document.getElementById('ta-rf').value);
    const wB = 1 - wA;
    const muP = wA*muA + wB*muB;
    const varP = wA*wA*sigA*sigA + wB*wB*sigB*sigB + 2*wA*wB*rho*sigA*sigB;
    const sigP = Math.sqrt(Math.max(varP,0));
    const sharpe = sigP > 0 ? (muP - rf)/sigP : NaN;
    return { muA, sigA, muB, sigB, rho, rf, muP, sigP, sharpe };
  }

  function renderTwoAsset(){
    const wPct = parseInt(document.getElementById('ta-w').value, 10);
    document.getElementById('ta-w-out').textContent = wPct + '%';
    const wA = wPct/100;
    const cur = twoAssetStats(wA);

    document.getElementById('ta-mup').textContent = fmt(cur.muP) + '%';
    document.getElementById('ta-sigp').textContent = fmt(cur.sigP) + '%';
    document.getElementById('ta-sharpe').textContent = fmt(cur.sharpe);

    // trace the full curve for weights 0..100%
    const curvePts = [];
    for(let w=0; w<=100; w+=2){
      const s = twoAssetStats(w/100);
      curvePts.push({ x: s.sigP, y: s.muP });
    }
    const pal = ChartTheme.palette();

    if(taChart) taChart.destroy();
    taChart = new Chart(document.getElementById('ta-curve-canvas'), {
      type:'scatter',
      data:{ datasets:[
        {
          label:'Attainable set',
          data: curvePts,
          showLine:true,
          fill:false,
          borderColor: pal.steel,
          backgroundColor: pal.steel,
          pointRadius:0,
          borderWidth:2,
          tension:0.15,
        },
        {
          label:'Current mix',
          data:[{x:cur.sigP, y:cur.muP}],
          pointRadius:6,
          pointBackgroundColor: pal.brass,
          pointBorderColor: pal.paper,
          pointBorderWidth:2,
          showLine:false,
        },
        {
          label:'Asset A / B',
          data:[{x:cur.sigA,y:cur.muA},{x:cur.sigB,y:cur.muB}],
          pointRadius:4,
          pointBackgroundColor: pal.ink,
          showLine:false,
        }
      ]},
      options:{
        responsive:true,
        plugins:{ legend:{ position:'bottom' } },
        scales:{
          x:{ title:{ display:true, text:'σ (risk, %)' }, grid:{ color: pal.line } },
          y:{ title:{ display:true, text:'μ (expected return, %)' }, grid:{ color: pal.line } },
        }
      }
    });
    ChartTheme.applyDefaults();
  }

  function bindEvents(){
    document.getElementById('mom-series-select').addEventListener('change', renderMoments);
    document.getElementById('mom-regenerate').addEventListener('click', renderMoments);
    document.getElementById('mom-custom').addEventListener('change', () => {
      document.getElementById('mom-series-select').value = 'custom';
      renderMoments();
    });

    ['ta-muA','ta-sigA','ta-muB','ta-sigB','ta-rho','ta-rf'].forEach(id=>{
      document.getElementById(id).addEventListener('input', renderTwoAsset);
    });
    document.getElementById('ta-w').addEventListener('input', renderTwoAsset);
  }

  function init(){
    bindEvents();
    renderMoments();
    renderTwoAsset();
    ChartTheme.register(() => { renderMoments(); renderTwoAsset(); });
  }

  return { init };
})();
