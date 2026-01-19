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
        { spine: '#B71C1C', cover: '#C62828', accent: '#FFD700' },
        { spine: '#1A237E', cover: '#283593', accent: '#FFC107' },
        { spine: '#1B5E20', cover: '#2E7D32', accent: '#FFD700' },
        { spine: '#4A148C', cover: '#6A1B9A', accent: '#FFC107' },
        { spine: '#E65100', cover: '#F57C00', accent: '#FFF8E1' },
        { spine: '#004D40', cover: '#00695C', accent: '#FFD700' },
        { spine: '#311B92', cover: '#4527A0', accent: '#FFC107' },
        { spine: '#BF360C', cover: '#D84315', accent: '#FFF8E1' },
        { spine: '#0D47A1', cover: '#1565C0', accent: '#FFD700' },
        { spine: '#33691E', cover: '#558B2F', accent: '#FFC107' },
        { spine: '#880E4F', cover: '#AD1457', accent: '#FFD700' },
        { spine: '#3E2723', cover: '#4E342E', accent: '#FFD700' },
    ];
    return palettes[index % palettes.length];
};

// Global texture cache to persist across re-renders
const textureCache = new Map<string, THREE.Texture>();
const loadingUrls = new Set<string>();

// Helper to load image with CORS proxy
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

            const dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = () => reject(new Error('FileReader failed'));
                reader.readAsDataURL(blob);
            });

            return dataUrl;
        } catch {
            continue;
        }
    }
    return null;
};

// Load texture and cache it (called outside of React lifecycle)
const loadTextureForUrl = async (url: string, onLoaded: (texture: THREE.Texture) => void) => {
    // Already cached?
    if (textureCache.has(url)) {
        onLoaded(textureCache.get(url)!);
        return;
    }

    // Already loading?
    if (loadingUrls.has(url)) {
        // Wait and check cache
        const checkInterval = setInterval(() => {
            if (textureCache.has(url)) {
                clearInterval(checkInterval);
                onLoaded(textureCache.get(url)!);
            }
        }, 100);
        return;
    }

    loadingUrls.add(url);
    console.log(`📚 Loading cover:`, url);

    try {
        const dataUrl = await loadImageWithProxy(url);
        if (!dataUrl) {
            console.log(`❌ Failed to get data URL for:`, url);
            loadingUrls.delete(url);
            return;
        }

        console.log(`✅ Got data URL, creating texture...`);

        const loader = new THREE.TextureLoader();
        loader.load(
            dataUrl,
            (texture) => {
                console.log(`🎉 Texture loaded!`);
                texture.colorSpace = THREE.SRGBColorSpace;
                texture.flipY = true;
                textureCache.set(url, texture);
                loadingUrls.delete(url);
                onLoaded(texture);
            },
            undefined,
            (error) => {
                console.log(`❌ THREE.TextureLoader error:`, error);
                loadingUrls.delete(url);
            }
        );
    } catch (e) {
        console.log(`❌ Load error:`, e);
        loadingUrls.delete(url);
    }
};

const BookMesh: React.FC<BookMeshProps> = ({
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    coverUrl,
    width = 0.32,
    height = 0.55,
    depth = 0.08,
    onClick,
    index = 0,
}) => {
    const groupRef = useRef<THREE.Group>(null);
    const [hovered, setHovered] = useState(false);
    const [coverTexture, setCoverTexture] = useState<THREE.Texture | null>(() => {
        // Check cache on initial render
        if (coverUrl && textureCache.has(coverUrl)) {
            return textureCache.get(coverUrl)!;
        }
        return null;
    });

    const colors = useMemo(() => getBookColors(index), [index]);

    // Load cover texture
    useEffect(() => {
        if (!coverUrl) return;

        // Already have it?
        if (textureCache.has(coverUrl)) {
            setCoverTexture(textureCache.get(coverUrl)!);
            return;
        }

        // Load it
        loadTextureForUrl(coverUrl, (texture) => {
            setCoverTexture(texture);
        });
    }, [coverUrl]);

    // Hover animation
    useFrame(() => {
        if (!groupRef.current) return;

        const targetZ = hovered ? 0.25 : 0;
        const targetRotY = hovered ? -0.15 : 0;

        groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, targetZ, 0.1);
        groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotY, 0.1);

        const targetScale = hovered ? 1.05 : 1;
        const s = THREE.MathUtils.lerp(groupRef.current.scale.x, targetScale, 0.1);
        groupRef.current.scale.setScalar(s);
    });

    const hasCover = coverTexture !== null;

    return (
        <group position={position} rotation={rotation}>
            <group ref={groupRef}>
                {/* Hover glow */}
                {hovered && (
                    <pointLight position={[0, 0, 0.4]} color={colors.accent} intensity={3} distance={1.2} />
                )}

                {/* Main book body */}
                <mesh
                    castShadow
                    receiveShadow
                    onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
                    onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'default'; }}
                    onClick={(e) => { e.stopPropagation(); onClick?.(); }}
                >
                    <boxGeometry args={[width, height, depth]} />
                    {hasCover ? (
                        // Use BasicMaterial for textures - better WebGPU compatibility
                        <meshBasicMaterial
                            map={coverTexture}
                            toneMapped={false}
                        />
                    ) : (
                        <meshStandardMaterial color={colors.cover} roughness={0.7} metalness={0.05} />
                    )}
                </mesh>

                {/* Spine decoration (only if no cover) */}
                {!hasCover && (
                    <>
                        <mesh position={[-width / 2 - 0.001, height * 0.35, 0]} rotation={[0, -Math.PI / 2, 0]}>
                            <planeGeometry args={[depth * 0.9, 0.015]} />
                            <meshStandardMaterial color={colors.accent} metalness={0.8} roughness={0.2} />
                        </mesh>
                        <mesh position={[-width / 2 - 0.001, -height * 0.35, 0]} rotation={[0, -Math.PI / 2, 0]}>
                            <planeGeometry args={[depth * 0.9, 0.015]} />
                            <meshStandardMaterial color={colors.accent} metalness={0.8} roughness={0.2} />
                        </mesh>
                    </>
                )}

                {/* Page edges */}
                <mesh position={[width / 2 + 0.004, 0, 0]}>
                    <boxGeometry args={[0.008, height * 0.94, depth * 0.88]} />
                    <meshStandardMaterial color="#F5F0E1" roughness={0.95} metalness={0} />
                </mesh>
                <mesh position={[0, height / 2 + 0.004, 0]}>
                    <boxGeometry args={[width * 0.94, 0.008, depth * 0.88]} />
                    <meshStandardMaterial color="#F5F0E1" roughness={0.95} metalness={0} />
                </mesh>
                <mesh position={[0, -height / 2 - 0.004, 0]}>
                    <boxGeometry args={[width * 0.94, 0.008, depth * 0.88]} />
                    <meshStandardMaterial color="#F5F0E1" roughness={0.95} metalness={0} />
                </mesh>
            </group>
        </group>
    );
};

export default BookMesh;
