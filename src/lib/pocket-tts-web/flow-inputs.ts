export function coerceDims(inputDims: number[], expectedDims?: number[] | null): number[] | null {
  if (!expectedDims || expectedDims.length === 0) return null

  const hasDynamic = expectedDims.some((dim) => dim === 0)
  const resolvedExpected = expectedDims.map((dim, idx) => (dim === 0 ? inputDims[idx] : dim))

  if (inputDims.length === expectedDims.length) {
    const matches = resolvedExpected.every((dim, idx) => dim === inputDims[idx])
    if (matches) return hasDynamic ? resolvedExpected : null
    return null
  }

  if (expectedDims.length === inputDims.length + 1 && expectedDims[0] === 1) {
    const tailExpected = expectedDims.slice(1)
    const resolvedTail = tailExpected.map((dim, idx) => (dim === 0 ? inputDims[idx] : dim))
    const matches = resolvedTail.every((dim, idx) => dim === inputDims[idx])
    if (matches) return [1, ...resolvedTail]
  }

  return null
}
