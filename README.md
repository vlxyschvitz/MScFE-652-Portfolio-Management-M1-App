# M1 — Value at Risk & Classical Portfolio Theory

An interactive, single-page study guide covering:

1. **Sample Moments & Portfolio Performance** — mean, variance, skewness, kurtosis,
   and how they combine into portfolio return/risk.
2. **Value at Risk** — historical, parametric, and Monte Carlo VaR, plus Expected
   Shortfall (CVaR) and time-horizon scaling.
3. **From Utility Theory to Classical Portfolio Theory** — expected utility, risk
   aversion, and why mean–variance preferences are a valid simplification.
4. **The Mathematics of Classical Portfolio Theory** — the Markowitz optimisation,
   minimum-variance portfolio, tangency portfolio, and Capital Market Line, solved
   in closed form for N assets.

Every widget runs client-side: no backend, no build step, no dependencies beyond
two CDN scripts (Chart.js for plotting, KaTeX for math typesetting).

## Running locally

Just open `index.html` in a browser, or serve the folder with any static server:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Publishing to GitHub Pages

1. Push this repository's contents to the `main` branch of a GitHub repo.
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to `Deploy from a branch`, branch
   `main`, folder `/ (root)`.
4. Save — GitHub will publish the site at
   `https://<your-username>.github.io/<repo-name>/` within a minute or two.

## File structure

```
index.html         Page structure and copy for all four lessons
style.css           Design system (the "ledger" theme) — light + night mode
utils.js            Shared statistics, matrix algebra, and distribution math
charts-theme.js     Chart.js styling that follows the CSS theme
lesson1.js          Moment calculator + two-asset portfolio widget
lesson2.js          VaR / CVaR explorer (3 methods)
lesson3.js          Utility function plotter + indifference curves
lesson4.js          Efficient frontier / MVP / tangency / CML solver (N=3 assets)
app.js              Navigation, theme toggle, math rendering, bootstrapping
```

All files sit at the repository root — no subfolders — so it deploys cleanly
from GitHub Pages' root option with no path changes.

## Notes on the math

- Sample moments use the standard unbiased (n−1) estimator for variance and the
  population-moment definitions for skewness/kurtosis.
- Parametric VaR and its Monte Carlo counterpart both assume normally distributed
  returns fitted to the sample mean/std; historical VaR makes no distributional
  assumption.
- The efficient frontier is solved in closed form using the classical
  Lagrangian result for N risky assets (no numerical optimiser needed), so the
  widget stays fast and exact even while you drag the sliders.
