import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { formatDownloadCount, isPopular } from '../../lib/gutenbergUtils';

export type BookStatus = 'local' | 'remote' | 'downloading';

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
    status?: BookStatus;
    progress?: number; // 0-100 reading progress
    downloadProgress?: number; // 0-100 download progress
    draggable?: boolean;
    onDragStart?: (event: any) => void;
    onDragEnd?: (dropped: boolean) => void;
    isDragging?: boolean;
    dragOffset?: [number, number, number];
    initialOffset?: [number, number, number];
    author?: string;
    downloadCount?: number;
    // Arc animation: book flies from current position to destination
    flyingTo?: [number, number, number] | null;
    onFlyComplete?: () => void;
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
    title,
    coverUrl,
    width = 0.45,
    height = 0.75,
    depth = 0.12,
    onClick,
    index = 0,
    status = 'local',
    progress = 0,
    downloadProgress = 0,
    draggable = false,
    onDragStart,
    isDragging = false,
    dragOffset = [0, 0, 0],
    initialOffset,
    author,
    downloadCount,
    flyingTo = null,
    onFlyComplete,
}) => {
    const groupRef = useRef<THREE.Group>(null);
    const outerGroupRef = useRef<THREE.Group>(null);
    const [hovered, setHovered] = useState(false);
    const [coverTexture, setCoverTexture] = useState<THREE.Texture | null>(() => {
        if (coverUrl && textureCache.has(coverUrl)) return textureCache.get(coverUrl)!;
        return null;
    });

    const colors = useMemo(() => getBookColors(index), [index]);
    const [materializeOpacity, setMaterializeOpacity] = useState(status === 'downloading' ? 0.3 : 1);
    const glowRef = useRef<THREE.PointLight>(null);

    // Flying animation state
    const flyProgress = useRef(0);
    const flyCurve = useRef<THREE.QuadraticBezierCurve3 | null>(null);
    const isFlying = flyingTo !== null;

    // Seed position from drop location if provided
    useEffect(() => {
        if (initialOffset && outerGroupRef.current) {
            outerGroupRef.current.position.set(...initialOffset);
        }
    }, []);

    // Initialize flying animation when flyingTo changes
    const flyToKey = flyingTo?.join(',') || 'null';
    const posKey = position.join(',');

    useEffect(() => {
        if (flyingTo && outerGroupRef.current) {
            // Calculate start and end points
            const start = new THREE.Vector3().copy(outerGroupRef.current.position);
            const target = new THREE.Vector3(
                flyingTo[0] - position[0],
                flyingTo[1] - position[1],
                flyingTo[2] - position[2]
            );

            // Calculate midpoint and lift
            const mid = new THREE.Vector3().lerpVectors(start, target, 0.5);

            // Scaled height: dynamic based on distance, but strictly NO lift for downward drops
            const dist = Math.sqrt(Math.pow(target.x - start.x, 2) + Math.pow(target.y - start.y, 2) + Math.pow(target.z - start.z, 2));
            const isDownward = target.y < start.y - 0.1; // More sensitive downward detection

            if (!isDownward) {
                const arcHeight = dist * 0.12;
                mid.y += arcHeight;
            } else {
                // Pull midpoint down for more direct fall
                mid.y -= dist * 0.05;
            }

            // Create the curve
            flyCurve.current = new THREE.QuadraticBezierCurve3(start, mid, target);
            flyProgress.current = 0;
        }
    }, [flyToKey, posKey, title]);

    useEffect(() => {
        if (!coverUrl) return;
        if (textureCache.has(coverUrl)) {
            setCoverTexture(textureCache.get(coverUrl)!);
            return;
        }
        loadTextureForUrl(coverUrl, (texture) => setCoverTexture(texture));
    }, [coverUrl]);

    useFrame((state) => {
        if (!groupRef.current) return;

        // When dragging, lift and tilt the book
        const baseTargetZ = isDragging ? 2.0 : (hovered ? 0.5 : 0);
        const baseTargetY = isDragging ? 0.3 : (hovered ? 0.05 : 0);
        const targetRotY = isDragging ? -0.3 : (hovered ? -0.12 : 0);
        const targetRotZ = isDragging ? 0.05 : (hovered ? 0.02 : 0);

        groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, baseTargetZ, 0.15);
        groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, baseTargetY, 0.15);
        groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotY, 0.12);
        groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, targetRotZ, 0.12);

        const targetScale = isDragging || isFlying ? 1.15 : (hovered ? 1.03 : 1);
        const s = THREE.MathUtils.lerp(groupRef.current.scale.x, targetScale, 0.1);
        groupRef.current.scale.setScalar(s);

        // Handle different movement modes for outer group
        if (outerGroupRef.current) {
            if (isFlying && flyingTo && flyCurve.current) {
                // Determine if this is a trash drop (very low target Y)
                const isTrashDrop = flyingTo[1] < -0.1; // Target relative to book position is low

                // Flying arc animation speed: Faster for trash drops
                const speed = isTrashDrop ? 0.05 : 0.03;
                flyProgress.current = Math.min(flyProgress.current + speed, 1);
                const t = flyProgress.current;

                // Ease-in for trash (accelerating fall), Ease-in-out for shelf moves
                const easeT = isTrashDrop ? t * t : (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

                // Get point from Bezier curve
                const pos = flyCurve.current.getPoint(easeT);
                outerGroupRef.current.position.set(pos.x, pos.y, pos.z);

                // No wobble for trash drops - just fall straight
                groupRef.current.rotation.y = isTrashDrop ? 0 : Math.sin(easeT * Math.PI) * 0.1;
                groupRef.current.rotation.z = isTrashDrop ? 0 : Math.sin(easeT * Math.PI) * 0.15;

                // Fire complete callback when done
                if (flyProgress.current >= 1 && onFlyComplete) {
                    onFlyComplete();
                }
            } else if (isDragging) {
                // Normal drag following
                outerGroupRef.current.position.x = THREE.MathUtils.lerp(outerGroupRef.current.position.x, dragOffset[0], 0.2);
                outerGroupRef.current.position.y = THREE.MathUtils.lerp(outerGroupRef.current.position.y, dragOffset[1], 0.2);
                outerGroupRef.current.position.z = THREE.MathUtils.lerp(outerGroupRef.current.position.z, dragOffset[2], 0.2);
            } else if (!isFlying) {
                // Snappier return for that "landing" feel
                // ONLY return to shelf if we aren't dragging and aren't about to fly
                outerGroupRef.current.position.x = THREE.MathUtils.lerp(outerGroupRef.current.position.x, 0, 0.1);
                outerGroupRef.current.position.y = THREE.MathUtils.lerp(outerGroupRef.current.position.y, 0, 0.1);
                outerGroupRef.current.position.z = THREE.MathUtils.lerp(outerGroupRef.current.position.z, 0, 0.1);
            } else if (!flyCurve.current) {
                // If isFlying is true but curve isn't ready yet, STAY STILL at last drag position
                // This prevents the "flying up/right" jerk back to the shelf
            }
        }

        // Materialization animation for downloading books
        if (status === 'downloading') {
            const pulse = Math.sin(state.clock.elapsedTime * 3) * 0.2 + 0.5;
            setMaterializeOpacity(0.3 + (downloadProgress / 100) * 0.7 * pulse);
            if (glowRef.current) {
                glowRef.current.intensity = 5 + Math.sin(state.clock.elapsedTime * 4) * 3;
            }
        } else {
            setMaterializeOpacity((prev) => THREE.MathUtils.lerp(prev, 1, 0.1));
        }
    });

    const hasCover = coverTexture !== null;

    const isDownloading = status === 'downloading';

    const handlePointerDown = (e: any) => {
        if (draggable && (status === 'remote' || status === 'local')) {
            e.stopPropagation();
            // Pass the R3F Three event - parent will extract nativeEvent
            onDragStart?.(e);
        }
    };

    const isHype = isPopular(downloadCount);

    return (
        <group position={position} rotation={rotation}>
            <group ref={outerGroupRef}>
                <group ref={groupRef}>
                    {(hovered || isDragging) && (
                        <pointLight position={[0, height / 2, 0.5]} color={isDragging ? "#22d3ee" : colors.accent} intensity={isDragging ? 10 : 5} distance={isDragging ? 4 : 2} />
                    )}

                    {/* Download materialization glow */}
                    {isDownloading && (
                        <pointLight
                            ref={glowRef}
                            position={[0, 0, depth]}
                            color="#f59e0b"
                            intensity={5}
                            distance={1.5}
                        />
                    )}

                    {/* Drag glow effect */}
                    {isDragging && (
                        <pointLight
                            position={[0, 0, depth + 0.5]}
                            color="#22d3ee"
                            intensity={15}
                            distance={3}
                        />
                    )}

                    {/* Main Book Body with standard BoxGeometry for reliable UV mapping */}
                    <mesh
                        castShadow
                        receiveShadow
                        onPointerOver={(e) => {
                            e.stopPropagation();
                            setHovered(true);
                            document.body.style.cursor = draggable && (status === 'remote' || status === 'local') ? 'grab' : 'pointer';
                        }}
                        onPointerOut={(e) => {
                            e.stopPropagation();
                            setHovered(false);
                            document.body.style.cursor = 'default';
                        }}
                        onPointerDown={handlePointerDown}
                        onClick={(e) => { if (!isDragging) { e.stopPropagation(); onClick?.(); } }}
                    >
                        <boxGeometry args={[width, height, depth]} />

                        {/* Multi-material array: right, left, top, bottom, front, back */}
                        <meshStandardMaterial attach="material-0" color={colors.cover} roughness={0.8} transparent opacity={materializeOpacity} />
                        <meshStandardMaterial attach="material-1" color={colors.spine} roughness={0.4} transparent opacity={materializeOpacity} />
                        <meshStandardMaterial attach="material-2" color="#fdfcf0" roughness={0.9} transparent opacity={materializeOpacity} />
                        <meshStandardMaterial attach="material-3" color="#fdfcf0" roughness={0.9} transparent opacity={materializeOpacity} />
                        {hasCover ? (
                            <meshBasicMaterial attach="material-4" map={coverTexture} transparent opacity={materializeOpacity} />
                        ) : (
                            <meshStandardMaterial attach="material-4" color={colors.cover} roughness={0.8} transparent opacity={materializeOpacity} />
                        )}
                        <meshStandardMaterial attach="material-5" color={colors.cover} roughness={0.8} transparent opacity={materializeOpacity} />
                    </mesh>

                    {/* Curved Spine Decoration */}
                    <mesh position={[-width / 2, 0, 0]} rotation={[0, 0, 0]}>
                        <cylinderGeometry args={[depth / 2, depth / 2, height, 12, 1, false, Math.PI / 2, Math.PI]} />
                        <meshStandardMaterial
                            color={colors.spine}
                            roughness={colors.material === 'leather' ? 0.3 : 0.7}
                            metalness={0.1}
                            transparent
                            opacity={materializeOpacity}
                        />
                    </mesh>

                    {/* Page Block (internal visual) */}
                    <mesh position={[0.02, 0, 0]} receiveShadow>
                        <boxGeometry args={[width * 0.95, height * 0.96, depth * 0.9]} />
                        <meshStandardMaterial color="#fdfcf0" roughness={1} metalness={0} transparent opacity={materializeOpacity} />
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

                    {/* Status Indicator - Spine ribbon */}
                    {status === 'local' && (
                        <mesh
                            position={[-width / 2 - 0.01, -height / 2 + 0.06, 0]}
                            rotation={[0, -Math.PI / 2, 0]}
                        >
                            <planeGeometry args={[depth * 0.6, 0.04]} />
                            <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.3} />
                        </mesh>
                    )}

                    {status === 'remote' && (
                        <mesh
                            position={[-width / 2 - 0.01, -height / 2 + 0.06, 0]}
                            rotation={[0, -Math.PI / 2, 0]}
                        >
                            <planeGeometry args={[depth * 0.6, 0.04]} />
                            <meshStandardMaterial color="#64748b" />
                        </mesh>
                    )}

                    {status === 'downloading' && (
                        <group position={[-width / 2 - 0.01, -height / 2 + 0.06, 0]} rotation={[0, -Math.PI / 2, 0]}>
                            {/* Background */}
                            <mesh>
                                <planeGeometry args={[depth * 0.6, 0.04]} />
                                <meshStandardMaterial color="#1e293b" />
                            </mesh>
                            {/* Progress fill */}
                            <mesh position={[-(depth * 0.6 * (1 - downloadProgress / 100)) / 2, 0, 0.001]}>
                                <planeGeometry args={[depth * 0.6 * (downloadProgress / 100), 0.04]} />
                                <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.5} />
                            </mesh>
                        </group>
                    )}

                    {/* Reading Progress Ribbon - on top of the book */}
                    {status === 'local' && progress > 0 && (
                        <group position={[0, height / 2 + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                            {/* Ribbon base */}
                            <mesh>
                                <planeGeometry args={[width * 0.9, depth * 0.15]} />
                                <meshStandardMaterial color="#1e293b" />
                            </mesh>
                            {/* Progress fill */}
                            <mesh position={[-(width * 0.9 * (1 - progress / 100)) / 2, 0, 0.001]}>
                                <planeGeometry args={[width * 0.9 * (progress / 100), depth * 0.15]} />
                                <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.3} />
                            </mesh>
                        </group>
                    )}

                    {/* Bookmark ribbon for books in progress */}
                    {status === 'local' && progress > 0 && progress < 100 && (
                        <mesh position={[width * 0.25, height / 2 + 0.08, 0]}>
                            <boxGeometry args={[0.03, 0.16, 0.01]} />
                            <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.2} />
                        </mesh>
                    )}

                    {/* Floating Info Label */}
                    {hovered && !isDragging && (
                        <Html position={[0, height / 2 + 0.25, 0]} center distanceFactor={10}>
                            <div className="pointer-events-none whitespace-nowrap px-4 py-2.5 bg-stone-950/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl shadow-black/80 flex flex-col items-center gap-0.5 animate-in fade-in zoom-in-95 duration-200">
                                <span className="text-white font-serif font-bold text-sm leading-tight text-center max-w-[200px] overflow-hidden text-ellipsis">
                                    {title}
                                </span>
                                {author && (
                                    <span className="text-white/40 text-[10px] uppercase tracking-wider font-bold">
                                        {author}
                                    </span>
                                )}
                                {status === 'remote' && downloadCount !== undefined && (
                                    <div className="mt-1 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/5">
                                        <div className={`w-1 h-1 rounded-full ${isHype ? 'bg-amber-400 animate-pulse' : 'bg-white/30'}`} />
                                        <span className="text-[9px] font-bold text-white/50 tracking-wider">
                                            {formatDownloadCount(downloadCount)} READS
                                        </span>
                                    </div>
                                )}
                            </div>
                        </Html>
                    )}
                </group>
            </group>
        </group>
    );
};

export default BookMesh;