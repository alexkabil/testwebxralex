export function activate(ctx) {
    const logs = [];
    window.__logs = logs;
    const push = (t) => {
      logs.push(`${new Date().toLocaleTimeString()} ${t}`);
      if (logs.length > 60) logs.shift();
      console.log('[debug]', t);
      if (ctx._debugBody) ctx._debugBody.innerHTML = logs.slice(-12).join('<br>');
    };
    window.__pushDebug = push;
    window.addEventListener('error', (e) => push('ERREUR: ' + e.message + ' @' + String(e.filename || '').split('/').pop() + ':' + e.lineno));
    window.addEventListener('unhandledrejection', (e) => push('PROMISE REJETÉE: ' + ((e.reason && e.reason.message) || e.reason)));
    ctx._debugBody = ctx.addPanel('Debug');
    push('debug actif (uid=' + (ctx.userConfig.uid || 'default') + ', WebXR=' + ('xr' in navigator) + ')');
    ctx._lastSession = ctx.getSession ? ctx.getSession() : null;
  }
  
  export function onFrame(dt, ctx) {
    if (!ctx.getSession) return;
    const s = ctx.getSession();
    if (s !== ctx._lastSession) {
      ctx._lastSession = s;
      if (s) {
        window.__pushDebug('session immersive-vr démarrée');
        s.addEventListener('end', () => window.__pushDebug('session terminée (end)'));
        s.addEventListener('visibilitychange', () => window.__pushDebug('visibilité: ' + s.visibilityState));
      } else {
        window.__pushDebug('session quittée');
      }
    }
  }