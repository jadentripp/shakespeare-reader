import React from 'react';
import { Box, Cylinder } from '@react-three/drei';

interface ReadingDeskProps {
    position?: [number, number, number];
}

const ReadingDesk: React.FC<ReadingDeskProps> = ({
    position = [0, 0, 0],
}) => {
    // Shared wood colors from Bookcase/ReadingRoom
    const woodColor = '#8B5A2B';
    const surfaceColor = '#7A4A1C';
    const darkWood = '#4A3520';
    const knobColor = '#DAA520';

    const width = 4;
    const height = 1.8;
    const depth = 2;
    const topThickness = 0.15;

    return (
        <group position={position} data-testid="reading-desk">
            {/* Desktop Surface */}
            <Box args={[width, topThickness, depth]} position={[0, height, 0]} castShadow receiveShadow>
                <meshStandardMaterial color={surfaceColor} roughness={0.4} metalness={0.1} />
            </Box>

            {/* Front apron (drawer area) */}
            <Box args={[width - 0.1, 0.4, 0.1]} position={[0, height - 0.2, depth / 2 - 0.05]} castShadow>
                <meshStandardMaterial color={woodColor} roughness={0.6} />
            </Box>

            {/* Drawer handle knob */}
            <Cylinder args={[0.04, 0.04, 0.08]} position={[0, height - 0.2, depth / 2 + 0.05]} rotation={[Math.PI / 2, 0, 0]}>
                <meshStandardMaterial color={knobColor} metalness={0.8} roughness={0.2} />
            </Cylinder>

            {/* Legs */}
            {[
                [-width / 2 + 0.15, height / 2, -depth / 2 + 0.15],
                [width / 2 - 0.15, height / 2, -depth / 2 + 0.15],
                [-width / 2 + 0.15, height / 2, depth / 2 - 0.25],
                [width / 2 - 0.15, height / 2, depth / 2 - 0.25]
            ].map((pos, i) => (
                <Box key={i} args={[0.15, height, 0.15]} position={pos as [number, number, number]} castShadow receiveShadow>
                    <meshStandardMaterial color={darkWood} roughness={0.7} />
                </Box>
            ))}

            {/* Side supports */}
            <Box args={[0.1, 0.3, depth - 0.4]} position={[-width / 2 + 0.15, height - 0.25, 0]} castShadow>
                <meshStandardMaterial color={woodColor} />
            </Box>
            <Box args={[0.1, 0.3, depth - 0.4]} position={[width / 2 - 0.15, height - 0.25, 0]} castShadow>
                <meshStandardMaterial color={woodColor} />
            </Box>

            {/* Ambient desk light - subtle warm glow under/around desk */}
            <pointLight 
                position={[0, height - 0.5, 0]} 
                intensity={5} 
                distance={4} 
                color="#FFE4CC" 
            />
        </group>
    );
};

export default ReadingDesk;
