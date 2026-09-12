/* ==========================================================================
   Lesson 4 — The Mathematics of Classical Portfolio Theory
   Closed-form efficient frontier for N assets via:
     A = 1'Σ⁻¹1, B = 1'Σ⁻¹μ, C = μ'Σ⁻¹μ, D = AC - B²
     w(m) = Σ⁻¹[ ((C - Bm)/D)·1 + ((Am - B)/D)·μ ]     (min-var weights at target m)
     σ²(m) = (A m² - 2B m + C) / D
   ========================================================================== */
const Lesson4 = (() => {

  let frChart = null;
  const N = 3;
  const names = ['A','B','C'];
  const swatchVarNames = ['--steel','--brass','--gain'];

  const defaults = {
    mu:  [10, 6, 3],
    sig: [18, 10, 4],
    rho: { AB: 0.3, AC: -0.1, BC: 0.15 },
  };

  function buildInputsUI(){
    const wrap = document.getElementById('fr-asset-inputs');
    let html = '';
    names.forEach((nm,i)=>{
      html += `
        <div class="asset-row">
          <span class="swatch" style="background:var(${swatchVarNames[i]})"></span>
          <label>Asset ${nm} μ%
            <input type="number" id="fr-mu-${i}" value="${defaults.mu[i]}" step="0.5">
          </label>
          <label>σ%
            <input type="number" id="fr-sig-${i}" value="${defaults.sig[i]}" step="0.5" min="0.1">
          </label>
          <label>&nbsp;</label>
        </div>`;
    });
    html += `
      <div class="asset-row">
        <span></span>
        <label>ρ(A,B) <input type="number" id="fr-rho-AB" value="${defaults.rho.AB}" step="0.05" min="-1" max="1"></label>
        <label>ρ(A,C) <input type="number" id="fr-rho-AC" value="${defaults.rho.AC}" step="0.05" min="-1" max="1"></label>
        <label>ρ(B,C) <input type="number" id="fr-rho-BC" value="${defaults.rho.BC}" step="0.05" min="-1" max="1"></label>
      </div>`;
    wrap.innerHTML = html;
  }

  function readInputs(){
    const mu = [0,1,2].map(i => parseFloat(document.getElementById(`fr-mu-${i}`).value));
    const sig = [0,1,2].map(i => parseFloat(document.getElementById(`fr-sig-${i}`).value));
    const rAB = parseFloat(document.getElementById('fr-rho-AB').value);
    const rAC = parseFloat(document.getElementById('fr-rho-AC').value);
    const rBC = parseFloat(document.getElementById('fr-rho-BC').value);
    const corr = [
      [1, rAB, rAC],
      [rAB, 1, rBC],
      [rAC, rBC, 1],
    ];
    const rf = parseFloat(document.getElementById('fr-rf').value);
    return { mu, sig, corr, rf };
  }

  function fmt(n,d=2){ return Number.isFinite(n) ? n.toFixed(d) : '—'; }

  function solve(mu, sig, corr, rf){
    const Sigma = Mat.covMatrixFromVols(sig, corr);
    const SigmaInv = Mat.invert(Sigma);
    const ones = [1,1,1];

    const SinvOnes = Mat.matVec(SigmaInv, ones);
    const SinvMu   = Mat.matVec(SigmaInv, mu);

    const A = Mat.dot(ones, SinvOnes);
    const B = Mat.dot(ones, SinvMu);
    const C = Mat.dot(mu, SinvMu);
    const D = A*C - B*B;

    // w(m) = k1 * (Σ⁻¹1) + k2 * (Σ⁻¹μ)
    function weightsAtCorrect(m){
      const k1 = (C - B*m)/D;
      const k2 = (A*m - B)/D;
      return SinvOnes.map((v,i)=> k1*v + k2*SinvMu[i]);
    }

    function varianceAt(m){
      return (A*m*m - 2*B*m + C) / D;
    }

    const muMvp = B/A;
    const varMvp = 1/A;
    const wMvp = SinvOnes.map(v => v/A);

    // tangency portfolio: w_tan ∝ Σ⁻¹(μ - rf·1)
    const excess = mu.map(m => m - rf);
    const SinvExcess = Mat.matVec(SigmaInv, excess);
    const denomTan = Mat.dot(ones, SinvExcess);
    const wTan = SinvExcess.map(v => v/denomTan);
    const tanMoments = Mat.portfolioMoments(wTan, mu, Sigma);
    const sharpeTan = (tanMoments.mu - rf) / tanMoments.sigma;

    return {
      Sigma, weightsAtCorrect, varianceAt,
      muMvp, varMvp, sigMvp: Math.sqrt(Math.max(varMvp,0)), wMvp,
      wTan, tanMu: tanMoments.mu, tanSigma: tanMoments.sigma, sharpeTan,
    };
  }

  function render(){
    const { mu, sig, corr, rf } = readInputs();
    document.getElementById('fr-rf-out').textContent = rf.toFixed(2) + '%';

    let model;
    try{
      model = solve(mu, sig, corr, rf);
    } catch(e){
      console.error('Frontier solve failed', e);
      return;
    }

    // Frontier curve: sweep target returns, keep only the efficient (upper) branch
    const mMin = Math.min(...mu) - 6;
    const mMax = Math.max(...mu) + 10;
    const framePts = [];
    for(let m=mMin; m<=mMax; m += (mMax-mMin)/120){
      const v = model.varianceAt(m);
      if(v >= 0) framePts.push({ x: Math.sqrt(v), y: m });
    }
    const efficientPts = framePts.filter(p => p.y >= model.muMvp);
    const inefficientPts = framePts.filter(p => p.y < model.muMvp);

    // CML: line from (0, rf) through tangency, extended
    const cmlMaxSigma = Math.max(...framePts.map(p=>p.x)) * 1.15;
    const slope = (model.tanMu - rf) / model.tanSigma;
    const cmlPts = [{x:0,y:rf}, {x:cmlMaxSigma, y: rf + slope*cmlMaxSigma}];

    const pal = ChartTheme.palette();
    const assetPts = mu.map((m,i)=> ({ x: sig[i], y: m }));

    if(frChart) frChart.destroy();
    frChart = new Chart(document.getElementById('fr-canvas'), {
      type:'scatter',
      data:{ datasets:[
        {
          label:'Efficient frontier',
          data: efficientPts, showLine:true, fill:false,
          borderColor: pal.brass, backgroundColor:pal.brass,
          pointRadius:0, borderWidth:2.5, order:3,
        },
        {
          label:'Inefficient branch',
          data: inefficientPts, showLine:true, fill:false,
          borderColor: pal.inkSoft, backgroundColor:pal.inkSoft,
          borderDash:[3,3],
          pointRadius:0, borderWidth:1.5, order:4,
        },
        {
          label:'Capital Market Line',
          data: cmlPts, showLine:true, fill:false,
          borderColor: pal.steel, backgroundColor:pal.steel,
          pointRadius:0, borderWidth:2, order:2,
        },
        {
          label:'Assets',
          data: assetPts, showLine:false,
          pointRadius:5, pointBackgroundColor: names.map((_,i)=>pal.ink),
          order:1,
        },
        {
          label:'MVP',
          data: [{x: model.sigMvp, y: model.muMvp}], showLine:false,
          pointStyle:'rectRot', pointRadius:7,
          pointBackgroundColor: pal.gain, pointBorderColor: pal.paper, pointBorderWidth:1.5,
          order:0,
        },
        {
          label:'Tangency',
          data: [{x: model.tanSigma, y: model.tanMu}], showLine:false,
          pointStyle:'star', pointRadius:9,
          pointBackgroundColor: pal.loss, pointBorderColor: pal.paper, pointBorderWidth:1.5,
          order:0,
        },
      ]},
      options:{
        responsive:true,
        plugins:{ legend:{ position:'bottom', labels:{ filter: (item)=> item.text !== 'Inefficient branch' || true } } },
        scales:{
          x:{ title:{ display:true, text:'σ (risk, %)' }, min:0, grid:{ color: pal.line } },
          y:{ title:{ display:true, text:'μ (expected return, %)' }, grid:{ color: pal.line } },
        }
      }
    });
    ChartTheme.applyDefaults();

    document.getElementById('fr-mvp').textContent = `${fmt(model.muMvp)}%, ${fmt(model.sigMvp)}%`;
    document.getElementById('fr-tan').textContent = `${fmt(model.tanMu)}%, ${fmt(model.tanSigma)}%`;
    document.getElementById('fr-sharpe').textContent = fmt(model.sharpeTan);
  }

  function bindEvents(){
    document.querySelectorAll('#fr-asset-inputs input').forEach(el=>{
      el.addEventListener('input', render);
    });
    document.getElementById('fr-rf').addEventListener('input', render);
  }

  function init(){
    buildInputsUI();
    bindEvents();
    render();
    ChartTheme.register(render);
  }

  return { init };
})();
