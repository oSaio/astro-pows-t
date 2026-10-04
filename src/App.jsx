import React, { useEffect, useState } from 'react';
import { LEVELS, SECTIONS, LABEL, COND, MAX_CREDITS, ITEMS } from './levels.js';
import { grade, simulate } from './engine.js';
import { api, setTok } from './api.js';
import { Pixel, Shop, Special, BadgeModal, sfx, isMuted, toggleMute } from './extras.jsx';

const ARROW = ['→', '↓', '←', '↑'];
const TILE = { '#': '🪨', G: '🌀', C: '💎', B: '🔋', K: '🔑', D: '🚧', P: '💾', R: '🔥' };
const stars = n => '★'.repeat(n || 0) + '☆'.repeat(3 - (n || 0));
const getList = (p, path) => path.reduce((o, k) => o[k], p);
const mk = t => ({ t, ...(t === 'repeat' && { n: 2, body: [] }), ...(t === 'until' && { body: [] }), ...(t === 'if' && { then: [], else: [] }) });
const Btn = ({ c = 'bg-cyan-400 text-slate-950', ...p }) => <button {...p} className={`rounded-lg px-3 py-2 font-bold disabled:opacity-40 ${c} ${p.className || ''}`} />;

function Auth({ onAuth }) {
  const [mode, setMode] = useState('login'), [u, setU] = useState(''), [p, setP] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const submit = async e => {
    e.preventDefault(); setErr('');
    if (mode === 'signup' && !/^[A-Za-z0-9_]{3,20}$/.test(u)) return setErr('Username: 3-20 letters, numbers or underscores.');
    if (mode === 'signup' && p.length < 8) return setErr('Password needs at least 8 characters.');
    setBusy(true);
    try { onAuth(await api('/auth/' + mode, { username: u, password: p })); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <main className="min-h-screen grid place-items-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-cyan-400/40 bg-slate-950/80 p-6 shadow-[0_0_40px_#00f0ff33] space-y-4">
        <div className="text-center"><Pixel size={96} />
          <h1 className="text-2xl font-black text-cyan-300">Astro-Paws</h1>
          <p className="text-fuchsia-400">Captain Pixel's Code Odyssey</p></div>
        <label className="block">Username<input value={u} onChange={e => setU(e.target.value)} autoComplete="username" className="mt-1 w-full rounded bg-slate-900 border border-slate-600 p-2" /></label>
        <label className="block">Password<input type="password" value={p} onChange={e => setP(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} className="mt-1 w-full rounded bg-slate-900 border border-slate-600 p-2" /></label>
        {err && <p role="alert" className="text-fuchsia-400">{err}</p>}
        <Btn className="w-full" disabled={busy}>{mode === 'login' ? 'Log in' : 'Create account'}</Btn>
        <button type="button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setErr(''); }} className="w-full text-sm text-lime-400 underline">
          {mode === 'login' ? 'New here? Sign up' : 'Have an account? Log in'}</button>
      </form>
    </main>);
}

function List({ list, path, ctx }) {
  const { sel, setSel, rm, setN, lv } = ctx;
  return (
    <div onClick={e => { e.stopPropagation(); setSel(path); }} className={`min-h-9 rounded p-1 space-y-1 border ${sel.join('.') === path.join('.') ? 'border-cyan-400' : 'border-slate-700'}`}>
      {list.map((b, i) => (
        <div key={i} className="bg-slate-800 rounded p-1">
          <div className="flex items-center gap-2 text-sm">{LABEL[b.t]}
            {b.t === 'repeat' && <input type="number" min="1" max="20" value={b.n} aria-label="repeat count" onClick={e => e.stopPropagation()} onChange={e => setN([...path, i], +e.target.value)} className="w-14 rounded bg-slate-900 px-1" />}
            {b.t === 'if' && <span className="text-cyan-300">{COND[lv.cond]}</span>}
            <button aria-label="remove block" className="ml-auto px-2" onClick={e => { e.stopPropagation(); rm(path, i); }}>✕</button></div>
          {['body', 'then', 'else'].filter(k => b[k]).map(k => <div key={k}>{k !== 'body' && <small className="text-lime-400">{k}</small>}<List list={b[k]} path={[...path, i, k]} ctx={ctx} /></div>)}
        </div>))}
    </div>);
}

function Level({ lv, i, progress, setProgress, go, eq }) {
  const empty = { main: [], fn: [] };
  const [prog, setProg] = useState(empty), [sel, setSel] = useState(['main']);
  const [trace, setTrace] = useState(null), [fi, setFi] = useState(0), [res, setRes] = useState(null), [help, setHelp] = useState(!localStorage.getItem('seen_' + lv.id));
  const hasFn = lv.palette.includes('call');
  const close = () => { localStorage.setItem('seen_' + lv.id, '1'); setHelp(false); };
  useEffect(() => { if (trace && fi < trace.length - 1) { const t = setTimeout(() => setFi(fi + 1), 300); return () => clearTimeout(t); } }, [trace, fi]);
  const frame = trace ? trace[fi] : simulate(lv, empty).steps[0];
  const done = trace && fi >= trace.length - 1;
  const mood = !trace ? 'idle' : !done ? 'focus' : res?.ok ? 'win' : 'dizzy';
  useEffect(() => { if (done && res) sfx(res.ok ? 'win' : 'err'); }, [done]);
  const edit = fn => setProg(p => { const q = structuredClone(p); fn(q); return q; });
  const ctx = { sel, setSel, lv,
    rm: (path, k) => edit(q => getList(q, path).splice(k, 1)),
    setN: (path, n) => edit(q => { getList(q, path.slice(0, -1))[path.at(-1)].n = Math.min(20, Math.max(1, n || 1)); }) };
  const reset = () => { setTrace(null); setFi(0); setRes(null); };
  const run = async () => {
    const g = grade(lv, prog); sfx('zap'); reset(); setTrace(g.steps); setRes(g);
    if (g.ok) { try { const s = await api('/progress/' + lv.id, { program: prog }); setProgress(s); } catch (x) { setRes({ ...g, ok: false, msg: x.message }); } }
  };
  const next = LEVELS[i + 1];
  return (
    <div className="max-w-3xl mx-auto p-3 space-y-3">
      <div className="flex items-center gap-2"><Btn c="bg-slate-700" onClick={() => go(null)}>← Map</Btn>
        <Pixel eq={eq} mood={mood} size={56} /><h2 className="text-xl font-black">{lv.icon} {lv.name}</h2>
        <Btn c="bg-slate-700" className="ml-auto" onClick={() => setHelp(true)}>❓ How this works</Btn></div>
      {help && <div role="dialog" className="rounded-xl border border-lime-400 bg-slate-900 p-4"><p>{lv.how}</p><Btn c="bg-lime-400 text-slate-950" className="mt-3" onClick={close}>Got it</Btn></div>}
      <div className="grid gap-1 justify-center" style={{ gridTemplateColumns: `repeat(${frame.g[0].length}, minmax(0, 3rem))` }}>
        {frame.g.flatMap((row, r) => row.split('').map((ch, c) => (
          <div key={r + '-' + c} className="aspect-square grid place-items-center rounded bg-slate-900 border border-slate-700 text-2xl">
            {frame.r === r && frame.c === c ? <span title="Captain Pixel">🐱<small className="text-cyan-300">{ARROW[frame.d]}</small></span> : (ch === 'D' && frame.key ? '' : TILE[ch])}</div>)))}
      </div>
      <p className="text-sm text-slate-300">Blocks used: {(function n(l = []) { return l.reduce((a, b) => a + 1 + n(b.body) + n(b.then) + n(b.else), 0); })(prog.main) + (function n(l = []) { return l.reduce((a, b) => a + 1 + n(b.body) + n(b.then) + n(b.else), 0); })(prog.fn)} / {lv.lim} (3 stars at {lv.ideal} or fewer)</p>
      <div className="flex flex-wrap gap-2">{lv.palette.map(t => <Btn key={t} c="bg-slate-700" onClick={() => edit(q => getList(q, hasFn && t === 'call' ? ['main'] : sel).push(mk(t)))}>+ {LABEL[t]}</Btn>)}</div>
      <p className="text-sm">Click a box to choose where new blocks go.</p>
      <div><b>Main program</b><List list={prog.main} path={['main']} ctx={ctx} /></div>
      {hasFn && <div><b>Function: jumpAndCollect()</b><List list={prog.fn} path={['fn']} ctx={ctx} /></div>}
      <div className="flex gap-2"><Btn c="bg-lime-400 text-slate-950" onClick={run}>▶ Run</Btn><Btn c="bg-slate-700" onClick={reset}>Reset</Btn>
        <Btn c="bg-slate-700" onClick={() => { setProg(empty); setSel(['main']); reset(); }}>🧹 Clear Blocks</Btn></div>
      {done && res && <div role="status" className={`rounded-xl border p-4 ${res.ok ? 'border-lime-400' : 'border-fuchsia-500'}`}>
        <p className="font-bold">{res.ok ? `${stars(res.stars)} ${res.msg}` : res.msg}</p>
        {res.ok && next && <Btn className="mt-2" onClick={() => go(next.id)}>Next Level →</Btn>}</div>}
    </div>);
}

export default function App() {
  const [me, setMe] = useState(null), [progress, setProgress] = useState({}), [inv, setInv] = useState([]), [badges, setBadges] = useState([]), [pop, setPop] = useState([]), [muted, setMuted] = useState(isMuted()), [screen, setScreen] = useState(null), [ready, setReady] = useState(false), [about, setAbout] = useState(false);
  function apply(d) { setProgress(d.progress); setInv(d.inv || []); setBadges(d.badges || []); if (d.newBadges?.length) setPop(p => [...p, ...d.newBadges]); }
  useEffect(() => { api('/me').then(d => { setMe(d.user); apply(d); }).catch(() => setTok(null)).finally(() => setReady(true)); }, []);
  const onAuth = d => { setTok(d.token); setMe(d.user); apply(d); };
  const logout = () => { setTok(null); setMe(null); setProgress({}); setInv([]); setBadges([]); setScreen(null); };
  if (!ready) return null;
  const credits = Object.values(progress).reduce((s, p) => s + p.credits, 0);
  const spent = inv.reduce((s, x) => s + (ITEMS.find(t => t.id === x.item)?.cost || 0), 0);
  const eq = inv.filter(x => x.equipped).map(x => x.item);
  const locked = i => me.role !== 'admin' && i > 0 && !progress[LEVELS[i - 1].id];
  const idx = LEVELS.findIndex(l => l.id === screen);
  return (<>
    <div className="stars" aria-hidden="true" /><div className="planet" aria-hidden="true" /><div className="shoot" aria-hidden="true" />
    {pop.length > 0 && <BadgeModal ids={pop} close={() => setPop(p => p.slice(1))} />}
    {!me ? <Auth onAuth={onAuth} /> : <>
      <header className="flex flex-wrap items-center gap-3 p-3 border-b border-cyan-400/30">
        <b className="text-cyan-300">🐱‍🚀 Astro-Paws</b>
        <span className="text-yellow-300">Credits: {credits} / {MAX_CREDITS} · Spendable: {credits - spent}</span>
        <span className="ml-auto text-sm">Logged in as {me.username}{me.role === 'admin' ? ' (admin)' : ''}</span>
        <Btn c="bg-slate-700" aria-label="toggle sound" onClick={() => setMuted(toggleMute())}>{muted ? "🔇" : "🔊"}</Btn><Btn c="bg-slate-700" onClick={() => setScreen("shop")}>🛒 Hangar</Btn><Btn c="bg-slate-700" onClick={logout}>Log out</Btn></header>
      {screen === "shop" ? <Shop inv={inv} balance={credits - spent} apply={apply} go={setScreen} eq={eq} /> : idx >= 0 ? (LEVELS[idx].kind ? <Special key={screen} lv={LEVELS[idx]} i={idx} apply={apply} go={setScreen} eq={eq} /> : <Level key={screen} lv={LEVELS[idx]} i={idx} progress={progress} setProgress={apply} go={setScreen} eq={eq} />) :
        <main className="max-w-3xl mx-auto p-3 space-y-4">
          <div className="rounded-2xl border border-fuchsia-500/50 p-4 flex items-center gap-4"><Pixel eq={eq} size={110} />
            <div><h1 className="text-2xl font-black">Captain Pixel needs your code!</h1><Btn c="bg-slate-700" className="mt-2" onClick={() => setAbout(!about)}>❓ How Astro-Paws works</Btn></div></div>
          {about && <p className="rounded-xl border border-lime-400 p-3">Snap blocks together to give Captain Pixel instructions, then press Run. Fewer blocks earn more stars. Clear a mission to unlock the next one.</p>}
          {[1, 2, 3].map(s => <section key={s}><h2 className="font-black text-lg mb-2">{SECTIONS[s]}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {LEVELS.map((l, i) => l.sec === s && (
                <button key={l.id} disabled={locked(i)} onClick={() => setScreen(l.id)} className="rounded-xl border border-cyan-400/40 bg-slate-900 p-3 text-left disabled:opacity-50 hover:border-cyan-300">
                  <div className="text-3xl">{locked(i) ? '🔒' : l.icon}</div><div className="font-bold">{l.name}</div>
                  <div className="text-yellow-300">{stars(progress[l.id]?.stars)}</div>{locked(i) && <small>Clear the previous mission</small>}</button>))}
            </div></section>)}
        </main>}
    </>}
  </>);
}
