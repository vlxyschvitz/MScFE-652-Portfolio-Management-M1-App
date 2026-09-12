/* ==========================================================================
   Stat / matrix / distribution utilities shared by all lessons.
   Everything here is plain vanilla JS, no dependencies.
   ========================================================================== */
const Stat = (() => {

  function mean(arr){
    return arr.reduce((a,b)=>a+b,0) / arr.length;
  }

  function variance(arr, ddof=1){
    const m = mean(arr);
    const ss = arr.reduce((a,b)=>a+(b-m)*(b-m), 0);
    return ss / (arr.length - ddof);
  }

  function std(arr, ddof=1){
    return Math.sqrt(variance(arr, ddof));
  }

  function skewness(arr){
    const m = mean(arr);
    const s = Math.sqrt(variance(arr, 0)); // population std for the standardized moment
    const n = arr.length;
    const m3 = arr.reduce((a,b)=>a+Math.pow(b-m,3),0) / n;
    return m3 / Math.pow(s,3);
  }

  function kurtosis(arr){
    const m = mean(arr);
    const s = Math.sqrt(variance(arr, 0));
    const n = arr.length;
    const m4 = arr.reduce((a,b)=>a+Math.pow(b-m,4),0) / n;
    return m4 / Math.pow(s,4); // not excess; normal benchmark = 3
  }

  function covariance(x, y, ddof=1){
    const mx = mean(x), my = mean(y);
    let s = 0;
    for(let i=0;i<x.length;i++) s += (x[i]-mx)*(y[i]-my);
    return s / (x.length - ddof);
  }

  function correlation(x, y){
    return covariance(x,y) / (std(x)*std(y));
  }

  function percentile(arr, p){
    // p in [0,100], linear interpolation
    const sorted = [...arr].sort((a,b)=>a-b);
    const idx = (p/100) * (sorted.length - 1);
    const lo = Math.floor(idx), hi = Math.ceil(idx);
    if(lo === hi) return sorted[lo];
    const frac = idx - lo;
    return sorted[lo] + (sorted[hi]-sorted[lo]) * frac;
  }

  // Abramowitz & Stegun erf approximation
  function erf(x){
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);
    const a1= 0.254829592, a2=-0.284496736, a3=1.421413741,
          a4=-1.453152027, a5=1.061405429, p=0.3275911;
    const t = 1/(1+p*x);
    const y = 1 - (((((a5*t+a4)*t)+a3)*t+a2)*t+a1)*t*Math.exp(-x*x);
    return sign*y;
  }

  function normCDF(x, mu=0, sigma=1){
    return 0.5 * (1 + erf((x-mu)/(sigma*Math.sqrt(2))));
  }

  // Inverse normal CDF (Acklam's algorithm) — good to ~1e-9
  function normInv(p, mu=0, sigma=1){
    if(p<=0) return -Infinity;
    if(p>=1) return Infinity;
    const a=[-3.969683028665376e+01,2.209460984245205e+02,-2.759285104469687e+02,
              1.383577518672690e+02,-3.066479806614716e+01,2.506628277459239e+00];
    const b=[-5.447609879822406e+01,1.615858368580409e+02,-1.556989798598866e+02,
              6.680131188771972e+01,-1.328068155288572e+01];
    const c=[-7.784894002430293e-03,-3.223964580411365e-01,-2.400758277161838e+00,
              -2.549732539343734e+00,4.374664141464968e+00,2.938163982698783e+00];
    const d=[7.784695709041462e-03,3.224671290700398e-01,2.445134137142996e+00,
              3.754408661907416e+00];
    const plow=0.02425, phigh=1-plow;
    let q,r,z;
    if(p<plow){
      q=Math.sqrt(-2*Math.log(p));
      z=(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
        ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
    } else if(p<=phigh){
      q=p-0.5; r=q*q;
      z=(((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q /
        (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
    } else {
      q=Math.sqrt(-2*Math.log(1-p));
      z=-(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
        ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
    }
    return mu + sigma*z;
  }

  // Box-Muller standard normal draw
  let spare = null;
  function randNormal(){
    if(spare !== null){ const s = spare; spare = null; return s; }
    let u,v,s;
    do{
      u = Math.random()*2-1;
      v = Math.random()*2-1;
      s = u*u+v*v;
    } while(s===0 || s>=1);
    const mul = Math.sqrt(-2*Math.log(s)/s);
    spare = v*mul;
    return u*mul;
  }

  function histogramBins(arr, nBins=24){
    const min = Math.min(...arr), max = Math.max(...arr);
    const width = (max-min) / nBins || 1;
    const counts = new Array(nBins).fill(0);
    arr.forEach(v=>{
      let idx = Math.floor((v-min)/width);
      if(idx>=nBins) idx = nBins-1;
      if(idx<0) idx = 0;
      counts[idx]++;
    });
    const labels = counts.map((_,i)=> (min + i*width));
    return { counts, labels, width, min, max };
  }

  return {
    mean, variance, std, skewness, kurtosis, covariance, correlation,
    percentile, erf, normCDF, normInv, randNormal, histogramBins
  };
})();

/* ==========================================================================
   Small linear algebra helpers for N-asset (N<=4 in this app) portfolio math.
   Matrices are represented as arrays of arrays; vectors as flat arrays.
   ========================================================================== */
const Mat = (() => {

  function matVec(A, x){
    return A.map(row => row.reduce((s,a,i)=> s + a*x[i], 0));
  }

  function dot(x, y){
    return x.reduce((s,xi,i)=> s + xi*y[i], 0);
  }

  function transpose(A){
    return A[0].map((_,c)=> A.map(row=>row[c]));
  }

  // Gauss-Jordan inversion, n small (<=4) so no need for pivoting sophistication
  function invert(A){
    const n = A.length;
    const M = A.map((row,i)=> [...row, ...Array.from({length:n},(_,j)=> j===i?1:0)]);
    for(let col=0; col<n; col++){
      // pivot
      let pivotRow = col;
      for(let r=col+1;r<n;r++){
        if(Math.abs(M[r][col]) > Math.abs(M[pivotRow][col])) pivotRow = r;
      }
      [M[col], M[pivotRow]] = [M[pivotRow], M[col]];
      const pivot = M[col][col] || 1e-12;
      for(let c=0;c<2*n;c++) M[col][c] /= pivot;
      for(let r=0;r<n;r++){
        if(r===col) continue;
        const factor = M[r][col];
        for(let c=0;c<2*n;c++) M[r][c] -= factor*M[col][c];
      }
    }
    return M.map(row => row.slice(n));
  }

  function covMatrixFromVols(vols, corr){
    // corr: n x n correlation matrix, vols: array of std devs
    const n = vols.length;
    const C = [];
    for(let i=0;i<n;i++){
      C.push([]);
      for(let j=0;j<n;j++){
        C[i].push(corr[i][j]*vols[i]*vols[j]);
      }
    }
    return C;
  }

  function portfolioMoments(w, mu, Sigma){
    const muP = dot(w, mu);
    const sigP2 = dot(w, matVec(Sigma, w));
    return { mu: muP, variance: sigP2, sigma: Math.sqrt(Math.max(sigP2,0)) };
  }

  return { matVec, dot, transpose, invert, covMatrixFromVols, portfolioMoments };
})();

/* ==========================================================================
   Sample return series used across Lesson 1 & Lesson 2, so the two lessons
   visibly share the same data.
   ========================================================================== */
const SampleSeries = (() => {

  function gen(n, mu, sigma, opts={}){
    const { skewShock=0, tailShock=0 } = opts;
    const out = [];
    for(let i=0;i<n;i++){
      let z = Stat.randNormal();
      // occasional extra shocks to induce skew / kurtosis, purely illustrative
      if(skewShock && Math.random() < 0.05) z -= Math.abs(Stat.randNormal())*skewShock;
      if(tailShock && Math.random() < 0.03) z += (Math.random()<0.5?-1:1) * Math.abs(Stat.randNormal())*tailShock;
      out.push(mu + sigma*z);
    }
    return out;
  }

  const generators = {
    calm:      () => gen(500, 0.05, 0.6),
    volatile:  () => gen(500, 0.03, 1.8),
    crash:     () => gen(500, 0.06, 1.0, { skewShock: 2.4 }),
    fat:       () => gen(500, 0.04, 0.9, { tailShock: 2.8 }),
  };

  function get(key){
    return (generators[key] || generators.calm)();
  }

  return { get, gen };
})();
