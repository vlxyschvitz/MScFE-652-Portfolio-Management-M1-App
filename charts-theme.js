/* ==========================================================================
   Reads the current CSS custom properties so every Chart.js instance matches
   the ledger palette, and stays in sync with the dark/light toggle.
   ========================================================================== */
const ChartTheme = (() => {

  function cssVar(name){
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function palette(){
    return {
      ink: cssVar('--ink'),
      inkSoft: cssVar('--ink-soft'),
      steel: cssVar('--steel'),
      brass: cssVar('--brass'),
      loss: cssVar('--loss'),
      gain: cssVar('--gain'),
      line: cssVar('--line'),
      lineStrong: cssVar('--line-strong'),
      paper: cssVar('--paper'),
      paperDim: cssVar('--paper-dim'),
      fontMono: "'IBM Plex Mono', ui-monospace, monospace",
      fontSerif: "'Source Serif 4', Georgia, serif",
    };
  }

  // Soft neon glow behind every drawn dataset (lines, points, bars) — makes
  // the plots read as "instrumentation" rather than flat business-chart output.
  let glowRegistered = false;
  const neonGlowPlugin = {
    id: 'neonGlow',
    beforeDatasetDraw(chart, args){
      const ds = chart.data.datasets[args.index] || {};
      const color = typeof ds.borderColor === 'string' ? ds.borderColor
                  : (typeof ds.backgroundColor === 'string' ? ds.backgroundColor : null);
      chart.ctx.save();
      if(color){
        chart.ctx.shadowColor = color;
        chart.ctx.shadowBlur = chart.config.type === 'bar' ? 8 : 11;
      }
    },
    afterDatasetDraw(chart){ chart.ctx.restore(); }
  };

  function applyDefaults(){
    if(typeof Chart === 'undefined') return;
    if(!glowRegistered){ Chart.register(neonGlowPlugin); glowRegistered = true; }
    const p = palette();
    Chart.defaults.font.family = p.fontMono;
    Chart.defaults.font.size = 11;
    Chart.defaults.color = p.inkSoft;
    Chart.defaults.borderColor = p.line;
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.boxWidth = 8;
    Chart.defaults.plugins.legend.labels.boxHeight = 8;
    Chart.defaults.animation.duration = 400;
  }

  // registry of {chart, rebuild} so charts can be redrawn on theme change
  const registry = [];
  function register(rebuildFn){
    registry.push(rebuildFn);
  }
  function rebuildAll(){
    applyDefaults();
    registry.forEach(fn => { try{ fn(); }catch(e){ console.error(e); } });
  }

  return { palette, applyDefaults, register, rebuildAll };
})();
