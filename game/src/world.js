// Gobble Dash rules and state, with no drawing and no browser in it: the turkey,
// the farmer closing in behind it, the hazards and treats scrolling past, the four
// stages from farmyard to forest, score, lives and the escape. step() advances one
// fixed step and returns what happened as bit flags, so the caller can react (and
// play sounds) without the world knowing about screens. Nothing here allocates
// after createRun returns: both pools are filled once, at boot.

import {
  ESCAPE_DISTANCE,
  FARMER,
  FIELD,
  LIVES,
  OBSTACLE,
  PICKUP,
  POINTS,
  PX_PER_METRE,
  SPAWN,
  SPEED,
  STAGES,
  STAGE_HAZARDS,
  TURKEY,
} from './tuning.js';
import { pickOne } from './random.js';

export const EVENT_PICKUP = 1;
export const EVENT_HIT = 2;
export const EVENT_SPLASH = 4;
export const EVENT_OVER = 8;
export const EVENT_ESCAPED = 16;
export const EVENT_STAGE = 32;

const POOL_OBSTACLES = 48;
const POOL_PICKUPS = 48;

function boxesOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function stageFor(distance) {
  let stage = 0;
  for (let index = 0; index < STAGES.length; index += 1) {
    if (distance >= STAGES[index].from) stage = index;
  }
  return stage;
}

function spawnInterval(stage) {
  return Math.max(SPAWN.min, SPAWN.first + SPAWN.perStage * stage);
}

export function createRun(random) {
  const turkey = {
    y: FIELD.groundTop - TURKEY.standHeight,
    vy: 0,
    grounded: true,
    ducking: false,
    invuln: 0,
    runPhase: 0,
  };
  const obstacles = [];
  for (let i = 0; i < POOL_OBSTACLES; i += 1) {
    obstacles.push({ active: false, kind: 'fence', x: 0, y: 0, w: 0, h: 0 });
  }
  const pickups = [];
  for (let i = 0; i < POOL_PICKUPS; i += 1) {
    pickups.push({ active: false, kind: 'corn', x: 0, y: 0, r: 12, value: 0 });
  }
  const state = {
    turkey,
    farmerGap: FARMER.startGap,
    obstacles,
    pickups,
    score: 0,
    lives: LIVES,
    distance: 0,
    stage: 0,
    elapsed: 0,
    speed: SPEED.base,
    shake: 0,
    slowTimer: 0,
    over: null,
    pickupKind: null,
    spawnTimer: SPAWN.startDelay,
    pickupTimer: 1.1,
    featherTimer: PICKUP.featherEvery,
  };

  function reset() {
    turkey.y = FIELD.groundTop - TURKEY.standHeight;
    turkey.vy = 0;
    turkey.grounded = true;
    turkey.ducking = false;
    turkey.invuln = 0;
    turkey.runPhase = 0;
    for (const item of obstacles) item.active = false;
    for (const item of pickups) item.active = false;
    state.farmerGap = FARMER.startGap;
    state.score = 0;
    state.lives = LIVES;
    state.distance = 0;
    state.stage = 0;
    state.elapsed = 0;
    state.speed = SPEED.base;
    state.shake = 0;
    state.slowTimer = 0;
    state.over = null;
    state.pickupKind = null;
    state.spawnTimer = SPAWN.startDelay;
    state.pickupTimer = 1.1;
    state.featherTimer = PICKUP.featherEvery;
  }

  function freeSlot(pool) {
    for (let i = 0; i < pool.length; i += 1) if (!pool[i].active) return pool[i];
    return null;
  }

  function turkeyBox() {
    const height = turkey.ducking ? TURKEY.duckHeight : TURKEY.standHeight;
    return { x: TURKEY.x, y: turkey.y + (TURKEY.standHeight - height), w: TURKEY.width, h: height };
  }

  function spawnObstacle() {
    const slot = freeSlot(obstacles);
    if (slot === null) return;
    const kind = pickOne(random, STAGE_HAZARDS[state.stage]);
    const shape = OBSTACLE[kind];
    slot.active = true;
    slot.kind = kind;
    slot.w = shape.width;
    slot.h = shape.height;
    // A fixed spawn line: the gap between arrivals is exactly the spawn
    // interval, never tightened by a random x offset.
    slot.x = FIELD.width + 40;
    if (kind === 'knife') slot.y = FIELD.groundTop - 70;
    else if (kind === 'branch') slot.y = FIELD.groundTop - 64;
    else if (kind === 'puddle') slot.y = FIELD.groundTop - 6;
    else slot.y = FIELD.groundTop - shape.height;
  }

  function dropPickup(kind, x, y, value) {
    const slot = freeSlot(pickups);
    if (slot === null) return;
    slot.active = true;
    slot.kind = kind;
    slot.x = x;
    slot.y = y;
    slot.r = kind === 'feather' ? 16 : 13;
    slot.value = value;
  }

  function spawnPickup() {
    const roll = random();
    const x = FIELD.width + 40 + random() * 160;
    if (roll < 0.18) {
      // A row of three grain kernels on the ground.
      for (let i = 0; i < 3; i += 1) dropPickup('grain', x + i * 38, FIELD.groundTop - 22, POINTS.grain);
    } else if (roll < 0.62) {
      // Corn on the ground, or floating high where a jump collects it.
      const high = random() < 0.4;
      dropPickup('corn', x, high ? FIELD.groundTop - 132 : FIELD.groundTop - 30, POINTS.corn);
    } else {
      dropPickup('corn', x, FIELD.groundTop - 30, POINTS.corn);
      dropPickup('corn', x + 44, FIELD.groundTop - 30, POINTS.corn);
    }
  }

  function spawnFeather() {
    dropPickup('feather', FIELD.width + 60, FIELD.groundTop - 150, POINTS.feather);
  }

  /**
   * One fixed step. `controls` is { jump, duck }: jump is true only on the step
   * the player pressed it, duck is true while the key is held. With `harmless`
   * set (the title screen's backdrop) the world scrolls and hazards drift past
   * but nothing touches the turkey and nothing scores.
   */
  function step(dt, controls, harmless) {
    let events = 0;
    state.elapsed += dt;
    state.pickupKind = null;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt);
    if (state.slowTimer > 0) state.slowTimer = Math.max(0, state.slowTimer - dt);
    if (turkey.invuln > 0) turkey.invuln = Math.max(0, turkey.invuln - dt);

    const cruise = harmless ? 240 : Math.min(SPEED.max, SPEED.base + SPEED.perStage * state.stage);
    state.speed = cruise * (state.slowTimer > 0 ? 0.55 : 1);

    // The turkey's legs: jump, fall, land, duck.
    if (!harmless && controls.jump && turkey.grounded) {
      turkey.vy = -TURKEY.jumpSpeed;
      turkey.grounded = false;
      turkey.ducking = false;
    }
    turkey.ducking = !harmless && Boolean(controls.duck) && turkey.grounded;
    if (!turkey.grounded) {
      turkey.vy += TURKEY.gravity * dt;
      turkey.y += turkey.vy * dt;
      const floor = FIELD.groundTop - TURKEY.standHeight;
      if (turkey.y >= floor) {
        turkey.y = floor;
        turkey.vy = 0;
        turkey.grounded = true;
      }
    }
    turkey.runPhase += dt * (state.speed / 300) * 11;

    if (harmless) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        spawnObstacle();
        state.spawnTimer += spawnInterval(0) * (0.95 + random() * 0.15);
      }
      for (const item of obstacles) {
        if (!item.active) continue;
        item.x -= state.speed * dt;
        if (item.x < -160) item.active = false;
      }
      return 0;
    }

    // Distance, stage and the farmer closing in.
    state.distance += (state.speed * dt) / PX_PER_METRE;
    state.score += (state.speed * dt) / PX_PER_METRE;
    const nextStage = stageFor(state.distance);
    if (nextStage !== state.stage) {
      state.stage = nextStage;
      events |= EVENT_STAGE;
    }
    state.farmerGap = Math.min(FARMER.maxGap, Math.max(0, state.farmerGap - FARMER.driftPerSecond * dt));

    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawnObstacle();
      state.spawnTimer += spawnInterval(state.stage) * (0.95 + random() * 0.15);
    }
    state.pickupTimer -= dt;
    if (state.pickupTimer <= 0) {
      spawnPickup();
      state.pickupTimer += PICKUP.interval + random() * PICKUP.intervalJitter;
    }
    state.featherTimer -= dt;
    if (state.featherTimer <= 0) {
      spawnFeather();
      state.featherTimer += PICKUP.featherEvery;
    }

    const body = turkeyBox();
    for (const item of obstacles) {
      if (!item.active) continue;
      item.x -= state.speed * dt;
      if (item.x < -160) {
        item.active = false;
        continue;
      }
      if (!boxesOverlap(item, body)) continue;
      const shape = OBSTACLE[item.kind];
      if (shape.kind === 'duck' && turkey.ducking) continue;
      if (shape.kind === 'splash') {
        if (!turkey.grounded) continue;
        item.active = false;
        state.slowTimer = 0.6;
        state.farmerGap = Math.max(0, state.farmerGap - 30);
        events |= EVENT_SPLASH;
        continue;
      }
      if (turkey.invuln > 0) continue;
      item.active = false;
      state.lives -= 1;
      turkey.invuln = TURKEY.invulnerable;
      state.farmerGap = Math.max(0, state.farmerGap - FARMER.stumbleGain);
      state.shake = 0.35;
      events |= EVENT_HIT;
      if (state.lives <= 0) {
        state.over = 'caught';
        events |= EVENT_OVER;
        break;
      }
    }

    if (state.over === null) {
      for (const treat of pickups) {
        if (!treat.active) continue;
        treat.x -= state.speed * dt;
        if (treat.x < -60) {
          treat.active = false;
          continue;
        }
        const dx = treat.x - (TURKEY.x + TURKEY.width / 2);
        const dy = treat.y - (body.y + body.h / 2);
        if (dx * dx + dy * dy > (treat.r + 30) * (treat.r + 30)) continue;
        treat.active = false;
        state.score += treat.value;
        state.pickupKind = treat.kind;
        state.farmerGap = Math.min(FARMER.maxGap, state.farmerGap + FARMER.pickupPushback);
        events |= EVENT_PICKUP;
      }
    }

    if (state.over === null && state.distance >= ESCAPE_DISTANCE) {
      state.over = 'escaped';
      events |= EVENT_ESCAPED | EVENT_OVER;
    }
    if (state.over === null && state.farmerGap <= FARMER.catchGap) {
      state.over = 'caught';
      events |= EVENT_OVER;
    }
    return events;
  }

  reset();
  return { state, reset, step };
}
