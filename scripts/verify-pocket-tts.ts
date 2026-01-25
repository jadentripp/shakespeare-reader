import { existsSync, statSync } from "node:fs"
import { join } from "node:path"

const root = process.cwd()
const requiredFiles = [
  "public/pocket-tts/tokenizer.model",
  "public/pocket-tts/voices.bin",
  "public/pocket-tts/voices/alba.wav",
  "public/pocket-tts/voices/marius.wav",
  "public/pocket-tts/voices/javert.wav",
  "public/pocket-tts/voices/jean.wav",
  "public/pocket-tts/voices/fantine.wav",
  "public/pocket-tts/voices/cosette.wav",
  "public/pocket-tts/voices/eponine.wav",
  "public/pocket-tts/voices/azelma.wav",
  "public/pocket-tts/onnx/mimi_encoder.onnx",
  "public/pocket-tts/onnx/text_conditioner.onnx",
  "public/pocket-tts/onnx/flow_lm_main_int8.onnx",
  "public/pocket-tts/onnx/flow_lm_flow_int8.onnx",
  "public/pocket-tts/onnx/mimi_decoder_int8.onnx",
  "public/pocket-tts/onnxruntime/ort.min.mjs",
  "public/pocket-tts/onnxruntime/ort-wasm-simd-threaded.mjs",
  "public/pocket-tts/onnxruntime/ort-wasm-simd-threaded.wasm",
]

let ok = true
for (const file of requiredFiles) {
  const fullPath = join(root, file)
  if (!existsSync(fullPath)) {
    console.error(`Missing: ${file}`)
    ok = false
    continue
  }
  const stats = statSync(fullPath)
  if (stats.size < 1024) {
    console.error(`Too small (likely bad download): ${file} (${stats.size} bytes)`) 
    ok = false
    continue
  }
  console.log(`OK: ${file} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`)
}

if (!ok) {
  console.error("\nPocket TTS asset check failed.")
  process.exit(1)
}

console.log("\nPocket TTS assets look good.")
