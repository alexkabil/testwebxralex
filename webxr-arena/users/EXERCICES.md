# Exercices — personnalisation client sans modifier le serveur

Le serveur ne fait que relayer : toute la personnalisation se fait **côté client**, en ajoutant
ou modifiant des fichiers servis statiquement (aucun redémarrage du serveur nécessaire, un
simple rechargement de page suffit — sauf si vous touchez `server.js`).

## Mécanismes disponibles

| Mécanisme | Fichier | Portée |
|---|---|---|
| Plugins | `public/plugins/<nom>.js` + ligne dans `public/plugins/plugins.json` | tous les clients |
| Config utilisateur | `users/<uid>.js` + ouverture avec `?uid=<uid>` | un casque / un navigateur (mémorisé en localStorage) |
| Messages personnalisés | relais générique `app` : envoyer `{type:'app', data:{...}}`, reçu par les autres sous `{type:'app', from, color, data}` | tous les joueurs |

### API des plugins

Un plugin est un module ES exportant éventuellement :

- `activate(ctx)` — appelé au chargement. `ctx` contient : `THREE, scene, renderer, camera, dolly,
  send(msg), getMyId(), getMyColor(), remotes, interactives, userConfig, addPanel(titre)`
  (`addPanel` crée un panneau dans le HUD et renvoie son élément de contenu).
- `onMessage(msg, ctx)` — appelé pour **chaque** message WebSocket reçu (`welcome`, `join`,
  `leave`, `player`, `object`, `app`, `pong`…).
- `onFrame(dt, ctx)` — appelé à chaque image.

### Config utilisateur (`users/<uid>.js`)

```js
export default { hoverScale: 1.3, hoverColor: '#00ff88', hudTheme: 'dark' };