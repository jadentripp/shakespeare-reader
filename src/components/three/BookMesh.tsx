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

// Load texture and cache it
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
        loader.load(
            dataUrl,
            (texture) => {
                texture.colorSpace = THREE.SRGBColorSpace;
                texture.flipY = true;
                textureCache.set(url, texture);
                loadingUrls.delete(url);
                onLoaded(texture);
            },
            undefined,
            () => {
                loadingUrls.delete(url);
            }
        );
    } catch (e) {
        loadingUrls.delete(url);
    }
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
        if (coverUrl && textureCache.has(coverUrl)) {
            return textureCache.get(coverUrl)!;
        }
        return null;
    });

    const colors = useMemo(() => getBookColors(index), [index]);

    useEffect(() => {
        if (!coverUrl) return;
        if (textureCache.has(coverUrl)) {
            setCoverTexture(textureCache.get(coverUrl)!);
            return;
        }
        loadTextureForUrl(coverUrl, (texture) => {
            setCoverTexture(texture);
        });
    }, [coverUrl]);

    // Hover animation - Slide out slightly (5-10cm)
    useFrame(() => {
        if (!groupRef.current) return;

        // Slide out on Z axis when hovered
        const targetZ = hovered ? 0.4 : 0;
        const targetRotY = hovered ? -0.1 : 0;

        groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, targetZ, 0.1);
        groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotY, 0.1);

        const targetScale = hovered ? 1.02 : 1;
        const s = THREE.MathUtils.lerp(groupRef.current.scale.x, targetScale, 0.1);
        groupRef.current.scale.setScalar(s);
    });

    // Create a curved book geometry
    const bookCoverGeometry = useMemo(() => {
        const shape = new THREE.Shape();
        const r = depth / 2; // Spine radius
        
        // Start from back cover corner
        shape.moveTo(width, -depth / 2);
        // Line to spine start
        shape.lineTo(r, -depth / 2);
        // Curve for spine
        shape.absarc(r, 0, r, -Math.PI / 2, Math.PI / 2, false);
        // Line to front cover corner
        shape.lineTo(width, depth / 2);
        // Close shape (simplified as a single extruded piece for the "wrap")
        shape.lineTo(width, -depth / 2);

        return new THREE.ExtrudeGeometry(shape, {
            depth: height,
            bevelEnabled: true,
            bevelThickness: 0.01,
            bevelSize: 0.01,
            bevelSegments: 3
        });
    }, [width, height, depth]);

    const hasCover = coverTexture !== null;

    return (
        <group position={position} rotation={rotation} data-testid="book-mesh-group">
            <group ref={groupRef}>
                {/* Hover light */}
                {hovered && (
                    <pointLight position={[0, height / 2, 0.5]} color={colors.accent} intensity={5} distance={2} />
                )}

                {/* Cover & Spine */}
                <mesh 
                    geometry={bookCoverGeometry} 
                    rotation={[Math.PI / 2, 0, -Math.PI / 2]} 
                    position={[-width / 2, -height / 2, 0]}
                    castShadow 
                    receiveShadow
                    onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
                    onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'default'; }}
                    onClick={(e) => { e.stopPropagation(); onClick?.(); }}
                    data-testid="book-cover-mesh"
                >
                    {hasCover ? (
                        <meshBasicMaterial map={coverTexture} toneMapped={false} />
                    ) : (
                        <meshStandardMaterial 
                            color={colors.cover} 
                            roughness={colors.material === 'leather' ? 0.4 : 0.8} 
                            metalness={0.05} 
                        />
                    )}
                </mesh>

                {/* Page Block (the paper part) */}
                <mesh position={[0.01, 0, 0]} receiveShadow data-testid="page-block-mesh">
                    <boxGeometry args={[width * 0.92, height * 0.95, depth * 0.85]} />
                    <meshStandardMaterial 
                        color="#fdfcf0" 
                        roughness={0.9} 
                        metalness={0} 
                    />
                </mesh>

                {/* Decorative spine lines if no cover */}
                {!hasCover && (
                    <group position={[-width / 2 - 0.01, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
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