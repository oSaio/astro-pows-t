import React, { useEffect, useState } from 'react';
import { LEVELS, ITEMS, BADGES, BRIDGE, ATTACKS, QUIZ } from './levels.js';
import { api } from './api.js';

// ---- Web Audio synth (no audio files) ----
let ac, muted = localStorage.getItem('mute') === '1';
export const isMuted = () => muted;
export const toggleMute = () => { muted = !muted; localStorage.setItem('mute', muted ? '1' : '0'); return muted; };
const tone = (f, d, type = 'sine', at = 0, v = 0.12) => {
  if (muted) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + at;
    o.type = type; o.frequency.value = f; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + d);
  } catch { /* audio unavailable */ }
};
export const sfx = k => ({ hum: () => tone(110, 0.4, 'sawtooth'), chime: () => tone(880, 0.2), zap: () => { tone(1200, 0.12, 'square'); tone(110, 0.4, 'sawtooth'); },
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'triangle', i * 0.12)), err: () => tone(90, 0.3, 'sawtooth') })[k]?.();

const B = ({ className = '', ...p }) => <button {...p} className={`rounded-lg px-3 py-2 font-bold bg-cyan-400 text-slate-950 disabled:opacity-40 ${className}`} />;
const stars = n => '★'.repeat(n || 0) + '☆'.repeat(3 - (n || 0));
const GREY = '!bg-slate-700 !text-white';

// ---- Captain Pixel (equipped items update the sprite everywhere) ----
export function Pixel({ eq = [], mood = 'idle', size = 96 }) {
  const h = i => eq.includes(i);
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={'pixel ' + mood} role="img" aria-label="Captain Pixel" style={{ display: 'inline-block' }}>
      <defs><linearGradient id="thr" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#00f0ff" /><stop offset="1" stopColor="#0030a0" /></linearGradient></defs>
      {h('thruster') && <rect x="22" y="50" width="56" height="34" rx="10" fill="url(#thr)" />}
      {h('cape') && <path d="M30 58 L8 96 L92 96 L70 58Z" fill="#ff007f" />}
      <ellipse cx="50" cy="70" rx="20" ry="24" fill="#e8f7ff" />
      <polygon points="26,34 30,6 46,24" fill="#f5a623" /><polygon points="74,34 70,6 54,24" fill="#f5a623" />
      <circle cx="50" cy="40" r="26" fill="#f5a623" />
      <circle cx="50" cy="40" r="31" fill={h('helmet') ? '#ffd70044' : '#9ce8ff22'} stroke={h('helmet') ? '#ffd700' : '#9ce8ff'} strokeWidth="3" />
      {h('visor') && <rect x="26" y="33" width="48" height="13" rx="6" fill="#00f0ff" opacity=".75" />}
      <circle cx="40" cy="40" r="3.5" fill="#0b0d1b" /><circle cx="60" cy="40" r="3.5" fill="#0b0d1b" />
      <path d="M44 51 Q50 56 56 51" stroke="#0b0d1b" strokeWidth="2" fill="none" />
      {h('badge') && <text x="55" y="72" fontSize="13">🎖️</text>}
      {h('medal') && <text x="32" y="86" fontSize="13">🏅</text>}
      {h('shield') && <text x="60" y="90" fontSize="13">🛡️</text>}
      {h('pet') && <text x="80" y="96" fontSize="14">👾</text>}
    </svg>);
}

export function Shop({ inv, balance, apply, go, eq }) {
  const [err, setErr] = useState('');
  const act = async (p, b) => { try { apply(await api(p, b)); setErr(''); sfx('chime'); } catch (x) { setErr(x.message); sfx('err'); } };
  return (
    <main className="max-w-2xl mx-auto p-3 space-y-3">
      <B className={GREY} onClick={() => go(null)}>← Map</B>
      <div className="flex items-center gap-4"><Pixel eq={eq} size={140} /><p className="text-yellow-300 text-lg">Spendable credits: {balance}</p></div>
      {err && <p role="alert" className="text-fuchsia-400">{err}</p>}
      <div className="grid sm:grid-cols-2 gap-2">
        {ITEMS.map(it => { const o = inv.find(x => x.item === it.id); return (
          <div key={it.id} className="rounded-xl border border-cyan-400/40 bg-slate-900 p-3 flex items-center gap-2">
            <span className="text-2xl">{it.icon}</span><b>{it.name}</b>
            {o ? <B className="ml-auto" onClick={() => act('/shop/equip', { item: it.id, on: !o.equipped })}>{o.equipped ? 'Unequip' : 'Equip'}</B>
              : <B className="ml-auto" disabled={balance < it.cost} onClick={() => act('/shop/buy', { item: it.id })}>{it.cost} 💰</B>}
          </div>); })}
      </div>
    </main>);
}

export function BadgeModal({ ids, close }) {
  const b = BADGES.find(x => x.id === ids[0]);
  useEffect(() => { sfx('win'); }, [ids[0]]);
  if (!b) return null;
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
      <div className="relative overflow-hidden rounded-2xl border-2 border-yellow-300 bg-slate-950 p-8 text-center">
        {Array.from({ length: 24 }, (_, n) => <i key={n} className="confetti" style={{ left: (n * 4 + 2) + '%', animationDelay: (n % 6) * 0.15 + 's', background: ['#00f0ff', '#ff007f', '#00ff66', '#ffd700'][n % 4] }} />)}
        <div className="text-6xl">{b.icon}</div><h2 className="text-2xl font-black text-yellow-300">{b.name}</h2><p>{b.desc}</p>
        <B className="mt-3" onClick={close}>Awesome!</B>
      </div>
    </div>);
}

function Bridge({ submit }) {
  const [power, setP] = useState(10), [sh, setSh] = useState(false), [tries, setT] = useState(0), [hint, setH] = useState('');
  const test = () => {
    const t = tries + 1, d = power - BRIDGE.power; setT(t);
    setH(d < 0 ? 'Power is too low. The bridge flickers.' : d > 0 ? 'Power is too high. Sparks fly!' : !sh ? 'Power is perfect. Now switch shieldsOn to true.' : '');
    if (!d && sh) submit({ power, shields: sh, tries: t }); else sfx('err');
  };
  return (
    <div className="space-y-3 rounded-xl border border-cyan-400/40 p-3">
      <pre className="text-lime-300">{`power = ${power}\nshieldsOn = ${sh}`}</pre>
      <input type="range" min="0" max="100" value={power} aria-label="power" onChange={e => setP(+e.target.value)} className="w-full" />
      <label className="block"><input type="checkbox" checked={sh} onChange={e => setSh(e.target.checked)} /> shieldsOn</label>
      <div className="flex gap-1">{[1, 2, 3, 4, 5].map(k => <div key={k} className="h-8 flex-1 rounded" style={{ background: power >= k * 20 - 10 ? '#ffd700' : '#1e293b' }} />)}</div>
      {sh && <div className="mx-auto h-20 w-20 rounded-full border-4 border-cyan-300 shadow-[0_0_20px_#00f0ff]" />}
      <B onClick={test}>⚡ Test bridge</B><p>{hint}</p>
    </div>);
}

const pick = () => Math.floor(Math.random() * ATTACKS.length);
function Boss({ submit, eq }) {
  const [cur, setC] = useState(pick), [hits, setH] = useState(0), [miss, setM] = useState(0), [msg, setMsg] = useState(''), [over, setO] = useState(false);
  const counter = c => {
    if (over) return;
    if (c === ATTACKS[cur].c) { sfx('chime'); const h = hits + 1; setH(h); setMsg('Direct hit!'); if (h === 3) { setO(true); submit({ mistakes: miss }); } else setC(pick()); }
    else { sfx('err'); setM(miss + 1); setMsg('Ouch! The Kraken lands a blow.'); }
  };
  return (
    <div className="space-y-3 rounded-xl border border-fuchsia-500/50 p-3">
      <Pixel eq={eq} mood={msg.startsWith('Ouch') ? 'dizzy' : 'focus'} size={70} />
      <p className="text-xl">🐙 The Kraken uses <b>{ATTACKS[cur].a}</b>! ({hits}/3 counters, {miss} mistakes)</p>
      <div className="flex flex-wrap gap-2">{[...new Set(ATTACKS.map(a => a.c))].map(c => <B key={c} disabled={over} onClick={() => counter(c)}>{c}</B>)}</div>
      <p>{msg}</p>
      <details><summary>Field guide</summary>{ATTACKS.map(a => <p key={a.a}>{a.a} → {a.c}</p>)}<p>The attack order is random every time.</p></details>
    </div>);
}

function Quiz({ submit, res, retake }) {
  const [k, setK] = useState(0), [ans, setA] = useState([]);
  const choose = o => { const a = [...ans, o]; setA(a); if (k === QUIZ.length - 1) submit({ answers: a }); else setK(k + 1); };
  if (res) return (
    <div className="space-y-2"><p className="text-lg">Score: {res.score} / 4</p>
      {QUIZ.map((q, n) => <p key={n}>{res.correct?.[n] ? '✅' : '❌'} Question {n + 1}</p>)}
      <B onClick={() => { retake(); setK(0); setA([]); }}>Retake</B></div>);
  const q = QUIZ[k];
  return (
    <div className="space-y-2"><p>Question {k + 1} / {QUIZ.length}: {q.q}</p>
      <pre className="rounded bg-slate-900 p-2 text-lime-300">{q.code}</pre>
      <div className="flex flex-wrap gap-2">{q.opts.map((o, n) => <B key={n} onClick={() => choose(n)}>{o}</B>)}</div></div>);
}

export function Special({ lv, i, apply, go, eq }) {
  const [res, setRes] = useState(null), [err, setErr] = useState('');
  const next = LEVELS[i + 1];
  const submit = async body => {
    try { const s = await api('/progress/' + lv.id, body); apply(s); setRes(s); setErr(''); sfx(s.ok ? 'win' : 'err'); } catch (x) { setErr(x.message); }
  };
  return (
    <div className="max-w-xl mx-auto p-3 space-y-3">
      <div className="flex items-center gap-2"><B className={GREY} onClick={() => go(null)}>← Map</B><h2 className="text-xl font-black">{lv.icon} {lv.name}</h2></div>
      <p className="rounded-xl border border-lime-400 p-3">{lv.how}</p>
      {err && <p role="alert" className="text-fuchsia-400">{err}</p>}
      {lv.kind === 'bridge' ? <Bridge submit={submit} /> : lv.kind === 'boss' ? <Boss submit={submit} eq={eq} /> : <Quiz submit={submit} res={res} retake={() => setRes(null)} />}
      {res && <div role="status" className={`rounded-xl border p-4 ${res.ok ? 'border-lime-400' : 'border-fuchsia-500'}`}>
        <p className="font-bold">{res.ok ? stars(res.stars) + ' ' : ''}{res.msg}</p>
        {res.ok && next && <B className="mt-2" onClick={() => go(next.id)}>Next Level →</B>}</div>}
    </div>);
}
