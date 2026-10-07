// Presentation only: activate before paint, restore the original storefront at expiry.
(() => {
  const start = Date.parse('2026-10-07T15:20:00Z');
  const end = Date.parse('2026-11-04T15:30:00Z');
  let timer;
  function refresh() {
    clearTimeout(timer);
    const now = Date.now();
    const active = now >= start && now < end;
    if (active) document.documentElement.dataset.seasonalTheme = 'halloween';
    else delete document.documentElement.dataset.seasonalTheme;
    const next = now < start ? start : now < end ? end : null;
    if (next !== null) timer = setTimeout(refresh, Math.min(next - now, 86400000));
  }
  refresh();
  document.addEventListener('visibilitychange', refresh);
})();
