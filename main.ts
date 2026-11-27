// Gobble Dash — a make.fun turkey-run-game-01 entry (Node 22, standard library
// only). The game is this directory's game/ folder: plain static files a desktop
// browser loads offline (game/index.html and its ES modules, no library, no
// network request). This program hands it in: it copies game/ and screenshots/
// from beside this file to /output and writes /output/dossier.json, the summary
// the judge reads, with the vendored make.fun library.
//
// Play it locally by serving game/ with any static server, then open the page
// in desktop Chrome. Outside the grader's container, MAKEFUN_OUTPUT_DIR stands
// in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const rootDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(rootDir, 'game'), join(outputDir, 'game'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(rootDir, 'screenshots'))) {
  cpSync(join(rootDir, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The caps the scorer enforces on what lands in /output: at most 4 screenshots
// and 256 KiB each, at most 993 files and 48 MiB under game/, and no path under
// game/ longer than 1000 bytes. game/ counts beside /output's own 1000-entry
// cap, together with screenshots/ and dossier.json.
const dossierPath = join(outputDir, 'dossier.json');
writeFileSync(
  dossierPath,
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

// Fail loudly instead of handing in a broken entry: the judge needs at least
// three screenshots, each within the 256 KiB cap, and the game page itself.
const shots = readdirSync(join(outputDir, 'screenshots')).filter((name) => name.endsWith('.jpg'));
if (shots.length < 3) throw new Error(`only ${shots.length} screenshot(s) in ${outputDir}/screenshots — need at least 3`);
for (const name of shots) {
  const size = statSync(join(outputDir, 'screenshots', name)).size;
  if (size > 262144) throw new Error(`screenshot ${name} is ${size} bytes — over the 256 KiB cap`);
}
if (!existsSync(join(outputDir, 'game', 'index.html'))) throw new Error('game/index.html is missing from the output');
console.log(`Gobble Dash handed in: ${shots.length} screenshots, dossier ${statSync(dossierPath).size} bytes -> ${outputDir}`);
