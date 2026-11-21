import * as THREE from 'three';

const _v = new THREE.Vector3();
const _q = new THREE.Quaternion();

export function makeAvatar(color, id) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.15 });

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 24, 16), mat);

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.62, 6, 16), mat);
  body.position.y = -0.62;

  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.07, 0.06),
    new THREE.MeshStandardMaterial({ color: '#111111', roughness: 0.2 })
  );
  visor.position.set(0, 0.02, -0.11);

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath();
  ctx.roundRect(4, 4, 248, 56, 12);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(id, 128, 34);
  const label = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), depthTest: false })
  );
  label.scale.set(0.5, 0.125, 1);
  label.position.y = 0.32;

  group.add(head, body, visor, label);
  return { group, head };
}

export function makeHand(color) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 16, 12),
    new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.2, emissive: color, emissiveIntensity: 0.25 })
  );
}

export function lerpPose(obj, p, q, k) {
  _v.set(p[0], p[1], p[2]);
  _q.set(q[0], q[1], q[2], q[3]);
  obj.position.lerp(_v, k);
  obj.quaternion.slerp(_q, k);
}