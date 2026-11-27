// The screenshot scenes behind ?shot=title|play|caught|escaped. Each one plays the
// real rules forward from a fresh run for a fixed stretch, steered by a simple
// autopilot (jump the fences, bales and ovens in time, duck under the knives and
// branches, splash through nothing), so the frame is what a short game really
// looks like and the same seed always gives the same frame.

import { OBSTACLE, STEP, TURKEY } from './tuning.js';
import { EVENT_OVER } from './world.js';
import { SCREEN_CAUGHT, SCREEN_ESCAPED, SCREEN_PLAY, SCREEN_TITLE } from './draw.js';

const TITLE_SECONDS = 5;
const PLAY_SECONDS = 24;
const END_LIMIT_SECONDS = 300;
const SAMPLE = 1 / 60;

/** The pilot's eyes: how far ahead, in seconds of travel, it reacts to a hazard.
 * 0.30 s puts the jump's high middle over the hazard's whole pass: earlier and
 * the turkey comes down onto a wide bale's far corner; later and it meets the
 * fence before it has left the ground. */
const LEAD_PLAY = 0.30;
const LEAD_ESCAPE = 0.30;
const DUCK_RANGE = 140;

/** The nearest hazard still ahead of the turkey, or null when the road is clear. */
function nextHazard(state) {
  let nearest = null;
  for (let index = 0; index < state.obstacles.length; index += 1) {
    const item = state.obstacles[index];
    if (!item.active) continue;
    if (item.x + item.w < TURKEY.x) continue;
    if (nearest === null || item.x < nearest.x) nearest = item;
  }
  return nearest;
}

/** What the pilot does this step: jump the low hazards, duck the high ones. */
function autopilot(state, leadFactor) {
  const controls = { jump: false, duck: false };
  const hazard = nextHazard(state);
  if (hazard === null) return controls;
  const gap = hazard.x - (TURKEY.x + TURKEY.width);
  const shape = OBSTACLE[hazard.kind];
  if (shape.kind === 'duck') {
    if (gap < DUCK_RANGE) controls.duck = true;
    return controls;
  }
  if (shape.kind === 'splash') {
    if (gap < state.speed * leadFactor && state.turkey.grounded) controls.jump = true;
    return controls;
  }
  if (gap < state.speed * leadFactor && state.turkey.grounded) controls.jump = true;
  return controls;
}

/**
 * Set `run` to the named scene (title, play, caught or escaped; any other name
 * is title) and return the screen to draw over it and the best score to show.
 */
export function stageScene(name, run) {
  run.reset();
  if (name !== 'play' && name !== 'caught' && name !== 'escaped') {
    for (let index = 0; index < TITLE_SECONDS / STEP; index += 1) {
      run.step(STEP, { jump: false, duck: false }, true);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'caught') {
    // A pilot that never moves: the farmer catches up fast, as a player who
    // froze would be.
    for (let index = 0; index < END_LIMIT_SECONDS / STEP; index += 1) {
      if (run.step(STEP, { jump: false, duck: false }, false) & EVENT_OVER) break;
    }
    return { screen: SCREEN_CAUGHT, best: Math.floor(run.state.score) };
  }
  const seconds = name === 'escaped' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  const lead = name === 'escaped' ? LEAD_ESCAPE : LEAD_PLAY;
  for (let index = 0; index < seconds / STEP; index += 1) {
    const events = run.step(STEP, autopilot(run.state, lead), false);
    if (events & EVENT_OVER) break;
  }
  if (run.state.over === 'escaped') return { screen: SCREEN_ESCAPED, best: Math.floor(run.state.score) };
  if (run.state.over === 'caught') return { screen: SCREEN_CAUGHT, best: Math.floor(run.state.score) };
  return { screen: SCREEN_PLAY, best: Math.floor(run.state.score) };
}
