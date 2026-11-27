// Boot and the one loop: input is read once per frame, the run advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the painter
// draws what is there. The game moves between five screens: title, play, paused,
// caught and escaped.
//
// ?seed=N fixes the run's random pattern. ?shot=title|play|caught|escaped (with
// &seed=N) stages that scene instead of running the loop, paints it twice and
// sets window.__shotReady for a screenshot.

import { BEST_KEY, STEP } from './tuning.js';
import { makeRandom } from './random.js';
import { createRun, EVENT_ESCAPED, EVENT_HIT, EVENT_OVER, EVENT_PICKUP, EVENT_SPLASH, EVENT_STAGE } from './world.js';
import { ACTION_CONFIRM, ACTION_JUMP, ACTION_MUTE, ACTION_PAUSE, createControls } from './input.js';
import {
  createPainter,
  SCREEN_CAUGHT,
  SCREEN_ESCAPED,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
} from './draw.js';
import { makeSoundBoard } from './sound.js';
import { stageScene } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped. */
const MAX_FRAME = 0.25;

/** The stage names, in order, for the screen-reader announcements. */
const STAGE_NAMES = ['Farmyard', 'Cornfield', 'Kitchen Yard', 'Forest Edge'];

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const run = createRun(makeRandom(seed));
const painter = createPainter(canvas);
const sounds = makeSoundBoard();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageScene(name, run);
  let painted = 0;
  function paint() {
    painter.draw(run.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const controls = createControls(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  // A jump pressed this frame, spent on the first step that follows it.
  let jumpPending = false;

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function startRun() {
    run.reset();
    accumulator = 0;
    jumpPending = false;
    screen = SCREEN_PLAY;
    sounds.unlock();
    sounds.click();
    announce('Running. Escape to the forest, 600 metres away.');
  }

  function finishRun(escaped) {
    screen = escaped ? SCREEN_ESCAPED : SCREEN_CAUGHT;
    if (run.state.score > best) {
      best = Math.floor(run.state.score);
      saveBest(best);
    }
    if (escaped) {
      sounds.escaped();
      announce(`Escaped. Score ${Math.floor(run.state.score)}. Best ${best}.`);
    } else {
      sounds.caught();
      announce(`Caught. Score ${Math.floor(run.state.score)}. Best ${best}.`);
    }
  }

  function handleActions(actions) {
    if (actions & ACTION_MUTE) {
      const muted = sounds.toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
    if (actions & ACTION_JUMP) jumpPending = true;
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_CAUGHT || screen === SCREEN_ESCAPED)) {
      startRun();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Running.');
    }
  }

  function stepOnce() {
    if (screen === SCREEN_TITLE) {
      run.step(STEP, { jump: false, duck: false }, true);
      return;
    }
    const wasGrounded = run.state.turkey.grounded;
    const jumped = jumpPending;
    jumpPending = false;
    const events = run.step(STEP, { jump: jumped, duck: controls.duckHeld() }, false);
    if (jumped && wasGrounded) sounds.jump();
    if (events & EVENT_PICKUP) {
      if (run.state.pickupKind === 'feather') sounds.feather();
      else sounds.pickup();
    }
    if (events & EVENT_SPLASH) sounds.splash();
    if (events & EVENT_HIT) {
      sounds.stumble();
      announce(run.state.lives === 1 ? 'Ouch. 1 life left.' : `Ouch. ${run.state.lives} lives left.`);
    }
    if (events & EVENT_STAGE) announce(`Now in the ${STAGE_NAMES[run.state.stage]}.`);
    if (events & EVENT_OVER) finishRun(Boolean(events & EVENT_ESCAPED));
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions(controls.takeActions());
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        stepOnce();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    painter.draw(run.state, screen, best);
  }

  // Leaving the tab pauses a running game rather than letting the farmer catch up unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Gobble Dash. Press Space or click to run.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
