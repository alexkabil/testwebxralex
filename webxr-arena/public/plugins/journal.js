export function activate(ctx) {
    const body = ctx.addPanel('Journal');
    const lines = [];
    const push = (t) => {
      lines.push(t);
      body.innerHTML = lines.slice(-10).join('<br>');
    };
    ctx._push = push;
    push(`${new Date().toLocaleTimeString()} — connecté (${ctx.getMyId() || '…'})`);
  }
  
  export function onMessage(msg, ctx) {
    if (!ctx._push) return;
    const h = new Date().toLocaleTimeString();
    if (msg.type === 'join') ctx._push(`${h} — ${msg.id} (${msg.color}) a rejoint`);
    if (msg.type === 'leave') ctx._push(`${h} — ${msg.id} a quitté`);
    if (msg.type === 'object' && msg.owner) ctx._push(`${h} — ${msg.owner.id} a sélectionné ${msg.id}`);
    if (msg.type === 'object' && !msg.owner) ctx._push(`${h} — ${msg.id} désélectionné`);
  }