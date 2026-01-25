import { describe, expect, it } from "bun:test"

describe("PocketTTS worker base64 conversion", () => {
  it("encodes larger buffers without call stack overflow", () => {
    const bytes = new Uint8Array(120_000)
    for (let i = 0; i < bytes.length; i++) bytes[i] = i % 256

    const encoded = arrayBufferToBase64(bytes.buffer)
    const expected = Buffer.from(bytes).toString("base64")

    expect(encoded).toBe(expected)
  })
})

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  let binary = ""
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}
