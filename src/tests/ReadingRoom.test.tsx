import { describe, expect, it } from 'bun:test'
import { render } from '@testing-library/react'
import React from 'react'
import { ReadingRoom } from '../components/three/ReadingRoom'

describe('ReadingRoom', () => {
  it('should render without crashing', () => {
    // ReadingRoom renders 3D mesh elements which don't have testids
    // We just verify it renders without errors
    const { container } = render(<ReadingRoom />)

    // Check that the component rendered some mesh elements
    const meshElements = container.querySelectorAll('mesh')
    expect(meshElements.length).toBeGreaterThan(0)
  })

  it('should render floor, walls and rug geometries', () => {
    const { container } = render(<ReadingRoom />)

    // Check for plane geometries (floor, walls, rug)
    const planeGeometries = container.querySelectorAll('planegeometry')
    expect(planeGeometries.length).toBeGreaterThanOrEqual(5) // floor + 4 walls/ceiling + rug

    // Check for box geometries (baseboards)
    const boxGeometries = container.querySelectorAll('boxgeometry')
    expect(boxGeometries.length).toBeGreaterThanOrEqual(3) // 3 baseboard trims
  })
})
