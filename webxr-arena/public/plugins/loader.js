const NUMERIC_KEYS = ['hoverScale'];
const STRING_KEYS = ['hoverColor', 'hudTheme', 'uid'];

export async function loadUserConfig() {
  const params = new URLSearchParams(location.search);
  const uidParam = params.get('uid');
  const uid = uidParam || localStorage.getItem('webxr-uid') || 'default';
  if (uidParam) localStorage.setItem('webxr-uid', uidParam);

  const cfg = { uid, hoverScale: 1.15, hoverColor: '#ffffff', hudTheme: 'dark' };
  try {
    const res = await fetch(`/users/${encodeURIComponent(uid)}.js`);
    if (res.ok) {
      const text = await res.text();
      if (text.trim().startsWith('{')) {
        Object.assign(cfg, JSON.parse(text));
      } else {
        const blobUrl = URL.createObjectURL(new Blob([text], { type: 'text/javascript' }));
        try {
          const mod = await import(blobUrl);
          Object.assign(cfg, mod.default || {});
        } finally {
          URL.revokeObjectURL(blobUrl);
        }
      }
    }
  } catch {}
  for (const k of NUMERIC_KEYS) if (params.get(k) !== null) cfg[k] = parseFloat(params.get(k));
  for (const k of STRING_KEYS) if (params.get(k) !== null) cfg[k] = params.get(k);
  return cfg;
}