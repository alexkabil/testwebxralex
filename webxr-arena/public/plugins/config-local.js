export function activate(ctx) {
    const body = ctx.addPanel('Ma config');
    const uid = ctx.userConfig.uid || 'default';
    body.innerHTML = `
      <div>uid : <b>${uid}</b> (<code>?uid=${uid}</code>)</div>
      <textarea rows="5" style="width:100%;margin-top:4px;font-size:11px;background:#0b1020;color:#e8ecf8;border:1px solid #2a3358;"></textarea>
      <input type="file" accept=".js,.json" style="margin-top:4px;font-size:11px;max-width:100%;">
      <div style="margin-top:4px;display:flex;gap:4px;flex-wrap:wrap;">
        <button data-a="apply">Appliquer</button>
        <button data-a="local">localStorage</button>
        <button data-a="upload">Envoyer au serveur</button>
      </div>
      <div class="status" style="color:#67e8f9;margin-top:2px;"></div>`;
    const ta = body.querySelector('textarea');
    const file = body.querySelector('input[type=file]');
    const status = body.querySelector('.status');
    const show = () => { ta.value = JSON.stringify(ctx.userConfig, null, 1); };
    show();
  
    async function readConfig(text) {
      if (text.trim().startsWith('{')) return JSON.parse(text);
      const url = URL.createObjectURL(new Blob([text], { type: 'text/javascript' }));
      try {
        const mod = await import(url);
        return mod.default || {};
      } finally {
        URL.revokeObjectURL(url);
      }
    }
  
    async function apply(text) {
      const cfg = await readConfig(text);
      Object.assign(ctx.userConfig, cfg);
      status.textContent = 'config appliquée (survol/HUD mis à jour)';
      show();
    }
  
    file.addEventListener('change', async () => {
      if (file.files[0]) {
        try { await apply(await file.files[0].text()); }
        catch (e) { status.textContent = 'erreur fichier : ' + e.message; }
      }
    });
    body.querySelector('[data-a=apply]').addEventListener('click', () =>
      apply(ta.value).catch((e) => { status.textContent = 'erreur : ' + e.message; }));
    body.querySelector('[data-a=local]').addEventListener('click', () => {
      localStorage.setItem('webxr-config-' + uid, ta.value);
      status.textContent = 'sauvegardé dans localStorage (persistant sur ce navigateur)';
    });
    body.querySelector('[data-a=upload]').addEventListener('click', async () => {
      try {
        const r = await fetch('/users/upload?uid=' + encodeURIComponent(uid), { method: 'POST', body: ta.value });
        const j = await r.json();
        status.textContent = r.ok ? `envoyé au serveur → ${j.file} (chargé au prochain rechargement avec ?uid=${uid})` : 'erreur : ' + JSON.stringify(j);
      } catch (e) {
        status.textContent = 'erreur upload : ' + e.message;
      }
    });
  
    const saved = localStorage.getItem('webxr-config-' + uid);
    if (saved) apply(saved).catch(() => {});
  }