import React, { useMemo, useState, useCallback, useEffect } from 'react';
import WebGPUScene from '../components/three/WebGPUScene';
import { OrbitControls } from '@react-three/drei';
import Bookcase from '../components/three/Bookcase';
import BookMesh from '../components/three/BookMesh';
import { useQuery } from '@tanstack/react-query';
import { listBooks } from '../lib/tauri';
import { useNavigate } from '@tanstack/react-router';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Camera controller with smooth transitions
const CameraController: React.FC<{ targetBook: any; isZooming: boolean }> = ({ targetBook, isZooming }) => {
  useFrame((state) => {
    if (isZooming && targetBook) {
      const targetPos = new THREE.Vector3(...targetBook.position);
      targetPos.y += 0.3;
      const zoomPos = targetPos.clone().add(new THREE.Vector3(0, 0.2, 2.5));

      state.camera.position.lerp(zoomPos, 0.04);
      state.camera.lookAt(targetPos);
    }
  });

  return null;
};

// Simple floor with rug
const LibraryFloor: React.FC = () => {
  return (
    <group>
      {/* Main floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#2a2520" roughness={0.8} metalness={0.1} />
      </mesh>

      {/* Decorative rug */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 3]} receiveShadow>
        <planeGeometry args={[10, 6]} />
        <meshStandardMaterial color="#4a3c2a" roughness={0.95} metalness={0} />
      </mesh>
    </group>
  );
};

// Bright, warm lighting
const LibraryLighting: React.FC = () => {
  return (
    <>
      {/* Strong ambient */}
      <ambientLight intensity={2} color="#FFF5E6" />

      {/* Main overhead light */}
      <directionalLight
        position={[0, 15, 10]}
        intensity={4}
        color="#FFFFFF"
        castShadow
      />

      {/* Front fill light - key light */}
      <spotLight
        position={[0, 8, 12]}
        angle={0.8}
        penumbra={0.3}
        intensity={80}
        color="#FFEEDD"
      />

      {/* Left fill */}
      <pointLight position={[-8, 6, 8]} intensity={40} color="#FFE4CC" distance={20} />

      {/* Right fill */}
      <pointLight position={[8, 6, 8]} intensity={40} color="#FFE4CC" distance={20} />

      {/* Back rim light */}
      <pointLight position={[0, 10, -5]} intensity={20} color="#FFEEDD" distance={25} />
    </>
  );
};

const ThreeDLibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: books = [] } = useQuery({ queryKey: ["books"], queryFn: listBooks });
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [isZooming, setIsZooming] = useState(false);

  // Bookcase dimensions
  const bookcaseWidth = 8;
  const bookcaseHeight = 6;
  const bookcaseRows = 3; // Less rows = bigger books
  const shelfDepth = 1.2;

  // Generate book positions - FILL THE SHELVES
  const booksWithPositions = useMemo(() => {
    const rowHeight = bookcaseHeight / bookcaseRows;
    const bookSpacing = 0.55; // More spacing
    const booksPerRow = Math.floor((bookcaseWidth - 1) / bookSpacing);

    // Rich sample book library with ACTUAL Gutenberg cover URLs
    const sampleBooks = [
      { id: 64317, title: "The Great Gatsby", cover_url: "https://www.gutenberg.org/cache/epub/64317/pg64317.cover.medium.jpg" },
      { id: 1984, title: "1984", cover_url: "https://www.gutenberg.org/cache/epub/1984/pg1984.cover.medium.jpg" },
      { id: 1342, title: "Pride and Prejudice", cover_url: "https://www.gutenberg.org/cache/epub/1342/pg1342.cover.medium.jpg" },
      { id: 960, title: "To Kill a Mockingbird", cover_url: "https://www.gutenberg.org/cache/epub/960/pg960.cover.medium.jpg" },
      { id: 45631, title: "The Catcher in the Rye", cover_url: "https://www.gutenberg.org/cache/epub/45631/pg45631.cover.medium.jpg" },
      { id: 7849, title: "Lord of the Flies", cover_url: "https://www.gutenberg.org/cache/epub/7849/pg7849.cover.medium.jpg" },
      { id: 940, title: "Animal Farm", cover_url: "https://www.gutenberg.org/cache/epub/940/pg940.cover.medium.jpg" },
      { id: 174, title: "The Picture of Dorian Gray", cover_url: "https://www.gutenberg.org/cache/epub/174/pg174.cover.medium.jpg" },
      { id: 345, title: "Dracula", cover_url: "https://www.gutenberg.org/cache/epub/345/pg345.cover.medium.jpg" },
      { id: 84, title: "Frankenstein", cover_url: "https://www.gutenberg.org/cache/epub/84/pg84.cover.medium.jpg" },
      { id: 1260, title: "Jane Eyre", cover_url: "https://www.gutenberg.org/cache/epub/1260/pg1260.cover.medium.jpg" },
      { id: 768, title: "Wuthering Heights", cover_url: "https://www.gutenberg.org/cache/epub/768/pg768.cover.medium.jpg" },
      { id: 1727, title: "The Odyssey", cover_url: "https://www.gutenberg.org/cache/epub/1727/pg1727.cover.medium.jpg" },
      { id: 2701, title: "Moby Dick", cover_url: "https://www.gutenberg.org/cache/epub/2701/pg2701.cover.medium.jpg" },
      { id: 2600, title: "War and Peace", cover_url: "https://www.gutenberg.org/cache/epub/2600/pg2600.cover.medium.jpg" },
      { id: 2554, title: "Crime and Punishment", cover_url: "https://www.gutenberg.org/cache/epub/2554/pg2554.cover.medium.jpg" },
      { id: 28054, title: "The Brothers Karamazov", cover_url: "https://www.gutenberg.org/cache/epub/28054/pg28054.cover.medium.jpg" },
      { id: 1399, title: "Anna Karenina", cover_url: "https://www.gutenberg.org/cache/epub/1399/pg1399.cover.medium.jpg" },
      { id: 996, title: "Don Quixote", cover_url: "https://www.gutenberg.org/cache/epub/996/pg996.cover.medium.jpg" },
      { id: 135, title: "Les Misérables", cover_url: "https://www.gutenberg.org/cache/epub/135/pg135.cover.medium.jpg" },
      { id: 1184, title: "The Count of Monte Cristo", cover_url: "https://www.gutenberg.org/cache/epub/1184/pg1184.cover.medium.jpg" },
      { id: 98, title: "A Tale of Two Cities", cover_url: "https://www.gutenberg.org/cache/epub/98/pg98.cover.medium.jpg" },
      { id: 1400, title: "Great Expectations", cover_url: "https://www.gutenberg.org/cache/epub/1400/pg1400.cover.medium.jpg" },
      { id: 730, title: "Oliver Twist", cover_url: "https://www.gutenberg.org/cache/epub/730/pg730.cover.medium.jpg" },
      { id: 766, title: "David Copperfield", cover_url: "https://www.gutenberg.org/cache/epub/766/pg766.cover.medium.jpg" },
      { id: 43, title: "The Strange Case of Dr Jekyll", cover_url: "https://www.gutenberg.org/cache/epub/43/pg43.cover.medium.jpg" },
      { id: 219, title: "Heart of Darkness", cover_url: "https://www.gutenberg.org/cache/epub/219/pg219.cover.medium.jpg" },
      { id: 45, title: "Anne of Green Gables", cover_url: "https://www.gutenberg.org/cache/epub/45/pg45.cover.medium.jpg" },
      { id: 11, title: "Alice's Adventures in Wonderland", cover_url: "https://www.gutenberg.org/cache/epub/11/pg11.cover.medium.jpg" },
      { id: 120, title: "Treasure Island", cover_url: "https://www.gutenberg.org/cache/epub/120/pg120.cover.medium.jpg" },
      { id: 1661, title: "Sherlock Holmes", cover_url: "https://www.gutenberg.org/cache/epub/1661/pg1661.cover.medium.jpg" },
      { id: 2542, title: "A Doll's House", cover_url: "https://www.gutenberg.org/cache/epub/2542/pg2542.cover.medium.jpg" },
      { id: 46, title: "A Christmas Carol", cover_url: "https://www.gutenberg.org/cache/epub/46/pg46.cover.medium.jpg" },
      { id: 74, title: "Adventures of Tom Sawyer", cover_url: "https://www.gutenberg.org/cache/epub/74/pg74.cover.medium.jpg" },
      { id: 76, title: "Adventures of Huckleberry Finn", cover_url: "https://www.gutenberg.org/cache/epub/76/pg76.cover.medium.jpg" },
    ];

    const displayBooks = books.length > 0 ? books : sampleBooks;
    console.log('📚 Books to display:', displayBooks.length, displayBooks.map(b => ({ id: b.id, title: b.title, cover_url: b.cover_url })));
    const result: any[] = [];

    // Fill each shelf with books
    for (let row = 0; row < bookcaseRows; row++) {
      for (let col = 0; col < booksPerRow; col++) {
        const bookIndex = row * booksPerRow + col;
        if (bookIndex >= displayBooks.length) break;

        const book = displayBooks[bookIndex];

        // Vary book heights for natural look
        const heightVariation = 0.85 + (bookIndex % 5) * 0.05;

        // Position on shelf - move forward to show covers!
        const x = -bookcaseWidth / 2 + 0.6 + col * bookSpacing;
        const y = row * rowHeight + 0.65; // Sit on shelf
        const z = shelfDepth * 0.35; // Move books forward to see covers

        result.push({
          ...book,
          position: [x, y, z] as [number, number, number],
          heightScale: heightVariation,
        });
      }
    }

    return result;
  }, [books, bookcaseWidth, bookcaseHeight, bookcaseRows]);

  const handleBookClick = useCallback((book: any) => {
    setSelectedBook(book);
    setIsZooming(true);

    setTimeout(() => {
      navigate({ to: `/book/${book.id}` });
    }, 2000);
  }, [navigate]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isZooming) {
        setIsZooming(false);
        setSelectedBook(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isZooming]);

  return (
    <div className="w-full h-screen bg-[#1a1815] overflow-hidden">
      <WebGPUScene>
        {/* Warm background */}
        <color attach="background" args={["#2a2520"]} />

        <CameraController targetBook={selectedBook} isZooming={isZooming} />
        <LibraryLighting />

        {/* Library Scene */}
        <group position={[0, 0, 0]}>
          <Bookcase
            width={bookcaseWidth}
            height={bookcaseHeight}
            rows={bookcaseRows}
            depth={shelfDepth}
          />

          {/* Render all books */}
          {booksWithPositions.map((book: any, index: number) => (
            <BookMesh
              key={book.id}
              title={book.title}
              coverUrl={book.cover_url}
              position={book.position}
              index={index}
              isSelected={selectedBook?.id === book.id}
              onClick={() => handleBookClick(book)}
              height={0.75 * book.heightScale}
              width={0.45}
              depth={0.12}
            />
          ))}
        </group>

        <LibraryFloor />

        {/* Controls */}
        {!isZooming && (
          <OrbitControls
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={Math.PI / 2.2}
            enablePan={false}
            minDistance={4}
            maxDistance={12}
            target={[0, 3, 0]}
            enableDamping
            dampingFactor={0.05}
          />
        )}
      </WebGPUScene>

      {/* UI Overlay */}
      <div className={`absolute inset-0 pointer-events-none transition-all duration-700 ${isZooming ? 'opacity-0' : 'opacity-100'}`}>
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/70 via-black/30 to-transparent">
          <div className="flex items-center justify-between max-w-5xl mx-auto">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                Your Library
              </h1>
              <p className="text-white/60 text-sm mt-1">
                {booksWithPositions.length} Classic Books • WebGPU Accelerated
              </p>
            </div>

            <button
              onClick={() => navigate({ to: '/' })}
              className="pointer-events-auto px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white/90 text-sm font-medium transition-all"
            >
              ← Back
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
          <div className="bg-black/50 backdrop-blur px-5 py-2.5 rounded-full border border-white/10">
            <p className="text-white/60 text-sm">
              <span className="text-white/90">Drag</span> to orbit •
              <span className="text-white/90"> Scroll</span> to zoom •
              <span className="text-white/90"> Click</span> any book
            </p>
          </div>
        </div>
      </div>

      {/* Loading overlay */}
      {isZooming && selectedBook && (
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <div className="bg-black/80 backdrop-blur-xl px-8 py-5 rounded-2xl border border-white/10">
            <div className="flex items-center gap-4">
              <div className="w-5 h-5 border-2 border-white/20 border-t-amber-400 rounded-full animate-spin" />
              <div>
                <p className="text-white font-medium">Opening...</p>
                <p className="text-white/50 text-sm truncate max-w-[200px]">{selectedBook.title}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThreeDLibraryPage;
