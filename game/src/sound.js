// Small synthesised sounds, all WebAudio, no audio files: a jump chirp, a pickup
// blip, a stumble thud, a caught slide and an escape fanfare. The context is made
// lazily on the first user gesture (browsers block sound before one); in a
// screenshot scene there is no gesture, so every call simply does nothing.

export function makeSoundBoard() {
  let context = null;
  let muted = false;

  function ensure() {
    if (context !== null) return context;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    } catch {
      context = null;
    }
    return context;
  }

  function tone(startFreq, endFreq, seconds, kind, loudness, delay) {
    const audio = ensure();
    if (audio === null || muted) return;
    try {
      if (audio.state === 'suspended') void audio.resume();
      const at = audio.currentTime + (delay || 0);
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = kind;
      osc.frequency.setValueAtTime(startFreq, at);
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), at + seconds);
      gain.gain.setValueAtTime(loudness, at);
      gain.gain.exponentialRampToValueAtTime(0.001, at + seconds);
      osc.connect(gain).connect(audio.destination);
      osc.start(at);
      osc.stop(at + seconds + 0.02);
    } catch {
      // Sound is decoration: a failure here must never break the game.
    }
  }

  return {
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    jump() {
      tone(280, 640, 0.14, 'sine', 0.12, 0);
    },
    pickup() {
      tone(660, 660, 0.07, 'triangle', 0.1, 0);
      tone(990, 990, 0.09, 'triangle', 0.1, 0.06);
    },
    feather() {
      tone(520, 520, 0.08, 'triangle', 0.1, 0);
      tone(780, 780, 0.08, 'triangle', 0.1, 0.07);
      tone(1170, 1170, 0.12, 'triangle', 0.1, 0.14);
    },
    stumble() {
      tone(160, 60, 0.22, 'sawtooth', 0.14, 0);
    },
    splash() {
      tone(420, 140, 0.18, 'sine', 0.1, 0);
    },
    caught() {
      tone(392, 392, 0.16, 'square', 0.08, 0);
      tone(311, 311, 0.16, 'square', 0.08, 0.16);
      tone(233, 150, 0.34, 'square', 0.09, 0.32);
    },
    escaped() {
      const notes = [523, 659, 784, 1047];
      for (let i = 0; i < notes.length; i += 1) tone(notes[i], notes[i], 0.16, 'triangle', 0.11, i * 0.11);
    },
    click() {
      tone(880, 880, 0.05, 'sine', 0.07, 0);
    },
  };
}
