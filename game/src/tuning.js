// Gobble Dash — every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area; the painter scales it to fit the
// window, so no rule below depends on the screen size. Distances are metres; the
// world scrolls at 40 pixels per metre.

export const FIELD = { width: 1280, height: 720, groundTop: 620 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display rate. */
export const STEP = 1 / 60;

/** Pixels the world scrolls per metre of distance. */
export const PX_PER_METRE = 40;

/** How far the turkey must run to reach the forest and be free. */
export const ESCAPE_DISTANCE = 600;

export const TURKEY = {
  x: 230,
  width: 62,
  standHeight: 58,
  duckHeight: 34,
  // A long, high jump: the turkey stays above a hay bale (58 px tall, 72 px
  // wide) or an oven (86 px tall, 78 px wide) for the whole time the hazard
  // passes under it — a short hop clips the far top corner and costs a life.
  jumpSpeed: 1080,
  gravity: 2500,
  invulnerable: 1.2,
};

export const FARMER = {
  startGap: 170,
  maxGap: 300,
  catchGap: 8,
  stumbleGain: 55,
  driftPerSecond: 1.0,
  pickupPushback: 4,
};

export const LIVES = 3;

/** Base scroll speed (px/s) and how much each stage adds. */
export const SPEED = { base: 300, perStage: 34, max: 430 };

/** Seconds between obstacle spawns, shrinking slightly as stages advance.
 * The floor matters: a jump stays in the air 0.86 s, so hazards must arrive
 * at least ~0.95 s apart — closer than that and the turkey lands on the next
 * one before it can jump again, which no player could fairly dodge. */
export const SPAWN = { first: 1.15, perStage: -0.04, min: 1.0, startDelay: 0.9 };

/** Seconds between pickup spawns. */
export const PICKUP = { interval: 1.5, intervalJitter: 0.9, featherEvery: 26 };

export const POINTS = { corn: 10, grain: 5, feather: 25 };

/** The four stretches of the run: name, where it starts (metres) and its mood. */
export const STAGES = [
  { name: 'Farmyard', from: 0 },
  { name: 'Cornfield', from: 150 },
  { name: 'Kitchen Yard', from: 350 },
  { name: 'Forest Edge', from: 500 },
];

export const OBSTACLE = {
  fence: { width: 26, height: 46, kind: 'jump' },
  bale: { width: 72, height: 58, kind: 'jump' },
  oven: { width: 78, height: 86, kind: 'jump' },
  knife: { width: 64, height: 30, kind: 'duck' },
  branch: { width: 88, height: 26, kind: 'duck' },
  puddle: { width: 96, height: 14, kind: 'splash' },
};

/** Which hazards each stage throws at the turkey. */
export const STAGE_HAZARDS = [
  ['fence', 'bale', 'puddle'],
  ['fence', 'bale', 'puddle', 'knife'],
  ['oven', 'knife', 'fence', 'bale'],
  ['branch', 'oven', 'fence', 'knife'],
];

export const PALETTE = {
  backdrop: '#2b1a12',
  skyTop: ['#f7b733', '#f9a03f', '#e2703a', '#7d5a3c'],
  skyBottom: ['#fcd98a', '#f7c873', '#f2a65e', '#a8c686'],
  sun: '#fff3c4',
  hillFar: ['#c98a4b', '#b5763e', '#8f5a33', '#5d7a44'],
  hillNear: ['#a5672f', '#93552c', '#6e4526', '#476b34'],
  ground: '#7a4a24',
  grass: ['#c98f3d', '#b57e2e', '#7d5a2e', '#5f8f4a'],
  dirt: '#5e3a1c',
  barn: '#a63a2e',
  barnRoof: '#7c2a20',
  fenceWood: '#8a5a2b',
  hay: '#e0aa4e',
  hayBand: '#b57e2e',
  ovenBody: '#3a3a40',
  ovenGlow: '#ff7b2f',
  ovenFire: '#ffc23d',
  knifeBlade: '#d7dde6',
  knifeHandle: '#5d3a1e',
  puddle: '#5b7fa6',
  cornYellow: '#f2c94c',
  cornHusk: '#5f9e4d',
  grainGold: '#ffd94d',
  featherGold: '#ffcf3d',
  turkeyBody: '#8a5230',
  turkeyWing: '#6e3f22',
  tailFeathers: ['#b25a2a', '#d2691e', '#e8a33c', '#f2c94c'],
  turkeyHead: '#e8e2d4',
  turkeyBeak: '#e8912d',
  wattle: '#e5534b',
  farmerShirt: '#4a6fa5',
  farmerOveralls: '#3d5a80',
  farmerSkin: '#e8b98a',
  farmerHat: '#7a5a2b',
  farmerBeard: '#5a4632',
  treeTrunk: '#6b4423',
  treeLeaf: ['#d97b29', '#e8a33c', '#c95f2a', '#4e7a35'],
  panel: '#2b1a12',
  panelEdge: '#f2c94c',
  text: '#fff6e0',
  muted: '#e8c98f',
  danger: '#ff5a3c',
  heart: '#ff5a6e',
  heartEmpty: '#5a4632',
};

export const FONT = 'Trebuchet MS, Verdana, system-ui, sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'gobble-dash.best';
