export function coerceDims(inputDims: number[], expectedDims?: number[] | null): number[] | null {
  if (!expectedDims || expectedDims.length === 0) return null

  const normalizedExpected = expectedDims.map((dim) =>
    typeof dim === "number" && Number.isFinite(dim) ? dim : 0,
  )
  const hasDynamic = normalizedExpected.some((dim) => dim === 0)
  const resolvedExpected = normalizedExpected.map((dim, idx) =>
    dim === 0 ? inputDims[idx] : dim,
  )

  if (inputDims.length === normalizedExpected.length) {
    const matches = resolvedExpected.every((dim, idx) => dim === inputDims[idx])
    if (matches) return hasDynamic ? resolvedExpected : null
    return null
  }

  if (normalizedExpected.length === inputDims.length + 1 && normalizedExpected[0] === 1) {
    const tailExpected = normalizedExpected.slice(1)
    const resolvedTail = tailExpected.map((dim, idx) => (dim === 0 ? inputDims[idx] : dim))
    const matches = resolvedTail.every((dim, idx) => dim === inputDims[idx])
    if (matches) return [1, ...resolvedTail]
  }

  return null
}
