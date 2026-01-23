import { Box } from '@react-three/drei'
import type React from 'react'

interface BookcaseProps {
  position?: [number, number, number]
  rows?: number
  width?: number
  height?: number
  depth?: number
  shelfThickness?: number
}

const Bookcase: React.FC<BookcaseProps> = ({
  position = [0, 0, 0],
  rows = 4,
  width = 8,
  height = 6,
  depth = 1.0,
  shelfThickness = 0.06,
}) => {
  const rowHeight = height / rows

  // Rich wood colors
  const frameColor = '#8B5A2B'
  const shelfColor = '#7A4A1C'
  const backColor = '#4A3520'
  const trimColor = '#DAA520'

  return (
    <group position={position}>
      {/* Left side panel */}
      <Box
        args={[0.12, height, depth]}
        position={[-width / 2 - 0.06, height / 2, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={frameColor} roughness={0.6} metalness={0.1} />
      </Box>

      {/* Right side panel */}
      <Box
        args={[0.12, height, depth]}
        position={[width / 2 + 0.06, height / 2, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={frameColor} roughness={0.6} metalness={0.1} />
      </Box>

      {/* Top header */}
      <Box args={[width + 0.3, 0.2, depth + 0.1]} position={[0, height + 0.1, 0]} castShadow>
        <meshStandardMaterial color={frameColor} roughness={0.5} metalness={0.1} />
      </Box>

      {/* Gold trim on top */}
      <Box args={[width + 0.35, 0.03, 0.03]} position={[0, height + 0.21, depth / 2 + 0.02]}>
        <meshStandardMaterial color={trimColor} metalness={0.8} roughness={0.2} />
      </Box>

      {/* Base */}
      <Box
        args={[width + 0.3, 0.15, depth + 0.1]}
        position={[0, -0.075, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={frameColor} roughness={0.6} metalness={0.1} />
      </Box>

      {/* Back panel */}
      <mesh position={[0, height / 2, -depth / 2 + 0.02]} receiveShadow>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color={backColor} roughness={0.9} />
      </mesh>

      {/* Shelves */}
      {Array.from({ length: rows }).map((_, i) => (
        <group key={i} position={[0, i * rowHeight, 0]}>
          {/* Shelf board */}
          <Box args={[width, shelfThickness, depth]} castShadow receiveShadow>
            <meshStandardMaterial color={shelfColor} roughness={0.5} metalness={0.1} />
          </Box>
          {/* Front edge */}
          <Box args={[width + 0.1, shelfThickness + 0.02, 0.04]} position={[0, 0.01, depth / 2]}>
            <meshStandardMaterial color={frameColor} roughness={0.4} metalness={0.1} />
          </Box>
        </group>
      ))}

      {/* Shelf lights - warm glow on each shelf */}
      {Array.from({ length: rows }).map((_, i) => (
        <pointLight
          key={`shelf-light-${i}`}
          position={[0, i * rowHeight + rowHeight * 0.6, depth * 0.3]}
          color="#FFE4CC"
          intensity={2}
          distance={2.5}
          decay={2}
        />
      ))}
    </group>
  )
}

export default Bookcase
