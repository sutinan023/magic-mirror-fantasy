import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const src = resolve('node_modules/@mediapipe/tasks-vision/wasm');
const dest = resolve('public/mediapipe/wasm');
if (!existsSync(src)) {
  console.error(`MediaPipe WASM directory not found: ${src}`);
  process.exit(1);
}
const files = readdirSync(src);
if (!files.some(f => f === 'vision_wasm_internal.js') || !files.some(f => f.endsWith('.wasm'))) {
  console.error('MediaPipe WASM assets are incomplete:', files);
  process.exit(1);
}
mkdirSync(dest, {recursive:true});
cpSync(src, dest, {recursive:true, force:true});
console.log(`Copied ${files.length} MediaPipe WASM assets to ${dest}`);
