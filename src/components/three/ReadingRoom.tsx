import React from 'react';

export const ReadingRoom: React.FC = () => {
  // Premium palette
  const wallColor = "#1a1815";
  const floorColor = "#2a2520";
  const rugColor = "#3d2b1f";
  const trimColor = "#3d2b1f";

  return (
    <group>
      {/* Floor - darkened stone/wood */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial
          color={floorColor}
          roughness={0.85}
          metalness={0.05}
        />
      </mesh>

      {/* Back Wall */}
      <mesh position={[0, 10, -12]} receiveShadow>
        <planeGeometry args={[40, 25]} />
        <meshStandardMaterial
          color={wallColor}
          roughness={0.9}
          metalness={0}
        />
      </mesh>

      {/* Left Wall */}
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-15, 10, 0]} receiveShadow>
        <planeGeometry args={[40, 25]} />
        <meshStandardMaterial
          color={wallColor}
          roughness={0.9}
        />
      </mesh>

      {/* Right Wall */}
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[15, 10, 0]} receiveShadow>
        <planeGeometry args={[40, 25]} />
        <meshStandardMaterial
          color={wallColor}
          roughness={0.9}
        />
      </mesh>

      {/* Ceiling - even darker */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 20, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#0a0908" roughness={1} />
      </mesh>

      {/* Decorative rug with subtle elevation */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 4]} receiveShadow>
        <planeGeometry args={[14, 9]} />
        <meshStandardMaterial
          color={rugColor}
          roughness={1}
          metalness={0}
        />
      </mesh>

      {/* Baseboard trim around the room */}
      <group position={[0, 0.2, -11.95]}>
        <mesh receiveShadow castShadow>
          <boxGeometry args={[40, 0.5, 0.1]} />
          <meshStandardMaterial color={trimColor} roughness={0.7} />
        </mesh>
      </group>
      <group rotation={[0, Math.PI / 2, 0]} position={[-14.95, 0.2, 0]}>
        <mesh receiveShadow castShadow>
          <boxGeometry args={[40, 0.5, 0.1]} />
          <meshStandardMaterial color={trimColor} roughness={0.7} />
        </mesh>
      </group>
      <group rotation={[0, -Math.PI / 2, 0]} position={[14.95, 0.2, 0]}>
        <mesh receiveShadow castShadow>
          <boxGeometry args={[40, 0.5, 0.1]} />
          <meshStandardMaterial color={trimColor} roughness={0.7} />
        </mesh>
      </group>
    </group>
  );
};