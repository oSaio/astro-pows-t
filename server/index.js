import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { LEVELS, ITEMS, BADGES, BRIDGE } from '../src/levels.js';
import { grade } from '../src/engine.js';

const SECRET = process.env.JWT_SECRET;
if (!SECRET || SECRET.length < 16) { console.error('Set JWT_SECRET (16+ chars) in .env'); process.exit(1); }
const db = new Database(process.env.DB_FILE || './astro.db');
db.pragma('journal_mode = WAL');
db.exec(`
CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL COLLATE NOCASE,
  pass_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')), created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS progress (user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, level_id TEXT NOT NULL,
  stars INTEGER NOT NULL, credits INTEGER NOT NULL, PRIMARY KEY (user_id, level_id));
CREATE TABLE IF NOT EXISTS inv (user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, item TEXT NOT NULL, equipped INTEGER NOT NULL DEFAULT 1, PRIMARY KEY (user_id, item));
CREATE TABLE IF NOT EXISTS badges (user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, badge TEXT NOT NULL, PRIMARY KEY (user_id, badge));`);

// The only way to get an admin: seeded from environment, never from the API.
if (process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD &&
    !db.prepare('SELECT 1 FROM users WHERE username=?').get(process.env.ADMIN_USERNAME)) {
  db.prepare("INSERT INTO users (username, pass_hash, role) VALUES (?,?,'admin')")
    .run(process.env.ADMIN_USERNAME, bcrypt.hashSync(process.env.ADMIN_PASSWORD, 12));
}

const app = express();
app.use(helmet());
app.use(express.json({ limit: '20kb' }));
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });
const sign = u => jwt.sign({ id: u.id }, SECRET, { expiresIn: '14d' });
const progressOf = id => Object.fromEntries(db.prepare('SELECT level_id, stars, credits FROM progress WHERE user_id=?').all(id).map(p => [p.level_id, { stars: p.stars, credits: p.credits }]));
const pub = u => ({ id: u.id, username: u.username, role: u.role });

function auth(req, res, next) {
  try {
    const p = jwt.verify((req.headers.authorization || '').slice(7), SECRET);
    const u = db.prepare('SELECT id, username, role FROM users WHERE id=?').get(p.id);
    if (!u) throw new Error('no user');
    req.user = u; next();
  } catch { res.status(401).json({ error: 'Please log in again.' }); }
}

app.post('/api/auth/signup', authLimiter, (req, res) => {
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || !/^[A-Za-z0-9_]{3,20}$/.test(username)) return res.status(400).json({ error: 'Username: 3-20 letters, numbers or underscores.' });
  if (typeof password !== 'string' || password.length < 8 || password.length > 72) return res.status(400).json({ error: 'Password must be 8-72 characters.' });
  try {
    // role is never read from the request body
    const r = db.prepare("INSERT INTO users (username, pass_hash, role) VALUES (?,?,'user')").run(username, bcrypt.hashSync(password, 12));
    const u = { id: r.lastInsertRowid, username, role: 'user' };
    res.status(201).json({ token: sign(u), user: pub(u), ...full(u.id) });
  } catch (e) {
    if (String(e.code).startsWith('SQLITE_CONSTRAINT')) return res.status(409).json({ error: 'That username is taken.' });
    res.status(500).json({ error: 'Could not create account.' });
  }
});

app.post('/api/auth/login', authLimiter, (req, res) => {
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || typeof password !== 'string') return res.status(400).json({ error: 'Enter your username and password.' });
  const u = db.prepare('SELECT * FROM users WHERE username=?').get(username);
  if (!u || !bcrypt.compareSync(password, u.pass_hash)) return res.status(401).json({ error: 'Wrong username or password.' });
  res.json({ token: sign(u), user: pub(u), ...full(u.id) });
});

app.get('/api/me', auth, (req, res) => res.json({ user: pub(req.user), ...full(req.user.id) }));


const ANS = [1, 2, 0, 1];
const full = id => ({ progress: progressOf(id),
  inv: db.prepare('SELECT item, equipped FROM inv WHERE user_id=?').all(id),
  badges: db.prepare('SELECT badge FROM badges WHERE user_id=?').all(id).map(b => b.badge) });
const spent = id => db.prepare('SELECT item FROM inv WHERE user_id=?').all(id).reduce((s, x) => s + (ITEMS.find(i => i.id === x.item)?.cost || 0), 0);
const earned = id => Object.values(progressOf(id)).reduce((s, p) => s + p.credits, 0);

// Server-authoritative: grid levels are re-simulated; the quiz is graded here; bridge is validated here.
app.post('/api/progress/:id', auth, (req, res) => {
  const i = LEVELS.findIndex(l => l.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: 'Unknown level.' });
  const lv = LEVELS[i], uid = req.user.id, b = req.body || {};
  if (req.user.role !== 'admin' && i > 0 && !progressOf(uid)[LEVELS[i - 1].id]) return res.status(403).json({ error: 'Level locked.' });
  let ok = false, stars = 0, credits = lv.credits, msg = 'Mission complete!', extra = {};
  if (lv.kind === 'bridge') {
    const t = Math.max(1, Number(b.tries) | 0);
    ok = Number(b.power) === BRIDGE.power && b.shields === true; stars = ok ? (t <= 2 ? 3 : t <= 5 ? 2 : 1) : 0;
  } else if (lv.kind === 'boss') {
    const m = Math.min(9, Math.max(0, Number(b.mistakes) | 0)); ok = true; stars = m === 0 ? 3 : m <= 2 ? 2 : 1;
  } else if (lv.kind === 'quiz') {
    const a = Array.isArray(b.answers) ? b.answers : [];
    const correct = ANS.map((x, k) => a[k] === x), score = correct.filter(Boolean).length;
    ok = score >= 1; credits = [0, 6, 12, 18, 25][score]; stars = score === 4 ? 3 : score === 3 ? 2 : score ? 1 : 0;
    msg = `${score} / 4 correct`; extra = { score, correct };
  } else { const g = grade(lv, b.program); ok = g.ok; stars = g.stars; msg = g.msg; }
  let newBadges = [];
  if (ok) {
    db.prepare(`INSERT INTO progress (user_id, level_id, stars, credits) VALUES (?,?,?,?)
      ON CONFLICT(user_id, level_id) DO UPDATE SET stars = MAX(stars, excluded.stars), credits = MAX(credits, excluded.credits)`).run(uid, lv.id, stars, credits);
    const p = progressOf(uid), have = new Set(full(uid).badges);
    for (const bd of BADGES) if (!have.has(bd.id) && bd.need.every(([id, s]) => (p[id]?.stars || 0) >= s)) {
      db.prepare('INSERT OR IGNORE INTO badges (user_id, badge) VALUES (?,?)').run(uid, bd.id); newBadges.push(bd.id);
    }
  }
  res.json({ ok, msg, stars, ...extra, newBadges, ...full(uid) });
});

app.post('/api/shop/buy', auth, (req, res) => {
  const it = ITEMS.find(x => x.id === req.body?.item), uid = req.user.id;
  if (!it) return res.status(400).json({ error: 'Unknown item.' });
  if (db.prepare('SELECT 1 FROM inv WHERE user_id=? AND item=?').get(uid, it.id)) return res.status(409).json({ error: 'Already owned.' });
  if (earned(uid) - spent(uid) < it.cost) return res.status(400).json({ error: 'Not enough credits.' });
  db.prepare('INSERT INTO inv (user_id, item, equipped) VALUES (?,?,1)').run(uid, it.id);
  res.json(full(uid));
});
app.post('/api/shop/equip', auth, (req, res) => {
  const r = db.prepare('UPDATE inv SET equipped=? WHERE user_id=? AND item=?').run(req.body?.on ? 1 : 0, req.user.id, String(req.body?.item));
  if (!r.changes) return res.status(404).json({ error: 'You do not own that item.' });
  res.json(full(req.user.id));
});

const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '../dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
}
app.use((err, req, res, next) => res.status(400).json({ error: 'Bad request.' }));
app.listen(process.env.PORT || 3001, () => console.log('Astro-Paws server ready'));
