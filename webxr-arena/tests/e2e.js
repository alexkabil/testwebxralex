'use strict';
// Test de bout en bout : 2 joueurs + 1 moniteur + objets interactifs sur ws://localhost:8080/ws
const WebSocket = require('ws');

const fail = (m) => { console.error('ECHEC:', m); process.exit(1); };

const monitor = new WebSocket('ws://localhost:8080/ws?role=monitor');
const p1 = new WebSocket('ws://localhost:8080/ws?role=player');
const p2 = new WebSocket('ws://localhost:8080/ws?role=player');

let welcome1 = null, welcome2 = null, welcomeM = null;
let gotPlayerOnP2 = null, gotPlayerOnM = null, gotLeaveOnP2 = null;
let gotSelectOnP2 = null, gotSelectOnM = null, gotHoverOnP2 = null, gotUnhoverOnP2 = null, gotReleaseOnP2 = null;
let gotSelect3OnP2 = null, gotDeselectOnP2 = null;

monitor.on('message', (d) => {
  const m = JSON.parse(d);
  if (m.type === 'welcome') welcomeM = m;
  if (m.type === 'player' && m.id === welcome1?.id) gotPlayerOnM = m;
  if (m.type === 'object' && m.id === 'obj1' && m.owner && m.owner.id === welcome1?.id) gotSelectOnM = m;
});
p1.on('message', (d) => { const m = JSON.parse(d); if (m.type === 'welcome') welcome1 = m; });
p2.on('message', (d) => {
  const m = JSON.parse(d);
  if (m.type === 'welcome') welcome2 = m;
  if (m.type === 'player' && m.id === welcome1?.id) gotPlayerOnP2 = m;
  if (m.type === 'leave' && m.id === welcome1?.id) gotLeaveOnP2 = m;
  if (m.type === 'object') {
    if (m.id === 'obj1' && m.owner && m.owner.id === welcome1?.id) gotSelectOnP2 = m;
    if (m.id === 'obj1' && m.owner === null && gotSelectOnP2) gotReleaseOnP2 = m;
    if (m.id === 'obj2' && m.hoveredBy.includes(welcome1?.id)) gotHoverOnP2 = m;
    if (m.id === 'obj2' && !m.hoveredBy.includes(welcome1?.id) && gotHoverOnP2) gotUnhoverOnP2 = m;
    if (m.id === 'obj3' && m.owner && m.owner.id === welcome1?.id) gotSelect3OnP2 = m;
    if (m.id === 'obj3' && m.owner === null && gotSelect3OnP2) gotDeselectOnP2 = m;
  }
});

setTimeout(() => {
  if (!welcome1 || !welcome2 || !welcomeM) fail('welcome manquant');
  if (welcome1.id === welcome2.id) fail('ids identiques: ' + welcome1.id);
  if (welcome1.color === welcome2.color) fail('couleurs identiques: ' + welcome1.color);
  console.log('OK ids distincts:', welcome1.id, welcome1.color, '/', welcome2.id, welcome2.color);
  console.log('OK p2 voit p1 dans welcome.players:', welcome2.players.some((p) => p.id === welcome1.id));
  if (!Array.isArray(welcome1.objects) || welcome1.objects.length !== 5) fail('welcome.objects incorrect: ' + JSON.stringify(welcome1.objects));
  console.log('OK welcome contient les 5 objets interactifs');
  if (!Array.isArray(welcomeM.objects) || welcomeM.objects.length !== 5) fail('welcome moniteur sans objets');

  p1.send(JSON.stringify({
    type: 'state',
    head: { p: [0.5, 1.6, -1.2], q: [0, 0.7071, 0, 0.7071] },
    controllers: [
      { hand: 'left', p: [-0.3, 1.1, -0.4], q: [0, 0, 0, 1] },
      { hand: 'right', p: [0.3, 1.1, -0.4], q: [0, 0, 0, 1] }
    ]
  }));
  p1.send(JSON.stringify({ type: 'select', objectId: 'obj1' }));
  p1.send(JSON.stringify({ type: 'hover', objectId: 'obj2' }));
  p1.send(JSON.stringify({ type: 'select', objectId: 'obj3' }));
}, 300);

setTimeout(() => {
  if (!gotPlayerOnP2) fail('p2 n a pas reçu l état de p1');
  if (!gotPlayerOnM) fail('le moniteur n a pas reçu l état de p1');
  if (gotPlayerOnP2.head.p[1] !== 1.6) fail('pose tête incorrecte');
  if (gotPlayerOnP2.controllers.length !== 2) fail('contrôleurs manquants');
  console.log('OK état relayé à p2:', JSON.stringify(gotPlayerOnP2.head.p), gotPlayerOnP2.controllers.length, 'contrôleurs');
  console.log('OK état relayé au moniteur:', JSON.stringify(gotPlayerOnM.head.p));
  if (!gotSelectOnP2) fail('p2 n a pas reçu le select de obj1');
  if (gotSelectOnP2.owner.color !== welcome1.color) fail('couleur propriétaire incorrecte');
  console.log('OK select obj1 relayé à p2, propriétaire:', gotSelectOnP2.owner.id, gotSelectOnP2.owner.color);
  if (!gotSelectOnM) fail('moniteur n a pas reçu le select');
  console.log('OK select relayé au moniteur');
  if (!gotHoverOnP2) fail('p2 n a pas reçu le hover de obj2');
  console.log('OK hover obj2 relayé à p2, hoveredBy:', JSON.stringify(gotHoverOnP2.hoveredBy));
  p1.send(JSON.stringify({ type: 'hover', objectId: null }));
  p1.send(JSON.stringify({ type: 'select', objectId: 'obj3' })); // re-clic = désélection
}, 800);

setTimeout(() => {
  if (!gotUnhoverOnP2) fail('p2 n a pas reçu la fin de hover');
  if (!gotDeselectOnP2) fail('p2 n a pas reçu la désélection de obj3');
  console.log('OK re-clic sur obj3 = désélection (owner = null) relayée à p2');
  console.log('OK fin de hover relayée (hoveredBy vide)');
  p1.close();
}, 1100);

setTimeout(async () => {
  if (!gotLeaveOnP2) fail('p2 n a pas reçu leave');
  console.log('OK leave reçu par p2:', gotLeaveOnP2.id);
  if (!gotReleaseOnP2) fail('objet obj1 non libéré après déconnexion de p1');
  console.log('OK obj1 libéré automatiquement (owner = null)');
  const api = await fetch('http://localhost:8080/api/players').then((r) => r.json());
  if (!api.players.some((p) => p.id === welcome2.id)) fail('api/players ne contient pas p2');
  console.log('OK /api/players:', api.players.map((p) => p.id).join(', '));
  console.log('\nTOUS LES TESTS PASSENT');
  process.exit(0);
}, 1800);