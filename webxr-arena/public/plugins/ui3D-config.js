const W = 1024, H = 640;

export function activate(ctx) {
  const { THREE, scene, renderer, camera } = ctx;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);

  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(1.28, 0.8),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide })
  );
  panel.position.set(0, 1.7, -3.4);
  panel.userData.isUiPanel = true;
  scene.add(panel);

  const buttons = [];
  let hoverId = null;
  let statusMsg = '';
  const addBtn = (id, label, x, y, w, h, action) => buttons.push({ id, label, x, y, w, h, action });

  addBtn('theme', 'Thème sombre/clair', 40, 100, 300, 60, () => {
    ctx.userConfig.hudTheme = ctx.userConfig.hudTheme === 'light' ? 'dark' : 'light';
    statusMsg = 'hudTheme = ' + ctx.userConfig.hudTheme;
  });
  addBtn('s115', 'Survol ×1.15', 360, 100, 210, 60, () => { ctx.userConfig.hoverScale = 1.15; statusMsg = 'hoverScale = 1.15'; });
  addBtn('s14', 'Survol ×1.4', 590, 100, 210, 60, () => { ctx.userConfig.hoverScale = 1.4; statusMsg = 'hoverScale = 1.4'; });
  addBtn('s18', 'Survol ×1.8', 820, 100, 170, 60, () => { ctx.userConfig.hoverScale = 1.8; statusMsg = 'hoverScale = 1.8'; });
  const COLORS = ['#ffffff', '#00ff88', '#ff4081', '#40c4ff'];
  let ci = 0;
  addBtn('color', 'Couleur de survol', 40, 180, 300, 60, () => {
    ci = (ci + 1) % COLORS.length;
    ctx.userConfig.hoverColor = COLORS[ci];
    statusMsg = 'hoverColor = ' + COLORS[ci];
  });
  addBtn('upload', 'Envoyer au serveur (users/<uid>.js)', 40, 260, 560, 70, async () => {
    statusMsg = 'envoi…';
    draw();
    try {
      const body = 'export default ' + JSON.stringify(ctx.userConfig) + ';\n';
      const r = await fetch('/users/upload?uid=' + encodeURIComponent(ctx.userConfig.uid || 'default'), { method: 'POST', body });
      statusMsg = r.ok ? 'config envoyée au serveur (uid=' + (ctx.userConfig.uid || 'default') + ')' : 'erreur HTTP ' + r.status;
    } catch (e) {
      statusMsg = 'erreur: ' + e.message;
    }
  });
  addBtn('reload', 'Recharger la page', 620, 260, 370, 70, () => location.reload());

  function draw() {
    g.fillStyle = 'rgba(10,14,30,0.94)';
    g.fillRect(0, 0, W, H);
    g.strokeStyle = '#2a3358';
    g.lineWidth = 4;
    g.strokeRect(2, 2, W - 4, H - 4);
    g.fillStyle = '#e8ecf8';
    g.font = 'bold 34px sans-serif';
    g.textAlign = 'left';
    g.textBaseline = 'alphabetic';
    g.fillText('Config 3D — uid=' + (ctx.userConfig.uid || 'default'), 40, 58);
    for (const b of buttons) {
      g.fillStyle = hoverId === b.id ? '#2979ff' : '#1a2340';
      g.beginPath();
      g.roundRect(b.x, b.y, b.w, b.h, 10);
      g.fill();
      g.strokeStyle = '#3d5afe';
      g.lineWidth = 2;
      g.stroke();
      g.fillStyle = '#ffffff';
      g.font = '22px sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2);
    }
    g.textAlign = 'left';
    g.textBaseline = 'alphabetic';
    g.fillStyle = '#9fb0e8';
    g.font = '20px monospace';
    const cfg = JSON.stringify(ctx.userConfig);
    g.fillText(cfg.slice(0, 92), 40, 400);
    g.fillText(cfg.slice(92, 184), 40, 428);
    g.fillStyle = '#67e8f9';
    g.fillText(statusMsg, 40, 480);
    g.fillStyle = '#ffd740';
    g.font = '18px sans-serif';
    g.fillText("Astuce : ouvrez l'URL avec ?uid=alice pour charger users/alice.js", 40, 612);
    tex.needsUpdate = true;
  }
  ctx._drawUi3d = draw;
  draw();

  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2(-10, -10);
  const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _d = new THREE.Vector3();

  function buttonAtUV(uv) {
    if (!uv) return null;
    const x = uv.x * W;
    const y = (1 - uv.y) * H;
    return buttons.find((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) || null;
  }

  function pickMouse() {
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObject(panel)[0];
    return hit ? buttonAtUV(hit.uv) : null;
  }

  function pickSrc(src) {
    const rs = ctx.getRefSpace && ctx.getRefSpace();
    if (!src.targetRaySpace || typeof src.targetRaySpace.getPose !== 'function' || !rs) return null;
    try {
      const pose = src.targetRaySpace.getPose(rs);
      if (!pose) return null;
      _m.fromArray(pose.transform.matrix);
      _m.decompose(_p, _q, _s);
      _d.set(0, 0, -1).applyQuaternion(_q);
      ray.set(_p, _d);
      const hit = ray.intersectObject(panel)[0];
      return hit ? buttonAtUV(hit.uv) : null;
    } catch {
      return null;
    }
  }

  addEventListener('pointermove', (e) => {
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  });
  renderer.domElement.addEventListener('pointermove', () => {
    if (renderer.xr.isPresenting) return;
    const b = pickMouse();
    const id = b ? b.id : null;
    if (id !== hoverId) { hoverId = id; draw(); }
  });
  renderer.domElement.addEventListener('pointerdown', () => {
    if (renderer.xr.isPresenting) return;
    const b = pickMouse();
    if (b) { statusMsg = b.label + '…'; draw(); b.action(); draw(); }
  });

  ctx._ui3dPickSrc = pickSrc;
  ctx._ui3dHover = (id) => { if (id !== hoverId) { hoverId = id; draw(); } };
}

export function onFrame(dt, ctx) {
  const s = ctx.getSession && ctx.getSession();
  if (!s || !ctx._ui3dPickSrc) return;
  if (!ctx._ui3dHook) {
    ctx._ui3dHook = true;
    s.addEventListener('selectstart', (e) => {
      const b = ctx._ui3dPickSrc(e.source);
      if (b) {
        b.action();
        if (ctx._drawUi3d) ctx._drawUi3d();
      }
    });
  }
  for (const src of s.inputSources) {
    const b = ctx._ui3dPickSrc(src);
    ctx._ui3dHover(b ? b.id : null);
  }
}