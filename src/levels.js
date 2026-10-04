// Shared by client and server: the server re-simulates every submission.
export const SECTIONS = { 1: 'Planet Starlight', 2: 'Nebula Prime', 3: 'Black Hole Core' };
export const LABEL = { move:'Move', left:'Turn Left', right:'Turn Right', collect:'Collect', jump:'Jetpack Jump', repeat:'Repeat', until:'Repeat Until Goal', if:'If', call:'Call jumpAndCollect()' };
export const COND = { red:'Red tile ahead? (then / else)', wall:'Asteroid ahead? (then / else)', item:'Item here? (then / else)' };
export const LEVELS = [
 { id:'1.1', sec:1, name:'Blast Off', icon:'🌠', credits:10, grid:['S..CG'], palette:['move','collect'], ideal:5, lim:8,
   how:'Sequencing: the computer follows your blocks in order, top to bottom. Pick up the crystal, then reach the portal G.' },
 { id:'1.2', sec:1, name:'Space Debris Dodge', icon:'☄️', credits:10, grid:['S#G','...'], palette:['move','left','right'], ideal:7, lim:10,
   how:'Turns change the way Captain Pixel faces. Moves always go the way the cat is facing (it starts facing right).' },
 { id:'1.3', sec:1, name:'Satellite Vault', icon:'🛰️', credits:10, grid:['S.K.D.G'], palette:['move','collect'], ideal:7, lim:10,
   how:'The order matters: collect the keycard K and the Energy Gate D opens. Without it, the gate blocks you.' },
 { id:'1.4', sec:1, name:'Asteroid Maze', icon:'🪐', credits:10, grid:['S.P##','.#.##','.#P.G'], palette:['move','left','right'], ideal:8, lim:12,
   how:'Plan the whole path before you build. Chips (P) are grabbed automatically when you fly over them.' },
 { id:'2.1', sec:2, name:'Hyper-Corridor', icon:'🌉', credits:10, grid:['S.......G'], palette:['move','repeat'], ideal:2, lim:3, req:['repeat'],
   how:'Loops: instead of repeating a block eight times, put it inside Repeat and set the number.' },
 { id:'2.2', sec:2, name:'Color-Tile Junction', icon:'🚦', credits:10, grid:['S.R..R.G'], palette:['move','jump','repeat','if'], cond:'red', ideal:4, lim:6, req:['repeat','if'],
   how:'If/else: the cat checks something, then picks one of two actions. Red tiles are hot, so jump over them.' },
 { id:'2.3', sec:2, name:'Cosmic Patrol', icon:'🧭', credits:10, grid:['S...#','###.#','###.#','.G..#'], palette:['move','right','until','if'], cond:'wall', ideal:4, lim:5, req:['until','if'],
   how:'Repeat Until Goal keeps going until you arrive. One rule (turn right at a wall, else move) can steer the whole corridor.' },
 { id:'2.4', sec:2, name:'Crystal Harvest', icon:'🔋', credits:10, grid:['S.B.B.B.G'], palette:['move','collect','repeat','if'], cond:'item', ideal:4, lim:6, req:['repeat','if'],
   how:'Sensors: ask "is there an item here?" every step, and collect only when the answer is yes.' },
 { id:'3.2', sec:3, name:'Subroutine Factory', icon:'🏭', credits:15, grid:['S.#C.#C.#C.G'], palette:['move','jump','collect','repeat','call'], ideal:7, lim:10, req:['call'],
   how:'Functions: write a mini-program once in the function box, then Call it as often as you like.' },
];
LEVELS.splice(8, 0, { id:'3.1', sec:3, name:'Solar Bridge Repair', icon:'🌞', credits:15, kind:'bridge',
  how:'Variables: a variable is a labeled box that holds a value you can change. Set power and shieldsOn so the bridge works.' });
LEVELS.push(
  { id:'3.3', sec:3, name:'Space Kraken Boss Fight', icon:'🐙', credits:15, kind:'boss',
    how:'Algorithms react to what they see: read the attack, pick the matching counter. The order is random every time.' },
  { id:'3.4', sec:3, name:'Galactic Trivia Championship', icon:'🏆', credits:25, kind:'quiz',
    how:'Read each short program and predict what it does.' });
export const MAX_CREDITS = LEVELS.reduce((s, l) => s + l.credits, 0);
export const BRIDGE = { power: 70 };
export const ATTACKS = [{ a:'Left Tentacle Swipe', c:'Dodge Right' }, { a:'Ink Cloud', c:'Shield Up' }, { a:'Right Tentacle Swipe', c:'Dodge Left' }, { a:'Laser Eye Beam', c:'Mirror Shield' }];
export const QUIZ = [
  { q:'What does this show?', code:'x = 2\nx = x + 3\nshow x', opts:['2','5','3'] },
  { q:'What does this show?', code:'if 4 > 7:\n  show "A"\nelse:\n  show "B"', opts:['A','Nothing','B'] },
  { q:'What does this show?', code:'repeat 3 times:\n  show "Hi"', opts:['Hi Hi Hi','Hi','Hi Hi'] },
  { q:'What does this show?', code:'function double(n):\n  return n * 2\nshow double(4)', opts:['4','8','2'] }];
export const ITEMS = [
  { id:'badge', name:'Star Captain Badge', icon:'🎖️', cost:10 }, { id:'visor', name:'Neon Cyber Visor', icon:'🥽', cost:15 },
  { id:'helmet', name:'Golden Space Helmet', icon:'👑', cost:25 }, { id:'pet', name:'Alien Pet Companion', icon:'👾', cost:20 },
  { id:'cape', name:'Star Cape', icon:'🦸', cost:15 }, { id:'medal', name:'Champion Medal', icon:'🏅', cost:20 },
  { id:'shield', name:'Meteor Shield Emblem', icon:'🛡️', cost:15 }, { id:'thruster', name:'Ion Thruster Pack', icon:'🚀', cost:20 }];
export const BADGES = [
  { id:'cadet', name:'Cadet Pixel', icon:'🧑‍🚀', desc:'Cleared your first mission.', need:[['1.1',1]] },
  { id:'vault', name:'Vault Cracker', icon:'🔓', desc:'Opened the Satellite Vault.', need:[['1.3',1]] },
  { id:'loop', name:'Loop Master', icon:'🔁', desc:'Mastered loops.', need:[['2.1',1]] },
  { id:'syntax', name:'Syntax Doctor', icon:'🩺', desc:'Fixed the Color-Tile Junction with if/else.', need:[['2.2',1]] },
  { id:'kraken', name:'Kraken Tamer', icon:'🐙', desc:'Defeated the Space Kraken.', need:[['3.3',1]] },
  { id:'genius', name:'Galactic Genius', icon:'🧠', desc:'Aced the trivia championship.', need:[['3.4',3]] },
  { id:'master', name:'Master Explorer', icon:'🧭', desc:'Cleared every mission.', need: LEVELS.map(l => [l.id, 1]) }];
