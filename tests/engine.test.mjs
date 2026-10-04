import assert from 'node:assert/strict';
import { LEVELS } from '../src/levels.js';
import { grade } from '../src/engine.js';
const b = t => ({ t }), m = b('move'), L = b('left'), R = b('right'), C = b('collect'), J = b('jump');
const rep = (n, body) => ({ t: 'repeat', n, body });
const ifb = (th, el) => ({ t: 'if', then: th, else: el });
const SOL = {
  '1.1': { main: [m, m, m, C, m] },
  '1.2': { main: [R, m, L, m, m, L, m] },
  '1.3': { main: [m, m, C, m, m, m, m] },
  '1.4': { main: [m, m, R, m, m, L, m, m] },
  '2.1': { main: [rep(8, [m])] },
  '2.2': { main: [rep(5, [ifb([J], [m])])] },
  '2.3': { main: [{ t: 'until', body: [ifb([R], [m])] }] },
  '2.4': { main: [rep(8, [ifb([C], []), m])] },
  '3.2': { main: [rep(3, [m, b('call')]), m, m], fn: [J, C] },
};
for (const lv of LEVELS.filter(l => !l.kind)) {
  const g = grade(lv, SOL[lv.id]);
  assert.ok(g.ok, `${lv.id} failed: ${g.msg}`);
  assert.equal(g.used, lv.ideal, `${lv.id} ideal mismatch`);
  assert.equal(g.stars, 3, `${lv.id} stars`);
}
assert.ok(!grade(LEVELS[4], { main: Array(8).fill(m) }).ok);
assert.ok(!grade(LEVELS[6], { main: [{ t: 'until', body: [] }] }).ok);
assert.ok(!grade(LEVELS[0], { main: [J] }).ok);
console.log(`All ${LEVELS.length} levels solved at ideal block count with 3 stars. Edge cases pass.`);
