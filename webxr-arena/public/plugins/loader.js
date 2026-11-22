const NUMERIC_KEYS = ['hoverScale'];
const STRING_KEYS = ['hoverColor', 'hudTheme', 'uid'];

export async function loadUserConfig() {
  const params = new URLSearchParams(location.search);
  const uidParam = params.get('uid');
  const uid = uidParam || localStorage.getItem('webxr-uid') || 'default';
  if (uidParam) localStorage.setItem('webxr-uid', uidParam);

  const cfg = { uid, hoverScale: 1.15, hoverColor: '#ffffff', hudTheme: 'dark' };
  try {
    const mod = await import(`/users/${encodeURIComponent(uid)}.js`);
    Object.assign(cfg, mod.default || {});
  } catch {}
  for (const k of NUMERIC_KEYS) if (params.get(k) !== null) cfg[k] = parseFloat(params.get(k));
  for (const k of STRING_KEYS) if (params.get(k) !== null) cfg[k] = params.get(k);
  return cfg;
}

export async function loadPlugins(ctx) {
  const plugins = [];
  let list = [];
  try {
    list = await (await fetch('./plugins/plugins.json')).json();
  } catch {
    return plugins;
  }
  for (const name of list) {
    try {
      const mod = await import(`/plugins/${name}`);
      if (mod.activate) mod.activate(ctx);
      plugins.push(mod);
    } catch (e) {
      console.error('[plugin] échec du chargement de', name, e);
    }
  }
  return plugins;
}