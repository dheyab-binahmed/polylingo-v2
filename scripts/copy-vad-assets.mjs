// Copies the Silero VAD worklet + ONNX model and the onnxruntime-web wasm files
// into public/ so they are served from our own origin (used by the hands-free
// speaking-tutor auto-loop). Runs automatically via the predev/prebuild scripts.
// No-ops gracefully if the packages aren't installed yet.
import { mkdirSync, copyFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(root, "public");
mkdirSync(publicDir, { recursive: true });

const copyMatching = (dir, match) => {
  const out = [];
  if (!existsSync(dir)) {
    console.warn(`[copy-vad-assets] not found (run npm install first): ${dir}`);
    return out;
  }
  for (const file of readdirSync(dir)) {
    if (match(file)) {
      copyFileSync(join(dir, file), join(publicDir, file));
      out.push(file);
    }
  }
  return out;
};

const vadDist = join(root, "node_modules/@ricky0123/vad-web/dist");
const vadOrtDist = join(root, "node_modules/@ricky0123/vad-web/node_modules/onnxruntime-web/dist");
const rootOrtDist = join(root, "node_modules/onnxruntime-web/dist");
const ortDist = existsSync(vadOrtDist) ? vadOrtDist : rootOrtDist;

const copied = [
  ...copyMatching(vadDist, (f) => f.endsWith(".onnx") || f === "vad.worklet.bundle.min.js"),
  ...copyMatching(ortDist, (f) => f.endsWith(".wasm")),
];

console.log(`[copy-vad-assets] copied ${copied.length} file(s) to public/${copied.length ? ": " + copied.join(", ") : ""}`);
