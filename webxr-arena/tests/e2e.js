'use strict';
// Test de bout en bout : 2 joueurs + 1 moniteur sur ws://localhost:8080/ws
const WebSocket = require('ws');

const fail = (m) => { console.error('ECHEC:', m); process.exit(1); };

const monitor = new WebSocket('ws://localhost:8080/ws?role=monitor');
const p1 = new WebSocket('ws://localhost:8080/ws?role=player');
const p2 = new WebSocket('ws://localhost:8080/ws?role=player');

let welcome1 = null, welcome2 = null, welcomeM = null;
let gotPlayerOnP2 = null, gotPlayerOnM = null, gotLeaveOnP2 = null;

monitor.on('message', (d) => {
  const m = JSON.parse(d);
  if (m.type === 'welcome') welcomeM = m;
  if (m.type === 'player' && m.id === welcome1?.id) gotPlayerOnM = m;
});
p1.on('message', (d) => { const m = JSON.parse(d); if (m.type === 'welcome') welcome1 = m; });
p2.on('message', (d) => {
  const m = JSON.parse(d);
  if (m.type === 'welcome') welcome2 = m;
  if (m.type === 'player' && m.id === welcome1?.id) gotPlayerOnP2 = m;
  if (m.type === 'leave' && m.id === welcome1?.id) gotLeaveOnP2 = m;
});

setTimeout(() => {
  if (!welcome1 || !welcome2 || !welcomeM) fail('welcome manquant');
  if (welcome1.id === welcome2.id) fail('ids identiques: ' + welcome1.id);
  if (welcome1.color === welcome2.color) fail('couleurs identiques: ' + welcome1.color);
  console.log('OK ids distincts:', welcome1.id, welcome1.color, '/', welcome2.id, welcome2.color);
  console.log('OK p2 voit p1 dans welcome.players:', welcome2.players.some((p) => p.id === welcome1.id));

  p1.send(JSON.stringify({
    type: 'state',
    head: { p: [0.5, 1.6, -1.2], q: [0, 0.7071, 0, 0.7071] },
    controllers: [
      { hand: 'left', p: [-0.3, 1.1, -0.4], q: [0, 0, 0, 1] },
      { hand: 'right', p: [0.3, 1.1, -0.4], q: [0, 0, 0, 1] }
    ]
  }));
}, 300);

setTimeout(() => {
  if (!gotPlayerOnP2) fail('p2 n a pas reçu l état de p1');
  if (!gotPlayerOnM) fail('le moniteur n a pas reçu l état de p1');
  if (gotPlayerOnP2.head.p[1] !== 1.6) fail('pose tête incorrecte');
  if (gotPlayerOnP2.controllers.length !== 2) fail('contrôleurs manquants');
  console.log('OK état relayé à p2:', JSON.stringify(gotPlayerOnP2.head.p), gotPlayerOnP2.controllers.length, 'contrôleurs');
  console.log('OK état relayé au moniteur:', JSON.stringify(gotPlayerOnM.head.p));
  p1.close();
}, 800);

setTimeout(async () => {
  if (!gotLeaveOnP2) fail('p2 n a pas reçu leave');
  console.log('OK leave reçu par p2:', gotLeaveOnP2.id);
  const api = await fetch('http://localhost:8080/api/players').then((r) => r.json());
  if (!api.players.some((p) => p.id === welcome2.id)) fail('api/players ne contient pas p2');
  console.log('OK /api/players:', api.players.map((p) => p.id).join(', '));
  console.log('\nTOUS LES TESTS PASSENT');
  process.exit(0);
}, 1500);