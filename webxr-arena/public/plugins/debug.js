export function activate(ctx) {
    const logs = [];
    window.__logs = logs;
    const push = (t) => {
      logs.push(`${new Date().toLocaleTimeString()} ${t}`);
      if (logs.length > 200) logs.shift();
      console.log('[debug]', t);
      if (ctx._debugBody) ctx._debugBody.innerHTML = logs.slice(-18).join('<br>');
    };
    window.__pushDebug = push;
    window.addEventListener('error', (e) => push('ERREUR: ' + e.message + ' @' + String(e.filename || '').split('/').pop() + ':' + e.lineno));
    window.addEventListener('unhandledrejection', (e) => push('PROMISE REJETÉE: ' + ((e.reason && e.reason.message) || e.reason)));
    ctx._debugBody = ctx.addPanel('Debug');
    push('debug actif (uid=' + (ctx.userConfig.uid || 'default') + ', WebXR=' + ('xr' in navigator) + ')');
    ctx._lastSession = null;
    ctx._lastPresenting = false;
    ctx._frames = 0;
  }
  
  export function onFrame(dt, ctx) {
    if (!ctx.getSession) return;
    const s = ctx.getSession();
    if (s !== ctx._lastSession) {
      ctx._lastSession = s;
      if (s) {
        window.__pushDebug('session immersive-vr démarrée');
        s.addEventListener('end', () => {
          window.__pushDebug('session terminée (end)');
          if (ctx._testSphere) { ctx.scene.remove(ctx._testSphere); ctx._testSphere = null; }
        });
        s.addEventListener('visibilitychange', () => window.__pushDebug('visibilité: ' + s.visibilityState));
        if (!ctx._testSphere) {
          const m = new ctx.THREE.Mesh(
            new ctx.THREE.SphereGeometry(0.3, 24, 16),
            new ctx.THREE.MeshBasicMaterial({ color: 0x00ff00 })
          );
          m.position.set(0, 1.6, -2);
          ctx.scene.add(m);
          ctx._testSphere = m;
          window.__pushDebug('sphère test VERTE ajoutée en (0,1.6,-2)');
        }
        const dumpInputs = () => {
          const info0 = [...s.inputSources].map((x) =>
            `${x.handedness || '?'}:${x.targetRaySpace ? 'trs' : '-'}${x.gripSpace ? '+grip' : ''}${x.gamepad ? '+gp' : ''}`).join(' ');
          window.__pushDebug(`inputs[${s.inputSources.length}]: ${info0 || '(aucun)'}`);
        };
        dumpInputs();
        s.addEventListener('inputsourceschange', dumpInputs);
      } else {
        window.__pushDebug('session quittée');
      }
    }
    ctx._frames++;
    const pres = ctx.renderer.xr.isPresenting;
    if (pres !== ctx._lastPresenting) {
      ctx._lastPresenting = pres;
      window.__pushDebug('presenting=' + pres);
    }
    if (s && ctx._frames % 300 === 0) {
      const info = [...s.inputSources].map((x) =>
        `${x.handedness || '?'}:${x.targetRaySpace ? 'trs' : '-'}${x.gripSpace ? '+grip' : ''}${x.gamepad ? '+gp' : ''}`).join(' ');
      window.__pushDebug(`inputs[${s.inputSources.length}]: ${info || '(aucun)'}`);
    }
    if (ctx._frames % 600 === 0) {
      window.__pushDebug(`rendu: ${ctx.renderer.info.render.calls} appels dessin/frame, presenting=${pres}`);
    }
  }