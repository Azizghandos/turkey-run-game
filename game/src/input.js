// Keyboard and pointer input. Held keys give the duck state; one-shot presses
// (jump, start, restart, pause, mute) are queued as bit flags and taken once by
// the loop, so a press between two frames is never lost and never counted twice.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_JUMP = 4;
export const ACTION_MUTE = 8;

const JUMP_KEYS = new Set(['Space', 'ArrowUp', 'KeyW']);
const DUCK_KEYS = new Set(['ArrowDown', 'KeyS']);
const CONFIRM_KEYS = new Set(['Space', 'Enter']);
const PAUSE_KEYS = new Set(['KeyP', 'Escape']);
const MUTE_KEYS = new Set(['KeyM']);

export function createControls(target) {
  let ducking = false;
  let actions = 0;

  window.addEventListener('keydown', (event) => {
    if (JUMP_KEYS.has(event.code)) {
      if (!event.repeat) actions |= ACTION_JUMP;
      if (CONFIRM_KEYS.has(event.code) && !event.repeat) actions |= ACTION_CONFIRM;
    } else if (DUCK_KEYS.has(event.code)) {
      ducking = true;
    } else if (PAUSE_KEYS.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (MUTE_KEYS.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else {
      return;
    }
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (DUCK_KEYS.has(event.code)) ducking = false;
  });
  // A key released while the tab is hidden never sends keyup: let go on blur.
  window.addEventListener('blur', () => {
    ducking = false;
  });
  target.addEventListener('pointerdown', () => {
    actions |= ACTION_JUMP | ACTION_CONFIRM;
  });

  return {
    /** True while a duck key is held down. */
    duckHeld() {
      return ducking;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
