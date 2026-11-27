// Drawing only: the run's state and the current screen in, pixels out. The
// 1280x720 playfield is scaled to fit the window and centred, the margin filled
// with the backdrop colour. Everything is drawn with canvas shapes in a warm
// autumn palette: the turkey, the farmer, the farm, the kitchen and the forest.

import { ESCAPE_DISTANCE, FIELD, FONT, LIVES, PALETTE, PX_PER_METRE, STAGES, TURKEY } from './tuning.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_ESCAPED = 'escaped';

const PANEL = { width: 640, top: 120, line: 36, bottom: 76 };

function roundRectPath(context, x, y, w, h, r) {
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + w, y, x + w, y + h, r);
  context.arcTo(x + w, y + h, x, y + h, r);
  context.arcTo(x, y + h, x, y, r);
  context.arcTo(x, y, x + w, y, r);
  context.closePath();
}

export function createPainter(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  function text(value, x, y, size, color, align, bold) {
    const key = size + (bold ? 'b' : '');
    if (!fonts.has(key)) fonts.set(key, `${bold ? 'bold ' : ''}${size}px ${FONT}`);
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align || 'left';
    context.fillText(value, x, y);
  }

  function drawSky(state) {
    const stage = state.stage;
    const gradient = context.createLinearGradient(0, 0, 0, FIELD.groundTop);
    gradient.addColorStop(0, PALETTE.skyTop[stage]);
    gradient.addColorStop(1, PALETTE.skyBottom[stage]);
    context.fillStyle = gradient;
    context.fillRect(0, 0, FIELD.width, FIELD.groundTop);
    // Low autumn sun.
    context.fillStyle = PALETTE.sun;
    context.beginPath();
    context.arc(1120, 110, 44, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = 'rgba(255, 243, 196, 0.35)';
    context.beginPath();
    context.arc(1120, 110, 62, 0, Math.PI * 2);
    context.fill();
    // Slow clouds drifting with the run.
    context.fillStyle = 'rgba(255, 246, 224, 0.85)';
    for (let i = 0; i < 4; i += 1) {
      const base = i * 340 + 80;
      const x = (((base - state.elapsed * 14) % (FIELD.width + 320)) + FIELD.width + 320) % (FIELD.width + 320) - 160;
      const y = 70 + i * 42;
      context.beginPath();
      context.ellipse(x, y, 62, 18, 0, 0, Math.PI * 2);
      context.ellipse(x + 40, y + 6, 44, 14, 0, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawHills(state) {
    const offset = state.distance * PX_PER_METRE * 0.25;
    for (let layer = 0; layer < 2; layer += 1) {
      context.fillStyle = layer === 0 ? PALETTE.hillFar[state.stage] : PALETTE.hillNear[state.stage];
      context.beginPath();
      context.moveTo(0, FIELD.groundTop);
      const step = 160;
      for (let x = -step; x <= FIELD.width + step; x += step) {
        const bump = 46 + 26 * Math.sin((x + offset * (layer === 0 ? 0.6 : 1)) / 260 + layer * 2.4);
        context.lineTo(x + step / 2, FIELD.groundTop - bump - layer * 26);
      }
      context.lineTo(FIELD.width, FIELD.groundTop);
      context.closePath();
      context.fill();
    }
  }

  function drawTree(x, baseY, size, leafSet) {
    context.fillStyle = PALETTE.treeTrunk;
    context.fillRect(x - size * 0.06, baseY - size * 0.5, size * 0.12, size * 0.5);
    for (let i = 0; i < 3; i += 1) {
      context.fillStyle = leafSet[i % leafSet.length];
      context.beginPath();
      context.arc(x, baseY - size * (0.5 + i * 0.22), size * (0.42 - i * 0.09), 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawBarn(x, baseY) {
    context.fillStyle = PALETTE.barn;
    context.fillRect(x, baseY - 130, 170, 130);
    context.fillStyle = PALETTE.barnRoof;
    context.beginPath();
    context.moveTo(x - 12, baseY - 130);
    context.lineTo(x + 85, baseY - 188);
    context.lineTo(x + 182, baseY - 130);
    context.closePath();
    context.fill();
    context.fillStyle = '#fff6e0';
    context.fillRect(x + 62, baseY - 92, 46, 92);
    context.strokeStyle = PALETTE.barnRoof;
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(x + 62, baseY - 92);
    context.lineTo(x + 108, baseY);
    context.moveTo(x + 108, baseY - 92);
    context.lineTo(x + 62, baseY);
    context.stroke();
  }

  function drawScenery(state) {
    const offset = state.distance * PX_PER_METRE * 0.35;
    const spacing = 430;
    for (let slot = 0; slot < 5; slot += 1) {
      const x = (((slot * spacing - offset) % (FIELD.width + spacing)) + FIELD.width + spacing) % (FIELD.width + spacing) - spacing / 2;
      if (state.stage === 0 && slot % 3 === 0) drawBarn(x, FIELD.groundTop);
      else if (state.stage === 2 && slot % 3 === 1) {
        // A little farmhouse by the kitchen yard.
        context.fillStyle = '#e8dcc0';
        context.fillRect(x, FIELD.groundTop - 110, 150, 110);
        context.fillStyle = '#7c2a20';
        context.beginPath();
        context.moveTo(x - 10, FIELD.groundTop - 110);
        context.lineTo(x + 75, FIELD.groundTop - 158);
        context.lineTo(x + 160, FIELD.groundTop - 110);
        context.closePath();
        context.fill();
      } else {
        drawTree(x, FIELD.groundTop, 150 + ((slot * 37) % 60), PALETTE.treeLeaf);
      }
    }
  }

  function drawGround(state) {
    context.fillStyle = PALETTE.ground;
    context.fillRect(0, FIELD.groundTop, FIELD.width, FIELD.height - FIELD.groundTop);
    context.fillStyle = PALETTE.grass[state.stage];
    context.fillRect(0, FIELD.groundTop, FIELD.width, 14);
    const offset = state.distance * PX_PER_METRE;
    context.strokeStyle = PALETTE.grass[state.stage];
    context.lineWidth = 3;
    for (let slot = 0; slot < 16; slot += 1) {
      const x = (((slot * 97 - offset) % (FIELD.width + 120)) + FIELD.width + 120) % (FIELD.width + 120) - 60;
      const tuft = (slot * 53) % 3;
      context.beginPath();
      context.moveTo(x, FIELD.groundTop + 2);
      context.lineTo(x - 5 - tuft, FIELD.groundTop - 10 - tuft * 3);
      context.moveTo(x + 4, FIELD.groundTop + 2);
      context.lineTo(x + 8 + tuft, FIELD.groundTop - 8 - tuft * 3);
      context.stroke();
    }
    // Pumpkins and flowers dotting the dirt, scrolling with the run.
    for (let slot = 0; slot < 6; slot += 1) {
      const x = (((slot * 311 - offset) % (FIELD.width + 200)) + FIELD.width + 200) % (FIELD.width + 200) - 100;
      if (slot % 2 === 0) {
        context.fillStyle = '#e0701f';
        context.beginPath();
        context.ellipse(x, FIELD.groundTop + 58, 20, 14, 0, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = '#5f9e4d';
        context.fillRect(x - 2, FIELD.groundTop + 40, 4, 8);
      } else {
        context.fillStyle = '#f2c94c';
        context.beginPath();
        context.arc(x, FIELD.groundTop + 44, 5, 0, Math.PI * 2);
        context.fill();
      }
    }
  }

  function drawFence(item) {
    context.fillStyle = PALETTE.fenceWood;
    context.fillRect(item.x, item.y, 8, item.h);
    context.fillRect(item.x + item.w - 8, item.y, 8, item.h);
    context.fillRect(item.x - 6, item.y + 8, item.w + 12, 7);
    context.fillRect(item.x - 6, item.y + item.h - 16, item.w + 12, 7);
  }

  function drawBale(item) {
    context.fillStyle = PALETTE.hay;
    context.beginPath();
    context.arc(item.x + item.w / 2, item.y + item.h / 2, item.w / 2, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = PALETTE.hayBand;
    context.lineWidth = 5;
    context.beginPath();
    context.arc(item.x + item.w / 2, item.y + item.h / 2, item.w / 2 - 9, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.arc(item.x + item.w / 2, item.y + item.h / 2, item.w / 2 - 20, 0, Math.PI * 2);
    context.stroke();
  }

  function drawOven(item, elapsed) {
    context.fillStyle = PALETTE.ovenBody;
    roundRectPath(context, item.x, item.y, item.w, item.h, 8);
    context.fill();
    // Chimney with slow smoke.
    context.fillRect(item.x + item.w - 26, item.y - 26, 18, 26);
    context.fillStyle = 'rgba(232, 226, 212, 0.55)';
    for (let i = 0; i < 3; i += 1) {
      const rise = ((elapsed * 22 + i * 26) % 78);
      context.beginPath();
      context.arc(item.x + item.w - 17 + Math.sin(elapsed + i) * 5, item.y - 30 - rise, 7 + rise * 0.08, 0, Math.PI * 2);
      context.fill();
    }
    // Fire glowing in the door window.
    context.fillStyle = PALETTE.ovenGlow;
    roundRectPath(context, item.x + 14, item.y + 34, item.w - 28, 34, 6);
    context.fill();
    context.fillStyle = PALETTE.ovenFire;
    context.beginPath();
    context.moveTo(item.x + 24, item.y + 64);
    context.quadraticCurveTo(item.x + 30, item.y + 38 + Math.sin(elapsed * 9) * 4, item.x + 39, item.y + 64);
    context.quadraticCurveTo(item.x + 48, item.y + 42 - Math.sin(elapsed * 7) * 4, item.x + 56, item.y + 64);
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.knifeHandle;
    context.fillRect(item.x + 10, item.y + 8, item.w - 20, 6);
  }

  function drawKnife(item, elapsed) {
    const swing = Math.sin(elapsed * 2.6 + item.x * 0.01) * 0.16;
    context.save();
    context.translate(item.x + item.w / 2, item.y - 52);
    context.rotate(swing);
    context.strokeStyle = '#3a2c1c';
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(0, 52);
    context.stroke();
    context.fillStyle = PALETTE.knifeHandle;
    context.fillRect(-7, 46, 14, 16);
    context.fillStyle = PALETTE.knifeBlade;
    context.beginPath();
    context.moveTo(-13, 62);
    context.lineTo(13, 62);
    context.lineTo(0, 62 + item.h - 8);
    context.closePath();
    context.fill();
    context.restore();
  }

  function drawBranch(item) {
    context.fillStyle = PALETTE.treeTrunk;
    context.fillRect(item.x - 10, item.y - 26, item.w + 20, 12);
    context.fillStyle = PALETTE.treeLeaf[0];
    for (let i = 0; i < 4; i += 1) {
      context.beginPath();
      context.arc(item.x + 10 + i * 22, item.y - 24, 13, 0, Math.PI * 2);
      context.fill();
    }
    context.fillStyle = PALETTE.treeLeaf[2];
    context.beginPath();
    context.arc(item.x + 44, item.y - 32, 11, 0, Math.PI * 2);
    context.fill();
  }

  function drawPuddle(item) {
    context.fillStyle = PALETTE.puddle;
    context.beginPath();
    context.ellipse(item.x + item.w / 2, item.y + item.h / 2, item.w / 2, item.h / 2 + 3, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = 'rgba(255, 246, 224, 0.5)';
    context.beginPath();
    context.ellipse(item.x + item.w / 2 - 14, item.y + item.h / 2 - 2, item.w / 5, 3, 0, 0, Math.PI * 2);
    context.fill();
  }

  function drawObstacles(state) {
    for (const item of state.obstacles) {
      if (!item.active) continue;
      if (item.kind === 'fence') drawFence(item);
      else if (item.kind === 'bale') drawBale(item);
      else if (item.kind === 'oven') drawOven(item, state.elapsed);
      else if (item.kind === 'knife') drawKnife(item, state.elapsed);
      else if (item.kind === 'branch') drawBranch(item);
      else if (item.kind === 'puddle') drawPuddle(item);
    }
  }

  function drawPickups(state) {
    for (const treat of state.pickups) {
      if (!treat.active) continue;
      if (treat.kind === 'corn') {
        context.fillStyle = PALETTE.cornYellow;
        context.beginPath();
        context.ellipse(treat.x, treat.y, 9, 13, 0.2, 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = '#d9a92c';
        context.lineWidth = 1.5;
        context.beginPath();
        context.moveTo(treat.x - 4, treat.y - 8);
        context.lineTo(treat.x - 4, treat.y + 8);
        context.moveTo(treat.x + 3, treat.y - 8);
        context.lineTo(treat.x + 3, treat.y + 8);
        context.stroke();
        context.fillStyle = PALETTE.cornHusk;
        context.beginPath();
        context.moveTo(treat.x - 7, treat.y + 8);
        context.lineTo(treat.x - 12, treat.y + 18);
        context.lineTo(treat.x - 2, treat.y + 12);
        context.closePath();
        context.fill();
      } else if (treat.kind === 'grain') {
        context.fillStyle = PALETTE.grainGold;
        context.beginPath();
        context.arc(treat.x, treat.y, 6, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = '#fff3c4';
        context.beginPath();
        context.arc(treat.x - 2, treat.y - 2, 2, 0, Math.PI * 2);
        context.fill();
      } else {
        const wobble = Math.sin(state.elapsed * 4 + treat.x * 0.05) * 0.2;
        context.save();
        context.translate(treat.x, treat.y);
        context.rotate(wobble);
        context.fillStyle = PALETTE.featherGold;
        context.beginPath();
        context.ellipse(0, 0, 7, 16, 0, 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = '#b57e2e';
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(0, -16);
        context.lineTo(0, 18);
        context.stroke();
        context.restore();
        context.fillStyle = 'rgba(255, 243, 196, 0.9)';
        context.beginPath();
        context.arc(treat.x + 12, treat.y - 12, 2.5, 0, Math.PI * 2);
        context.arc(treat.x - 12, treat.y + 10, 2, 0, Math.PI * 2);
        context.fill();
      }
    }
  }

  /** The turkey, facing right: fanned tail, brown body, head and wattle, running legs. */
  function drawTurkey(state) {
    const turkey = state.turkey;
    if (turkey.invuln > 0 && Math.floor(turkey.invuln * 10) % 2 === 0) return;
    const height = turkey.ducking ? TURKEY.duckHeight : TURKEY.standHeight;
    const cx = TURKEY.x + TURKEY.width / 2;
    const base = turkey.y + TURKEY.standHeight;
    const legSwing = turkey.grounded ? Math.sin(turkey.runPhase) * 11 : 0;
    const jumping = !turkey.grounded;
    // Legs.
    context.strokeStyle = '#e8912d';
    context.lineWidth = 5;
    context.lineCap = 'round';
    context.beginPath();
    if (jumping) {
      context.moveTo(cx - 8, base - 6);
      context.lineTo(cx - 14, base + 8);
      context.moveTo(cx + 8, base - 6);
      context.lineTo(cx + 12, base + 6);
    } else {
      context.moveTo(cx - 10, base - 8);
      context.lineTo(cx - 10 + legSwing, base + 12);
      context.moveTo(cx + 10, base - 8);
      context.lineTo(cx + 10 - legSwing, base + 12);
    }
    context.stroke();
    // Tail fan behind the body.
    for (let i = 0; i < 4; i += 1) {
      context.fillStyle = PALETTE.tailFeathers[i];
      context.beginPath();
      context.arc(cx - 16, base - height * 0.42, 34 - i * 5, Math.PI * 0.72, Math.PI * 1.55);
      context.fill();
    }
    // Body.
    context.fillStyle = PALETTE.turkeyBody;
    context.beginPath();
    if (turkey.ducking) context.ellipse(cx, base - height * 0.55, 36, height * 0.5, 0, 0, Math.PI * 2);
    else context.ellipse(cx, base - height * 0.55, 30, height * 0.62, 0, 0, Math.PI * 2);
    context.fill();
    // Wing, flapping a little while jumping.
    context.fillStyle = PALETTE.turkeyWing;
    context.beginPath();
    const wingLift = jumping ? -14 : Math.sin(turkey.runPhase * 2) * 3;
    context.ellipse(cx - 2, base - height * 0.55 + wingLift, 16, 10, -0.4, 0, Math.PI * 2);
    context.fill();
    // Head, beak and wattle.
    const headX = cx + 22;
    const headY = base - height + (turkey.ducking ? 12 : 2);
    context.fillStyle = PALETTE.turkeyHead;
    context.beginPath();
    context.arc(headX, headY, 12, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.turkeyBeak;
    context.beginPath();
    context.moveTo(headX + 9, headY - 2);
    context.lineTo(headX + 22, headY + 3);
    context.lineTo(headX + 9, headY + 7);
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.wattle;
    context.beginPath();
    context.ellipse(headX + 6, headY + 12, 4, 7, 0.3, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#2b1a12';
    context.beginPath();
    context.arc(headX + 4, headY - 3, 2.4, 0, Math.PI * 2);
    context.fill();
  }

  /** The farmer, chasing from the left with his arms reaching for the turkey. */
  function drawFarmer(state) {
    const gap = state.farmerGap;
    const width = 76;
    const fx = TURKEY.x - gap - width;
    if (fx + width < -10) return;
    const base = FIELD.groundTop;
    const phase = state.turkey.runPhase * 1.15;
    const legSwing = Math.sin(phase) * 13;
    // Legs (dark trousers).
    context.strokeStyle = '#2e3a4a';
    context.lineWidth = 9;
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(fx + 30, base - 52);
    context.lineTo(fx + 30 + legSwing, base);
    context.moveTo(fx + 48, base - 52);
    context.lineTo(fx + 48 - legSwing, base);
    context.stroke();
    // Overalls and shirt.
    context.fillStyle = PALETTE.farmerOveralls;
    roundRectPath(context, fx + 14, base - 108, 50, 58, 10);
    context.fill();
    context.fillStyle = PALETTE.farmerShirt;
    context.fillRect(fx + 14, base - 108, 50, 20);
    // Reaching arms, one stretched toward the turkey.
    context.strokeStyle = PALETTE.farmerShirt;
    context.lineWidth = 10;
    context.beginPath();
    context.moveTo(fx + 56, base - 96);
    context.lineTo(fx + 84, base - 82 + Math.sin(phase) * 4);
    context.moveTo(fx + 18, base - 96);
    context.lineTo(fx + 2, base - 70 - Math.sin(phase) * 4);
    context.stroke();
    context.fillStyle = PALETTE.farmerSkin;
    context.beginPath();
    context.arc(fx + 86, base - 80 + Math.sin(phase) * 4, 7, 0, Math.PI * 2);
    context.fill();
    // Head with hat, beard and a determined frown.
    context.fillStyle = PALETTE.farmerSkin;
    context.beginPath();
    context.arc(fx + 40, base - 126, 20, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.farmerBeard;
    context.beginPath();
    context.arc(fx + 40, base - 112, 15, 0, Math.PI);
    context.fill();
    context.fillStyle = PALETTE.farmerHat;
    context.beginPath();
    context.ellipse(fx + 40, base - 140, 30, 7, 0, 0, Math.PI * 2);
    context.fill();
    context.fillRect(fx + 24, base - 164, 32, 26);
    context.fillStyle = '#2b1a12';
    context.beginPath();
    context.arc(fx + 46, base - 128, 2.6, 0, Math.PI * 2);
    context.arc(fx + 58, base - 128, 2.6, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = '#2b1a12';
    context.lineWidth = 2.5;
    context.beginPath();
    context.moveTo(fx + 42, base - 136);
    context.lineTo(fx + 52, base - 133);
    context.moveTo(fx + 62, base - 133);
    context.lineTo(fx + 56, base - 136);
    context.stroke();
  }

  function drawHeart(x, y, size, filled) {
    context.fillStyle = filled ? PALETTE.heart : PALETTE.heartEmpty;
    context.beginPath();
    context.moveTo(x, y + size * 0.32);
    context.bezierCurveTo(x - size * 0.55, y - size * 0.28, x - size * 0.12, y - size * 0.7, x, y - size * 0.28);
    context.bezierCurveTo(x + size * 0.12, y - size * 0.7, x + size * 0.55, y - size * 0.28, x, y + size * 0.32);
    context.fill();
  }

  function drawHud(state) {
    context.textBaseline = 'top';
    text(`SCORE ${Math.floor(state.score)}`, 24, 18, 28, PALETTE.text, 'left', true);
    // Distance progress: a track from the barn to the pine tree.
    const trackX = 470;
    const trackW = 340;
    const trackY = 26;
    context.fillStyle = 'rgba(43, 26, 18, 0.55)';
    roundRectPath(context, trackX - 10, trackY - 6, trackW + 20, 30, 15);
    context.fill();
    context.strokeStyle = PALETTE.text;
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(trackX, trackY + 9);
    context.lineTo(trackX + trackW, trackY + 9);
    context.stroke();
    context.fillStyle = PALETTE.barn;
    context.fillRect(trackX - 8, trackY - 4, 14, 14);
    context.fillStyle = '#4e7a35';
    context.beginPath();
    context.moveTo(trackX + trackW + 2, trackY - 8);
    context.lineTo(trackX + trackW + 10, trackY + 10);
    context.lineTo(trackX + trackW - 6, trackY + 10);
    context.closePath();
    context.fill();
    const progress = Math.min(1, state.distance / ESCAPE_DISTANCE);
    const markerX = trackX + progress * trackW;
    context.fillStyle = PALETTE.cornYellow;
    context.beginPath();
    context.arc(markerX, trackY + 9, 8, 0, Math.PI * 2);
    context.fill();
    text(`${Math.floor(state.distance)} m / ${ESCAPE_DISTANCE} m`, 640, 52, 20, PALETTE.text, 'center');
    text(STAGES[state.stage].name, 640, 76, 18, PALETTE.muted, 'center', true);
    // Lives as hearts.
    for (let i = 0; i < LIVES; i += 1) {
      drawHeart(1150 + i * 36, 34, 26, i < state.lives);
    }
  }

  function drawPanel(title, lines, prompt, accent) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(43, 26, 18, 0.94)';
    roundRectPath(context, x, y, PANEL.width, height, 18);
    context.fill();
    context.strokeStyle = accent || PALETTE.panelEdge;
    context.lineWidth = 4;
    roundRectPath(context, x, y, PANEL.width, height, 18);
    context.stroke();
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 82, 52, PALETTE.text, 'center', true);
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 22, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 38, 24, PALETTE.cornYellow, 'center', true);
  }

  /** Paint one frame: the field, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    const shakeX = state.shake > 0 ? Math.sin(state.elapsed * 90) * state.shake * 16 : 0;
    const shakeY = state.shake > 0 ? Math.cos(state.elapsed * 77) * state.shake * 10 : 0;
    context.setTransform(view.scale, 0, 0, view.scale, view.x + shakeX * view.scale, view.y + shakeY * view.scale);
    drawSky(state);
    drawHills(state);
    drawScenery(state);
    drawGround(state);
    drawPickups(state);
    drawObstacles(state);
    drawFarmer(state);
    drawTurkey(state);
    if (screen === SCREEN_TITLE) {
      drawPanel(
        'GOBBLE DASH',
        [
          'A turkey\u2019s great Thanksgiving escape.',
          'The farmer is coming. The oven is hot.',
          `The forest is ${ESCAPE_DISTANCE} m away \u2014 run for it!`,
          'Jump with SPACE or click. Duck with \u2193 or S.',
          `Best score ${best}`,
        ],
        'Press SPACE or click to run',
      );
      return;
    }
    drawHud(state);
    if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', ['The farmer waits for no turkey.', 'But he will wait for you.'], 'Press P to keep running');
    } else if (screen === SCREEN_CAUGHT) {
      drawPanel(
        'CAUGHT FOR DINNER!',
        [
          'The farmer got you \u2014 Thanksgiving is ruined.',
          `Score ${Math.floor(state.score)}   \u00B7   Best ${best}`,
          `You ran ${Math.floor(state.distance)} m toward the forest.`,
        ],
        'Press SPACE or click to run again',
        PALETTE.danger,
      );
    } else if (screen === SCREEN_ESCAPED) {
      drawPanel(
        'ESCAPED!',
        [
          'Free at last \u2014 the forest is yours, turkey.',
          `Score ${Math.floor(state.score)}   \u00B7   Best ${best}`,
          `You ran all ${ESCAPE_DISTANCE} m. The farmer gives up!`,
        ],
        'Press SPACE or click to run again',
        '#7ddb6a',
      );
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
