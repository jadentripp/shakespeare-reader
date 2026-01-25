import { describe, expect, it } from "bun:test"
import { coerceDims } from "../lib/pocket-tts-web/flow-inputs"

describe("PocketTTS flow input shape coercion", () => {
  it("pads missing dimensions when metadata expects a leading singleton", () => {
    const inputDims = [1, 32]
    const expected = [1, 1, 32]

    expect(coerceDims(inputDims, expected)).toEqual([1, 1, 32])
  })

  it("infers dynamic dimensions from total length", () => {
    const inputDims = [1, 15, 32]
    const expected = [1, 0, 32]

    expect(coerceDims(inputDims, expected)).toEqual([1, 15, 32])
  })

  it("returns null when input already matches expected", () => {
    const inputDims = [1, 1, 32]
    const expected = [1, 1, 32]

    expect(coerceDims(inputDims, expected)).toBeNull()
  })
})
