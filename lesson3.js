/* ==========================================================================
   Lesson 3 — From Utility Theory to Classical Portfolio Theory
   ========================================================================== */
const Lesson3 = (() => {

  let utilChart = null;
  let indiffChart = null;

  function utilityFn(family, param, W){
    if(family === 'quadratic'){
      const b = param * 0.05; // keeps satiation point comfortably in view
      return W - (b/2)*W*W;
    }
    if(family === 'cara'){
      const a = param * 0.3;
      return -Math.exp(-a*W);
    }
    // CRRA
    const gamma = param;
    if(Math.abs(gamma - 1) < 0.02) return Math.log(Math.max(W, 1e-6));
    return (Math.pow(Math.max(W,1e-6), 1-gamma)) / (1-gamma);
  }

  function renderUtility(){
    const family = document.getElementById('ut-family').value;
    const param = parseFloat(document.getElementById('ut-param').value);
    document.getElementById('ut-param-out').textContent = param.toFixed(1);

    const pts = [];
    for(let w=0.1; w<=10; w+=0.1){
      pts.push({ x: w, y: utilityFn(family, param, w) });
    }
    const pal = ChartTheme.palette();

    if(utilChart) utilChart.destroy();
    utilChart = new Chart(document.getElementById('ut-canvas'), {
      type:'line',
      data:{ datasets:[{
        label:'U(W)',
        data: pts,
        borderColor: pal.brass,
        backgroundColor: 'transparent',
        borderWidth:2.5,
        pointRadius:0,
        tension:0.1,
      }]},
      options:{
        responsive:true,
        parsing:false,
        plugins:{ legend:{ display:false } },
        scales:{
          x:{ type:'linear', title:{ display:true, text:'Wealth, W' }, grid:{ color: pal.line } },
          y:{ title:{ display:true, text:'U(W)' }, grid:{ color: pal.line }, ticks:{ display:false } },
        }
      }
    });
    ChartTheme.applyDefaults();
  }

  function renderIndifference(){
    const lambda = parseFloat(document.getElementById('ind-lambda').value);
    document.getElementById('ind-lambda-out').textContent = lambda.toFixed(1);

    const pal = ChartTheme.palette();
    const levels = [0, 2, 4, 6, 8]; // utility constants c
    const colors = [pal.steel, pal.brass, pal.ink, pal.loss, pal.gain];
    const datasets = levels.map((c,i) => {
      const pts = [];
      for(let sigma=0; sigma<=20; sigma+=0.5){
        pts.push({ x: sigma, y: c + (lambda/2)*Math.pow(sigma/10,2)*10 });
      }
      return {
        label: `U = ${c}`,
        data: pts,
        borderColor: colors[i % colors.length],
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.25,
      };
    });

    if(indiffChart) indiffChart.destroy();
    indiffChart = new Chart(document.getElementById('ind-canvas'), {
      type:'line',
      data:{ datasets },
      options:{
        responsive:true,
        parsing:false,
        plugins:{ legend:{ position:'bottom' } },
        scales:{
          x:{ type:'linear', title:{ display:true, text:'σ (risk)' }, grid:{ color: pal.line } },
          y:{ title:{ display:true, text:'μ (expected return)' }, grid:{ color: pal.line } },
        }
      }
    });
    ChartTheme.applyDefaults();
  }

  function bindEvents(){
    document.getElementById('ut-family').addEventListener('change', renderUtility);
    document.getElementById('ut-param').addEventListener('input', renderUtility);
    document.getElementById('ind-lambda').addEventListener('input', renderIndifference);
  }

  function init(){
    bindEvents();
    renderUtility();
    renderIndifference();
    ChartTheme.register(() => { renderUtility(); renderIndifference(); });
  }

  return { init };
})();
