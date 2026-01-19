import React, { useMemo, useState, useCallback, useEffect } from 'react';
import WebGPUScene from '../components/three/WebGPUScene';
import { OrbitControls } from '@react-three/drei';
import Bookcase from '../components/three/Bookcase';
import ReadingDesk from '../components/three/ReadingDesk';
import BookMesh from '../components/three/BookMesh';
import { ReadingRoom } from '../components/three/ReadingRoom';
import { useLibrary } from '../hooks/useLibrary';
import { useNavigate } from '@tanstack/react-router';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Camera controller with smooth transitions
const CameraController: React.FC<{ targetBook: any; isZooming: boolean }> = ({ targetBook, isZooming }) => {
  useFrame((state) => {
    if (isZooming && targetBook) {
      const targetPos = new THREE.Vector3(...targetBook.position);
      // Adjust target to look at the center of the taller book
      targetPos.y += 0.45;
      
      const zoomPos = targetPos.clone().add(new THREE.Vector3(0, 0, 2.0));

      state.camera.position.lerp(zoomPos, 0.04);
      state.camera.lookAt(targetPos);
      
      // Cinematic FOV narrowing
      if (state.camera instanceof THREE.PerspectiveCamera) {
        state.camera.fov = THREE.MathUtils.lerp(state.camera.fov, 35, 0.04);
        state.camera.updateProjectionMatrix();
      }
    } else {
        // Return to default FOV
        if (state.camera instanceof THREE.PerspectiveCamera) {
            state.camera.fov = THREE.MathUtils.lerp(state.camera.fov, 50, 0.04);
            state.camera.updateProjectionMatrix();
        }
    }
  });

  return null;
};

// Themed lighting that syncs with app appearance
const LibraryLighting: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          setIsDarkMode(document.documentElement.classList.contains('dark'));
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  // Natural Day vs Warm Night colors
  const ambientColor = isDarkMode ? "#3d2b1f" : "#FFF5E6";
  const mainLightColor = isDarkMode ? "#ffaa66" : "#FFFFFF";
  const pointLightColor = isDarkMode ? "#ff7722" : "#FFE4CC";
  const ambientIntensity = isDarkMode ? 0.8 : 1.5;

  return (
    <>
      <ambientLight intensity={ambientIntensity} color={ambientColor} />

      {/* Main overhead light */}
      <directionalLight
        position={[5, 15, 10]}
        intensity={isDarkMode ? 2 : 4}
        color={mainLightColor}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      {/* Front fill light */}
      <spotLight
        position={[0, 8, 12]}
        angle={0.6}
        penumbra={0.5}
        intensity={isDarkMode ? 40 : 100}
        color={pointLightColor}
        castShadow
      />

      {/* Accent shelf light */}
      <pointLight position={[0, 4, 3]} intensity={isDarkMode ? 10 : 20} color={pointLightColor} distance={10} />
      
      {/* Warm glow from the side */}
      <pointLight position={[-10, 5, 5]} intensity={isDarkMode ? 15 : 30} color={pointLightColor} distance={20} />
    </>
  );
};

const ThreeDLibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const { filteredBooks, booksInProgress } = useLibrary();
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [isZooming, setIsZooming] = useState(false);

  // Bookcase dimensions
  const bookcaseWidth = 8;
  const bookcaseHeight = 6;
  const bookcaseRows = 3;
  const shelfDepth = 1.2;

  const booksWithPositions = useMemo(() => {
    const rowHeight = bookcaseHeight / bookcaseRows;
    const bookSpacing = 0.55;
    const booksPerRow = Math.floor((bookcaseWidth - 1) / bookSpacing);

    // Filter out books that are on the desk
    const deskBookIds = new Set(booksInProgress.slice(0, 3).map(b => b.id));
    const shelfBooks = filteredBooks.filter(b => !deskBookIds.has(b.id));

    const result: any[] = [];

    for (let row = 0; row < bookcaseRows; row++) {
      for (let col = 0; col < booksPerRow; col++) {
        const bookIndex = row * booksPerRow + col;
        if (bookIndex >= shelfBooks.length) break;

        const book = shelfBooks[bookIndex];
        const heightVariation = 0.85 + (bookIndex % 5) * 0.05;

        const x = -bookcaseWidth / 2 + 0.6 + col * bookSpacing;
        const y = row * rowHeight + 0.55; // Sit on shelf correctly
        const z = shelfDepth * 0.15; 

        result.push({
          ...book,
          position: [x, y, z] as [number, number, number],
          heightScale: heightVariation,
        });
      }
    }

    return result;
  }, [filteredBooks, booksInProgress, bookcaseWidth, bookcaseHeight, bookcaseRows]);

  const deskBooksWithPositions = useMemo(() => {
    const recentBooks = booksInProgress.slice(0, 3);
    const deskY = 1.8 + 0.075; // Surface height + half book thickness (if lying flat) or base
    const deskZ = 5; // Desk position Z
    
    return recentBooks.map((book, i) => {
        // Lay them flat or stand them up? 
        // Let's stand them up slightly angled for visibility
        const spacing = 0.8;
        const x = (i - (recentBooks.length - 1) / 2) * spacing;
        
        return {
            ...book,
            position: [x, deskY + 0.5, deskZ] as [number, number, number],
            rotation: [0, -0.2 + (i * 0.2), 0] as [number, number, number],
            heightScale: 1.0,
        };
    });
  }, [booksInProgress]);

  const handleBookClick = useCallback((book: any) => {
    setSelectedBook(book);
    setIsZooming(true);

    setTimeout(() => {
      navigate({ to: `/book/${book.id}` });
    }, 2000);
  }, [navigate]);

  return (
    <div className="w-full h-[calc(100vh-3rem)] bg-[#0a0908] overflow-hidden">
      <WebGPUScene>
        <CameraController targetBook={selectedBook} isZooming={isZooming} />
        <LibraryLighting />

        <group position={[0, 0, 0]}>
          <ReadingRoom />
          
          <group position={[0, 0, -0.2]}>
             <Bookcase
                width={bookcaseWidth}
                height={bookcaseHeight}
                rows={bookcaseRows}
                depth={shelfDepth}
              />

              {booksWithPositions.map((book: any, index: number) => (
                <BookMesh
                  key={book.id}
                  title={book.title}
                  coverUrl={book.cover_url}
                  position={book.position}
                  index={index}
                  isSelected={selectedBook?.id === book.id}
                  onClick={() => handleBookClick(book)}
                  height={1.0 * book.heightScale}
                  width={0.65}
                  depth={0.16}
                />
              ))}
          </group>

          <group position={[0, 0, 5]}>
             <ReadingDesk />
             {deskBooksWithPositions.map((book: any, index: number) => (
                <BookMesh
                  key={book.id}
                  title={book.title}
                  coverUrl={book.cover_url}
                  position={[book.position[0], book.position[1], 0]} // Relative to desk group
                  rotation={book.rotation}
                  index={index + 100}
                  isSelected={selectedBook?.id === book.id}
                  onClick={() => handleBookClick(book)}
                  height={1.0}
                  width={0.65}
                  depth={0.16}
                />
              ))}
          </group>
        </group>

        {!isZooming && (
          <OrbitControls
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={Math.PI / 2.1}
            enablePan={false}
            minDistance={4}
            maxDistance={12}
            target={[0, 2.5, 0]}
            enableDamping
            dampingFactor={0.05}
          />
        )}
      </WebGPUScene>

      {/* UI Overlay */}
      <div className={`absolute inset-0 pointer-events-none transition-all duration-1000 ${isZooming ? 'opacity-0' : 'opacity-100'}`}>
        <div className="absolute top-0 left-0 right-0 p-8 pt-12">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <div className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              <h1 className="text-4xl font-serif font-bold text-white tracking-tight">
                The Reading Room
              </h1>
              <p className="text-white/60 text-sm mt-1.5 font-medium tracking-wide uppercase">
                {filteredBooks.length || "No"} local volumes • Ambient Library
              </p>
            </div>

            <button
              onClick={() => navigate({ to: '/' })}
              className="pointer-events-auto px-6 py-2.5 bg-white/10 hover:bg-white/10 backdrop-blur-md border border-white/10 rounded-full text-white/90 text-sm font-semibold transition-all hover:scale-105 active:scale-95 shadow-xl"
            >
              Back to Library
            </button>
          </div>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
          <div className="bg-white/5 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 shadow-2xl">
            <p className="text-white/70 text-xs font-medium tracking-widest uppercase">
              Interact with the bookshelf to begin
            </p>
          </div>
        </div>
      </div>

      {isZooming && selectedBook && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-stone-950/90 backdrop-blur-2xl px-10 py-7 rounded-3xl border border-white/5 shadow-2xl animate-in fade-in zoom-in duration-500">
            <div className="flex flex-col items-center gap-6">
              <div className="w-12 h-12 border-3 border-white/10 border-t-amber-500 rounded-full animate-spin" />
              <div className="text-center">
                <p className="text-white/40 text-[10px] font-bold tracking-[0.2em] uppercase mb-1">Retrieving volume</p>
                <p className="text-white text-xl font-serif font-medium max-w-[300px] line-clamp-1">{selectedBook.title}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThreeDLibraryPage;