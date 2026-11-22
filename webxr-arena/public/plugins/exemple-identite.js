export function activate(ctx) {
    const body = ctx.addPanel('Identité');
    const rows = {};
    const set = (k, v) => {
      rows[k] = v;
      body.innerHTML = Object.entries(rows).map(([a, b]) => `${a} : ${b}`).join('<br>');
    };
    ctx._set = set;
    set('uid', ctx.userConfig.uid);
    set('id', ctx.getMyId() || '…');
    set('couleur', ctx.getMyColor() || '…');
    set('rejoint à', new Date().toLocaleTimeString());
    set('joueurs', ctx.remotes.size + 1);
    set('ping', '…');
    setInterval(() => {
      ctx._pingT = performance.now();
      ctx.send({ type: 'ping' });
    }, 2000);
  }
  
  export function onMessage(msg, ctx) {
    if (!ctx._set) return;
    if (msg.type === 'pong' && ctx._pingT) ctx._set('ping', `${Math.round(performance.now() - ctx._pingT)} ms`);
    if (msg.type === 'welcome') {
      ctx._set('id', msg.id);
      ctx._set('couleur', msg.color);
      ctx._set('joueurs', msg.players.length + 1);
    }
    if (msg.type === 'join' || msg.type === 'leave') ctx._set('joueurs', ctx.remotes.size + 1);
  }