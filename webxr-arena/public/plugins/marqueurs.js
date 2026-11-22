export function activate(ctx) {
    const { THREE, scene, renderer, camera, send } = ctx;
  
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(19, 19),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
  
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2(-10, -10);
    ctx._markers = new Map();
  
    function place(p, color, key) {
      let m = ctx._markers.get(key);
      if (!m) {
        m = new THREE.Mesh(
          new THREE.SphereGeometry(0.08, 16, 12),
          new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.3 })
        );
        scene.add(m);
        ctx._markers.set(key, m);
      }
      m.position.set(p[0], Math.max(0.08, p[1] || 0.08), p[2]);
      m.material.color.set(color);
      m.material.emissive.set(color);
    }
    ctx._placeMarker = place;
  
    function dropMarker(p) {
      const key = ctx.getMyId() || 'moi';
      place(p, ctx.getMyColor() || '#ffffff', key);
      send({ type: 'app', data: { kind: 'marker', key, from: key, p } });
    }
  
    addEventListener('pointermove', (e) => {
      ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    });
    renderer.domElement.addEventListener('pointerdown', () => {
      if (renderer.xr.isPresenting) return;
      ray.setFromCamera(ndc, camera);
      const g = ray.intersectObject(ground);
      if (g.length && Math.abs(g[0].point.x) <= 9.5 && Math.abs(g[0].point.z) <= 9.5) {
        dropMarker([g[0].point.x, 0.08, g[0].point.z]);
      }
    });
  }
  
  export function onFrame(dt, ctx) {
    const s = ctx.getSession && ctx.getSession();
    if (s && !ctx._markerHook) {
      ctx._markerHook = true;
      s.addEventListener('squeezestart', (e) => {
        const src = e.source;
        if (src && src._teleport) {
          const p = [src._teleport.x, 0.08, src._teleport.z];
          const key = ctx.getMyId() || 'moi';
          ctx._placeMarker(p, ctx.getMyColor() || '#ffffff', key);
          ctx.send({ type: 'app', data: { kind: 'marker', key, from: key, p } });
        }
      });
    }
  }
  
  export function onMessage(msg, ctx) {
    if (msg.type === 'app' && msg.data?.kind === 'marker' && msg.from !== ctx.getMyId()) {
      if (ctx._placeMarker) ctx._placeMarker(msg.data.p, msg.color, msg.data.key);
    }
    if (msg.type === 'leave' && ctx._markers) {
      const m = ctx._markers.get(msg.id);
      if (m) { ctx.scene.remove(m); ctx._markers.delete(msg.id); }
    }
  }