import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface BookMeshProps {
    position?: [number, number, number];
    rotation?: [number, number, number];
    title: string;
    coverUrl?: string | null;
    width?: number;
    height?: number;
    depth?: number;
    onClick?: () => void;
    isSelected?: boolean;
    index?: number;
}

// Vibrant book colors for spines
const getBookColors = (index: number) => {
    const palettes = [
        { spine: '#B71C1C', cover: '#C62828', accent: '#FFD700', material: 'leather' },
        { spine: '#1A237E', cover: '#283593', accent: '#FFC107', material: 'cloth' },
        { spine: '#1B5E20', cover: '#2E7D32', accent: '#FFD700', material: 'leather' },
        { spine: '#4A148C', cover: '#6A1B9A', accent: '#FFC107', material: 'cloth' },
        { spine: '#E65100', cover: '#F57C00', accent: '#FFF8E1', material: 'leather' },
        { spine: '#004D40', cover: '#00695C', accent: '#FFD700', material: 'cloth' },
        { spine: '#311B92', cover: '#4527A0', accent: '#FFC107', material: 'leather' },
        { spine: '#BF360C', cover: '#D84315', accent: '#FFF8E1', material: 'cloth' },
        { spine: '#0D47A1', cover: '#1565C0', accent: '#FFD700', material: 'leather' },
        { spine: '#33691E', cover: '#558B2F', accent: '#FFC107', material: 'cloth' },
        { spine: '#880E4F', cover: '#AD1457', accent: '#FFD700', material: 'leather' },
        { spine: '#3E2723', cover: '#4E342E', accent: '#FFD700', material: 'leather' },
    ];
    return palettes[index % palettes.length];
};

// Global texture cache
const textureCache = new Map<string, THREE.Texture>();
const loadingUrls = new Set<string>();

const loadImageWithProxy = async (url: string): Promise<string | null> => {
    const proxies = [
        (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
        (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
    ];

    for (let i = 0; i < proxies.length; i++) {
        const proxyUrl = proxies[i](url);
        try {
            const response = await fetch(proxyUrl);
            if (!response.ok) continue;
            const blob = await response.blob();
            if (blob.size < 100) continue;

            return await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = () => reject(new Error('FileReader failed'));
                reader.readAsDataURL(blob);
            });
        } catch { continue; }
    }
    return null;
};

const loadTextureForUrl = async (url: string, onLoaded: (texture: THREE.Texture) => void) => {
    if (textureCache.has(url)) {
        onLoaded(textureCache.get(url)!);
        return;
    }
    if (loadingUrls.has(url)) {
        const checkInterval = setInterval(() => {
            if (textureCache.has(url)) {
                clearInterval(checkInterval);
                onLoaded(textureCache.get(url)!);
            }
        }, 100);
        return;
    }

    loadingUrls.add(url);
    try {
        const dataUrl = await loadImageWithProxy(url);
        if (!dataUrl) {
            loadingUrls.delete(url);
            return;
        }

        const loader = new THREE.TextureLoader();
        loader.load(dataUrl, (texture) => {
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.flipY = true;
            textureCache.set(url, texture);
            loadingUrls.delete(url);
            onLoaded(texture);
        }, undefined, () => loadingUrls.delete(url));
    } catch (e) { loadingUrls.delete(url); }
};

const BookMesh: React.FC<BookMeshProps> = ({
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    coverUrl,
    width = 0.45,
    height = 0.75,
    depth = 0.12,
    onClick,
    index = 0,
}) => {
    const groupRef = useRef<THREE.Group>(null);
    const [hovered, setHovered] = useState(false);
    const [coverTexture, setCoverTexture] = useState<THREE.Texture | null>(() => {
        if (coverUrl && textureCache.has(coverUrl)) return textureCache.get(coverUrl)!;
        return null;
    });

    const colors = useMemo(() => getBookColors(index), [index]);

    useEffect(() => {
        if (!coverUrl) return;
        if (textureCache.has(coverUrl)) {
            setCoverTexture(textureCache.get(coverUrl)!);
            return;
        }
        loadTextureForUrl(coverUrl, (texture) => setCoverTexture(texture));
    }, [coverUrl]);

    useFrame(() => {
        if (!groupRef.current) return;
        const targetZ = hovered ? 0.5 : 0;
        const targetY = hovered ? 0.05 : 0;
        const targetRotY = hovered ? -0.12 : 0;
        const targetRotZ = hovered ? 0.02 : 0;

        groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, targetZ, 0.1);
        groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, targetY, 0.1);
        groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotY, 0.08);
        groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, targetRotZ, 0.08);

        const targetScale = hovered ? 1.03 : 1;
        const s = THREE.MathUtils.lerp(groupRef.current.scale.x, targetScale, 0.1);
        groupRef.current.scale.setScalar(s);
    });

    const hasCover = coverTexture !== null;

    return (
        <group position={position} rotation={rotation} data-testid="book-mesh-group">
            <group ref={groupRef}>
                {hovered && (
                    <pointLight position={[0, height / 2, 0.5]} color={colors.accent} intensity={5} distance={2} />
                )}

                {/* Main Book Body with standard BoxGeometry for reliable UV mapping */}
                <mesh 
                    castShadow 
                    receiveShadow
                    onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
                    onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'default'; }}
                    onClick={(e) => { e.stopPropagation(); onClick?.(); }}
                    data-testid="book-cover-mesh"
                >
                    <boxGeometry args={[width, height, depth]} />
                    
                    {/* Multi-material array: right, left, top, bottom, front, back */}
                    <meshStandardMaterial attach="material-0" color={colors.cover} roughness={0.8} />
                    <meshStandardMaterial attach="material-1" color={colors.spine} roughness={0.4} />
                    <meshStandardMaterial attach="material-2" color="#fdfcf0" roughness={0.9} />
                    <meshStandardMaterial attach="material-3" color="#fdfcf0" roughness={0.9} />
                    {hasCover ? (
                        <meshBasicMaterial attach="material-4" map={coverTexture} />
                    ) : (
                        <meshStandardMaterial attach="material-4" color={colors.cover} roughness={0.8} />
                    )}
                    <meshStandardMaterial attach="material-5" color={colors.cover} roughness={0.8} />
                </mesh>

                {/* Curved Spine Decoration */}
                <mesh position={[-width / 2, 0, 0]} rotation={[0, 0, 0]}>
                    <cylinderGeometry args={[depth / 2, depth / 2, height, 12, 1, false, Math.PI / 2, Math.PI]} />
                    <meshStandardMaterial 
                        color={colors.spine} 
                        roughness={colors.material === 'leather' ? 0.3 : 0.7} 
                        metalness={0.1} 
                    />
                </mesh>

                {/* Page Block (internal visual) */}
                <mesh position={[0.02, 0, 0]} receiveShadow data-testid="page-block-mesh">
                    <boxGeometry args={[width * 0.95, height * 0.96, depth * 0.9]} />
                    <meshStandardMaterial color="#fdfcf0" roughness={1} metalness={0} />
                </mesh>

                {!hasCover && (
                    <group position={[-width / 2 - 0.05, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
                        <mesh position={[0, height * 0.3, 0]}>
                            <planeGeometry args={[depth * 0.8, 0.02]} />
                            <meshStandardMaterial color={colors.accent} metalness={0.8} roughness={0.2} />
                        </mesh>
                        <mesh position={[0, -height * 0.3, 0]}>
                            <planeGeometry args={[depth * 0.8, 0.02]} />
                            <meshStandardMaterial color={colors.accent} metalness={0.8} roughness={0.2} />
                        </mesh>
                    </group>
                )}
            </group>
        </group>
    );
};

export default BookMesh;