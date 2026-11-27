// A tiny seeded random source (mulberry32): the same seed gives the same run,
// which is what makes the screenshot scenes repeatable from one load to the next.

export function makeRandom(seed) {
  let state = seed | 0;
  return function nextRandom() {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick one entry of `list` using `random`. */
export function pickOne(random, list) {
  return list[Math.floor(random() * list.length)];
}
