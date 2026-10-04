# Astro-Paws: Captain Pixel's Code Odyssey

Plain JavaScript / HTML / CSS stack (React + Vite + Tailwind in the browser, Node.js + Express + SQLite on the server). No Python.

## 1. Run it on your own computer
1. Install **Node.js LTS** from https://nodejs.org (accept the defaults). Check with `node -v` in a terminal.
2. Unzip the project and open a terminal **inside the astro-paws folder**.
3. `npm install`
4. Create your settings file: Mac/Linux `cp .env.example .env` , Windows `copy .env.example .env`.
5. Open `.env` in a text editor and set `JWT_SECRET` to a long random phrase (30+ characters), plus `ADMIN_USERNAME` / `ADMIN_PASSWORD` (this is your admin login: all levels unlocked).
6. `npm test` (should print that all levels pass), then `npm run build`, then `npm start`.
7. Open http://localhost:3001 in your browser, sign up, and play. Log in with the admin name to see every level.

## 2. Use it on your phone or tablet (same Wi-Fi)
1. Keep `npm start` running on the computer.
2. Find the computer's local IP: Windows `ipconfig` (IPv4 Address), Mac `ipconfig getifaddr en0`, Linux `hostname -I`.
3. On the phone, open `http://THAT-IP:3001` (e.g. `http://192.168.1.20:3001`). If it will not load, allow Node.js through the computer's firewall.

## 3. Put it on the internet (Render.com, step by step)
1. Create a free GitHub account and upload this folder as a new repository (`.env` is git-ignored, so your secrets stay private).
2. At https://render.com create a **Web Service** from that repository.
3. Build command: `npm install && npm run build`. Start command: `npm start`.
4. Under **Environment** add `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `NODE_ENV=production`.
5. Accounts live in a SQLite file, so add a **Disk** (paid plan) mounted at `/var/data` and set `DB_FILE=/var/data/astro.db`. Without a disk, accounts reset on every redeploy.
6. Open the `https://...onrender.com` link on any device. HTTPS is provided automatically. Other hosts (Railway, Fly.io, a VPS) work the same way: build, then `npm start`, with the same environment variables.

## 4. How it is built
- `src/engine.js`: the block interpreter, shared by browser and server. Step budget makes infinite loops impossible.
- `src/levels.js`: all 12 missions, shop items, badges, quiz and boss data.
- `server/index.js`: auth, progress, shop, badges. Passwords use bcrypt (cost 12), SQL uses prepared statements, usernames are restricted to letters/numbers/underscore, auth routes are rate-limited, admin is seeded from `.env` only.
- Grid levels and the quiz are graded on the server. The bridge target value is in shared code and the boss fight reports its mistake count from the browser, so those two are trust-based; fine for a learning game, not for a competition.
- The login token is stored in browser localStorage.
