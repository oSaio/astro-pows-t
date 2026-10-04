// Pure, deterministic interpreter. Every run is bounded by a step budget, so nothing can loop forever.
export const DIRS = [[0,1],[1,0],[0,-1],[-1,0]]; // E S W N
export const count = (l = []) => l.reduce((n, b) => n + 1 + count(b.body) + count(b.then) + count(b.else), 0);
const types = (l = [], s = new Set()) => { l.forEach(b => { s.add(b.t); types(b.body, s); types(b.then, s); types(b.else, s); }); return s; };

export function simulate(lv, prog) {
  const g = lv.grid.map(r => r.split(''));
  let r = 0, c = 0, d = 0, key = false, coll = 0, bonus = 0, budget = 3000, end = false, won = false, fail = null;
  g.forEach((row, i) => row.forEach((ch, j) => { if (ch === 'S') { r = i; c = j; g[i][j] = '.'; } }));
  const need = g.flat().filter(x => x === 'C' || x === 'B').length;
  const steps = [];
  const snap = () => steps.push({ r, c, d, key, g: g.map(x => x.join('')) });
  const at = (a, b) => g[a]?.[b];
  const blocked = ch => ch === undefined || ch === '#' || ch === 'R' || (ch === 'D' && !key);
  const stop = why => { fail = why; end = true; };
  const move = k => {
    const nr = r + DIRS[d][0] * k, nc = c + DIRS[d][1] * k, ch = at(nr, nc);
    if (blocked(ch)) return stop('crash');
    r = nr; c = nc;
    if (ch === 'P') { bonus++; g[r][c] = '.'; }
    snap();
    if (ch === 'G' && coll >= need) { won = true; end = true; }
  };
  const cond = k => k === 'red' ? at(r + DIRS[d][0], c + DIRS[d][1]) === 'R'
    : k === 'wall' ? ['#', undefined].includes(at(r + DIRS[d][0], c + DIRS[d][1]))
    : ['C', 'B', 'K'].includes(g[r][c]);
  const exec = list => {
    for (const b of list) {
      if (end) return;
      if (--budget < 0) return stop('loop');
      if (b.t === 'move') move(1);
      else if (b.t === 'jump') move(2);
      else if (b.t === 'left' || b.t === 'right') { d = (d + (b.t === 'right' ? 1 : 3)) % 4; snap(); }
      else if (b.t === 'collect') {
        const ch = g[r][c];
        if (ch === 'K') key = true; else if (ch === 'C' || ch === 'B') coll++;
        if (['K', 'C', 'B'].includes(ch)) g[r][c] = '.';
        snap();
      }
      else if (b.t === 'repeat') for (let i = 0; i < b.n && !end; i++) exec(b.body);
      else if (b.t === 'until') while (!end) { if (--budget < 0) return stop('loop'); exec(b.body); }
      else if (b.t === 'if') exec(cond(lv.cond) ? b.then : b.else);
      else if (b.t === 'call') exec(prog.fn);
    }
  };
  snap();
  exec(prog.main);
  if (!won && !fail) fail = coll < need && g[r][c] === 'G' ? 'items' : 'short';
  return { steps, won, fail, bonus };
}

const clean = (l, lv, depth = 0) => {
  if (!Array.isArray(l) || depth > 4 || l.length > 30) throw new Error('bad program');
  return l.map(b => {
    if (!b || !lv.palette.includes(b.t)) throw new Error('bad block');
    const o = { t: b.t };
    if (b.t === 'repeat') o.n = Math.min(20, Math.max(1, Number(b.n) | 0));
    if (b.t === 'repeat' || b.t === 'until') o.body = clean(b.body, lv, depth + 1);
    if (b.t === 'if') { o.then = clean(b.then, lv, depth + 1); o.else = clean(b.else, lv, depth + 1); }
    return o;
  });
};

const MSG = { crash: 'Bonk! Captain Pixel hit a wall, a closed gate, or a hot tile.', loop: 'Too many steps. Is a loop running forever?',
  short: 'The program ended before reaching the portal.', items: 'Reached the portal, but some items were left behind.' };

export function grade(lv, raw) {
  let prog;
  try { prog = { main: clean(raw?.main, lv), fn: clean(raw?.fn ?? [], lv) }; } catch { return { ok: false, msg: 'That program is not valid.', steps: [] }; }
  const used = count(prog.main) + count(prog.fn);
  const sim = simulate(lv, prog);
  const t = new Set([...types(prog.main), ...types(prog.fn)]);
  const missing = (lv.req || []).filter(x => !t.has(x));
  const stars = used <= lv.ideal ? 3 : used <= Math.ceil((lv.ideal + lv.lim) / 2) ? 2 : 1;
  let ok = false, msg = MSG[sim.fail];
  if (used > lv.lim) msg = `Too many blocks: ${used} used, limit is ${lv.lim}.`;
  else if (sim.won && missing.length) msg = `Portal reached, but this mission wants you to use: ${missing.join(', ')}.`;
  else if (sim.won) { ok = true; msg = 'Mission complete!'; }
  return { ok, msg, stars: ok ? stars : 0, used, steps: sim.steps };
}
