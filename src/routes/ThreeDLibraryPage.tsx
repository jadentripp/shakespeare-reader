import React, { useMemo, useState, useCallback, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { TrendingUp, AlignLeft, User, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

import Bookcase from '../components/three/Bookcase';
import BookMesh, { type BookStatus } from '../components/three/BookMesh';
import { ReadingRoom } from '../components/three/ReadingRoom';
import { SearchOverlay } from '../components/three/SearchOverlay';
import { CollectionsMenu } from '../components/three/CollectionsMenu';
import { FocusedBookUI } from '../components/three/FocusedBookUI';
import { useLibrary } from '../hooks/useLibrary';
import { useNavigate } from '@tanstack/react-router';
import { authorsString, bestMobiUrl, coverUrl, type SortOption } from '../lib/gutenbergUtils';

// Constants for interaction
const TRASH_POSITION: [number, number, number] = [-6.2, 0.45, 0.5];
const TRASH_RADIUS = 1.5; // Increased for easier targeting with zoomed-out camera

// Drag manager to handle book movement between bookcases
// Uses smoothed screen-space delta tracking to prevent erratic mouse jumps
const DragManager: React.FC<{
  draggedBook: any;
  dragStartMouse: { x: number; y: number } | null;
  onDragUpdate: (offset: [number, number, number], isOverDropZone: boolean, isOverTrash: boolean) => void;
}> = ({ draggedBook, dragStartMouse, onDragUpdate }) => {
  const { mouse } = useThree();

  // Track previous mouse position to detect and reject erratic jumps
  const prevMouseRef = useRef<{ x: number; y: number } | null>(null);
  // Smoothed delta values to prevent jitter
  const smoothedDeltaRef = useRef({ x: 0, y: 0 });

  useFrame(() => {
    if (!draggedBook || !dragStartMouse) {
      // Reset refs when not dragging
      prevMouseRef.current = null;
      smoothedDeltaRef.current = { x: 0, y: 0 };
      return;
    }

    // Initialize previous mouse on first frame of drag
    if (!prevMouseRef.current) {
      prevMouseRef.current = { x: mouse.x, y: mouse.y };
    }

    // Detect erratic mouse jumps (> 0.25 units in a single frame is suspicious)
    const mouseJumpX = Math.abs(mouse.x - prevMouseRef.current.x);
    const mouseJumpY = Math.abs(mouse.y - prevMouseRef.current.y);
    const isErraticJump = mouseJumpX > 0.25 || mouseJumpY > 0.25;

    // Calculate raw delta from drag start
    const rawDeltaX = mouse.x - dragStartMouse.x;
    const rawDeltaY = mouse.y - dragStartMouse.y;

    // If erratic jump detected, don't update delta - keep previous smoothed value
    // Otherwise, smoothly interpolate toward the raw delta
    const smoothing = isErraticJump ? 0.02 : 0.4; // Very slow smoothing on jumps
    smoothedDeltaRef.current.x = THREE.MathUtils.lerp(smoothedDeltaRef.current.x, rawDeltaX, smoothing);
    smoothedDeltaRef.current.y = THREE.MathUtils.lerp(smoothedDeltaRef.current.y, rawDeltaY, smoothing);

    // Update previous mouse position (even on erratic frames, to track recovery)
    prevMouseRef.current = { x: mouse.x, y: mouse.y };

    const deltaX = smoothedDeltaRef.current.x;
    const deltaY = smoothedDeltaRef.current.y;

    // Convert screen delta to world units
    const DRAG_SENSITIVITY = 10;

    // Screen X → World X (left/right)
    const worldDeltaX = deltaX * DRAG_SENSITIVITY;

    // Calculate base Y movement from mouse
    const baseWorldDeltaY = deltaY * DRAG_SENSITIVITY * 0.6;

    // Parabolic arc for natural throwing motion, ONLY based on horizontal distance
    // This ensures that dragging purely down doesn't cause the book to pop "up"
    const horizontalDistance = Math.abs(deltaX);
    const normalizedDistance = Math.min(horizontalDistance / 1.5, 1);
    const arcHeight = 1.2;
    const arcLift = arcHeight * 4 * normalizedDistance * (1 - normalizedDistance);

    // Combine base Y with arc lift, but ONLY if not dragging intentionally downward
    const isDraggingDown = baseWorldDeltaY < -0.3;
    const worldDeltaY = isDraggingDown ? baseWorldDeltaY : (baseWorldDeltaY + arcLift);

    // Calculate where the book is in world space
    const bookcaseX = BOOKCASE_WIDTH / 2 + SHELF_GAP / 2;
    const worldBookX = draggedBook.position[0] + (draggedBook._isLocal ? -bookcaseX : bookcaseX);
    const worldBookY = draggedBook.position[1];

    const offset: [number, number, number] = [worldDeltaX, worldDeltaY, 0];
    const targetX = worldBookX + offset[0];
    const targetY = worldBookY + offset[1];

    // Check if target is over the left bookcase area (for dropping catalog books)
    const isOverShelf = targetX < -(SHELF_GAP / 2) &&
      targetX > -(BOOKCASE_WIDTH + SHELF_GAP / 2);

    // Trash detection: use proximity to trash position
    // TRASH_POSITION is [-6.2, 0.45, 0.5], TRASH_RADIUS is 1.5
    const distToTrash = Math.sqrt(
      Math.pow(targetX - TRASH_POSITION[0], 2) +
      Math.pow(targetY - TRASH_POSITION[1], 2)
    );
    const isOverTrash = distToTrash < TRASH_RADIUS;

    onDragUpdate(offset, isOverShelf, isOverTrash);
  });

  return null;
};

// Fixed camera position constants
// Shifted left to include trash bin, pulled back for wider view
const DEFAULT_CAMERA_TARGET = new THREE.Vector3(-1, 3, 0);

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
      // Fixed camera: always look at the center of the scene
      state.camera.lookAt(DEFAULT_CAMERA_TARGET);

      // Return to default FOV
      if (state.camera instanceof THREE.PerspectiveCamera) {
        state.camera.fov = THREE.MathUtils.lerp(state.camera.fov, 50, 0.04);
        state.camera.updateProjectionMatrix();
      }
    }
  });

  return null;
};

// Bookcase dimensions - shared by components and drag logic
const BOOKCASE_WIDTH = 5;
const BOOKCASE_HEIGHT = 6;
const BOOKCASE_ROWS = 3;
const SHELF_DEPTH = 1.2;
const SHELF_GAP = 0.8; // Gap between the two bookcases
const SHELF_THICKNESS = 0.06;
const BOOK_WIDTH = 0.5;
const BOOK_DEPTH = 0.14;
const BASE_BOOK_HEIGHT = 0.85;

const TrashBin: React.FC<{ isHovered: boolean; position: [number, number, number] }> = ({ isHovered, position }) => {
  return (
    <group position={position}>
      {/* Modern canister body */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.42, 0.42, 0.9, 32]} />
        <meshStandardMaterial
          color={isHovered ? "#ef4444" : "#1e1b18"}
          metalness={0.9}
          roughness={0.1}
          envMapIntensity={2}
        />
      </mesh>

      {/* Polished Chrome Lid */}
      <mesh position={[0, 0.46, 0]}>
        <cylinderGeometry args={[0.44, 0.44, 0.08, 32]} />
        <meshStandardMaterial color="#888" metalness={1} roughness={0.1} />
      </mesh>
      {/* Lid Handle */}
      <mesh position={[0, 0.52, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.08, 0.02, 16, 32, Math.PI]} />
        <meshStandardMaterial color="#aaa" metalness={1} roughness={0.1} />
      </mesh>

      {/* Modern Vertical Slots */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <group key={i} rotation={[0, (i * Math.PI) / 4, 0]}>
          <mesh position={[0.43, 0, 0]}>
            <boxGeometry args={[0.01, 0.6, 0.08]} />
            <meshStandardMaterial
              color={isHovered ? "#ff3333" : "#333"}
              emissive={isHovered ? "#ff0000" : "#000"}
              emissiveIntensity={isHovered ? 2 : 0}
            />
          </mesh>
        </group>
      ))}

      {/* Subtle bottom glow */}
      <pointLight
        position={[0, -0.4, 0]}
        intensity={isHovered ? 8 : 1}
        color={isHovered ? "#ff0000" : "#ffffff"}
        distance={2}
      />

      <Html position={[0, 1.2, 0]} center>
        <div className={`transition-[opacity,transform] duration-500 ${isHovered ? 'opacity-100 scale-110' : 'opacity-40 scale-100'}`}>
          <div className="flex flex-col items-center gap-1.5 pointer-events-none">
            <div className={`p-2.5 rounded-full backdrop-blur-md border ${isHovered ? 'bg-red-500/20 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.4)]' : 'bg-white/5 border-white/10'}`}>
              <Trash2 className={`w-5 h-5 ${isHovered ? 'text-red-400 animate-bounce' : 'text-white/40'}`} />
            </div>
            <span className={`text-[10px] font-bold tracking-[0.2em] uppercase drop-shadow-2xl ${isHovered ? 'text-red-400' : 'text-white/20'}`}>
              Discard Volume
            </span>
          </div>
        </div>
      </Html>
    </group>
  );
};

const SortSwitcher: React.FC<{
  current: SortOption;
  onSelect: (s: SortOption) => void
}> = ({ current, onSelect }) => {
  const options: { value: SortOption; label: string; icon: any }[] = [
    { value: 'relevance', label: 'Match', icon: Search },
    { value: 'popular', label: 'Popular', icon: TrendingUp },
    { value: 'author', label: 'Author', icon: User },
    { value: 'title', label: 'Title', icon: AlignLeft },
  ];

  return (
    <div className="flex bg-white/5 backdrop-blur-xl rounded-full p-1 border border-white/10 shadow-2xl pointer-events-auto">
      {options.map((opt) => {
        const Icon = opt.icon;
        const isActive = current === opt.value;
        return (
          <Button
            key={opt.value}
            variant="ghost"
            size="sm"
            onClick={() => onSelect(opt.value)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 h-auto rounded-full transition-[color,background-color] duration-300
              ${isActive
                ? "bg-white/10 text-white shadow-inner"
                : "text-white/40 hover:text-white/70 hover:bg-white/5"
              }
            `}
          >
            <Icon className={`h-3 w-3 ${isActive ? 'text-amber-400' : ''}`} />
            <span className="text-[10px] font-bold tracking-widest uppercase">{opt.label}</span>
          </Button>
        );
      })}
    </div>
  );
};

// Themed lighting that syncs with app appearance
const LibraryLighting: React.FC = () => {
  const isDarkMode = React.useSyncExternalStore(
    useCallback((callback) => {
      const observer = new MutationObserver((mutations) => {
        if (mutations.some((m) => m.attributeName === 'class')) {
          callback();
        }
      });
      observer.observe(document.documentElement, { attributes: true });
      return () => observer.disconnect();
    }, []),
    () => document.documentElement.classList.contains('dark'),
    () => false // Assume light mode on server
  );

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
  const {
    filteredBooks,
    catalogQuery,
    setCatalogQuery,
    handleSearch,
    catalogQ,
    catalogSearch,
    recentSearches,
    clearRecentSearches,
    sortedCatalogResults,
    catalogKey,
    setCatalogKey,
    activeCatalog,
    localGutenbergIds,
    progressByBookId,
    enqueue,
    queue,
    deleteBook,
    setPaused,
    resumeAll,
    sortBy,
    setSortBy,
  } = useLibrary();
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [focusedBook, setFocusedBook] = useState<any>(null);
  const [isZooming, setIsZooming] = useState(false);
  const [draggedBook, setDraggedBook] = useState<any>(null);
  const [dragOffset, setDragOffset] = useState<[number, number, number]>([0, 0, 0]);
  const [isOverDropZone, setIsOverDropZone] = useState(false);
  const [isOverTrash, setIsOverTrash] = useState(false);
  const [dragStartMouse, setDragStartMouse] = useState<{ x: number; y: number } | null>(null);
  const [recentDrops] = useState<Record<number, [number, number, number]>>({});
  const [hiddenBookIds, setHiddenBookIds] = useState<Set<number>>(new Set());
  // Flying animation: track books currently flying to destinations
  const [flyingBooks, setFlyingBooks] = useState<Record<string, { destination: [number, number, number]; onComplete: () => void }>>({});
  const dragEndProcessingRef = useRef(false);

  const bookcaseX = BOOKCASE_WIDTH / 2 + SHELF_GAP / 2;

  const shelfThickness = SHELF_THICKNESS;
  const bookWidth = BOOK_WIDTH;
  const baseBookHeight = BASE_BOOK_HEIGHT;

  // Position books in LOCAL coordinates (relative to bookcase center)
  const positionBooksOnShelf = (books: any[]) => {
    const rowHeight = BOOKCASE_HEIGHT / BOOKCASE_ROWS;
    const bookSpacing = bookWidth + 0.08; // Small gap between books
    const booksPerRow = Math.floor((BOOKCASE_WIDTH - 0.6) / bookSpacing);
    const result: any[] = [];

    // Fill from top row to bottom row
    for (let row = 0; row < BOOKCASE_ROWS; row++) {
      const rowBooks: any[] = [];
      for (let col = 0; col < booksPerRow; col++) {
        const bookIndex = row * booksPerRow + col;
        if (bookIndex >= books.length) break;
        rowBooks.push(books[bookIndex]);
      }

      // Start books from the left of the shelf
      const leftPadding = 0.3;
      const startX = -BOOKCASE_WIDTH / 2 + leftPadding + bookWidth / 2;

      // Correspondence: row 0 -> top shelf (visualRow 2 if rows=3)
      const visualRow = (BOOKCASE_ROWS - 1) - row;

      rowBooks.forEach((book, col) => {
        const bookIndex = row * booksPerRow + col;
        const heightScale = 0.9 + (bookIndex % 5) * 0.04; // 0.9 to 1.06
        const bookHeight = baseBookHeight * heightScale;

        // X: Starts from left padding
        const x = startX + col * bookSpacing;
        // Y: book center sits so bottom touches shelf top surface
        const shelfTopY = visualRow * rowHeight + shelfThickness / 2;
        const y = shelfTopY + bookHeight / 2;
        // Z: center book on shelf depth, slightly forward
        const z = SHELF_DEPTH * 0.1;

        result.push({
          ...book,
          position: [x, y, z] as [number, number, number],
          heightScale,
          bookHeight,
        });
      });
    }
    return result;
  };

  // Combine local books with queue items for immediate visual feedback
  const combinedLocalBooks = useMemo(() => {
    const localIds = new Set(filteredBooks.map(b => b.gutenberg_id));
    const queuedItems = queue
      .filter(t => !localIds.has(t.gutenbergId))
      .map(t => ({
        id: -t.gutenbergId, // Negative ID to avoid collisions
        gutenberg_id: t.gutenbergId,
        title: t.title,
        author: t.authors,
        cover_url: t.coverUrl,
        isQueued: true
      }));

    return [...filteredBooks, ...queuedItems];
  }, [filteredBooks, queue]);

  // Left shelf: My Library (local books + queue)
  const myLibraryBooks = useMemo(() => {
    return positionBooksOnShelf(combinedLocalBooks);
  }, [combinedLocalBooks]);

  // Right shelf: Catalog/Store (browsing results)
  const catalogBooks = useMemo(() => {
    return positionBooksOnShelf(sortedCatalogResults);
  }, [sortedCatalogResults]);


  const getBookStatus = useCallback((book: any): BookStatus => {
    const gutenbergId = book.gutenberg_id ?? book.id;
    if (queue.some(t => t.gutenbergId === gutenbergId && (t.status === 'downloading' || t.status === 'queued'))) {
      return 'downloading';
    }
    if (localGutenbergIds.has(gutenbergId)) {
      return 'local';
    }
    return 'remote';
  }, [localGutenbergIds, queue]);

  const getBookProgress = useCallback((book: any): number => {
    return progressByBookId.get(book.id) ?? 0;
  }, [progressByBookId]);

  const handleBookClick = useCallback((book: any) => {
    setFocusedBook(book);
  }, []);

  const handleReadBook = useCallback(() => {
    if (focusedBook) {
      setSelectedBook(focusedBook);
      setIsZooming(true);
      setFocusedBook(null);

      setTimeout(() => {
        navigate({ to: `/book/${focusedBook.id}` });
      }, 1500);
    }
  }, [focusedBook, navigate]);

  const handleDownloadBook = useCallback(async () => {
    if (focusedBook) {
      const gutenbergId = focusedBook.gutenberg_id ?? focusedBook.id;
      const mobiUrl = focusedBook.formats ? bestMobiUrl(focusedBook) : null;
      if (!mobiUrl) {
        console.warn('No MOBI URL available for this book');
        return;
      }
      enqueue({
        gutenbergId,
        title: focusedBook.title,
        authors: focusedBook.authors ? authorsString(focusedBook) : (focusedBook.author ?? 'Unknown'),
        publicationYear: null,
        coverUrl: focusedBook.formats ? coverUrl(focusedBook) : focusedBook.cover_url,
        mobiUrl,
      });
      setPaused(false);
      resumeAll();
    }
  }, [focusedBook, enqueue, setPaused, resumeAll]);

  const handleDeleteBook = useCallback(async () => {
    if (focusedBook) {
      await deleteBook(focusedBook.id);
      setFocusedBook(null);
    }
  }, [focusedBook, deleteBook]);

  const handleDragStart = useCallback((book: any, isLocal: boolean = false, mouseEvent?: any) => {
    // Capture normalized mouse position (-1 to 1) for the initial drag point
    // R3F events have .nativeEvent for the actual DOM event
    const nativeEvent = mouseEvent?.nativeEvent || mouseEvent;

    if (nativeEvent && typeof nativeEvent.clientX === 'number') {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const x = ((nativeEvent.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((nativeEvent.clientY - rect.top) / rect.height) * 2 + 1;
        setDragStartMouse({ x, y });
      }
    }
    setDraggedBook({ ...book, _isLocal: isLocal });
    setFocusedBook(null);
  }, []);

  const handleDragUpdate = useCallback((offset: [number, number, number], isOverShelf: boolean, isOverTrash: boolean) => {
    setDragOffset(offset);
    setIsOverDropZone(isOverShelf);
    setIsOverTrash(isOverTrash);
  }, []);

  const handleDragEnd = useCallback(async (book: any) => {
    if (dragEndProcessingRef.current) return;
    dragEndProcessingRef.current = true;

    const bookKey = `${book.id}-${book._isLocal ? 'local' : 'catalog'}`;

    // Detect click vs drag (micro-movement check)
    const moveDistance = Math.sqrt(dragOffset[0] * dragOffset[0] + dragOffset[1] * dragOffset[1] + dragOffset[2] * dragOffset[2]);
    const isClick = moveDistance < 0.15; // Threshold for click vs drag

    if (isClick) {
      handleBookClick(book);
      // Reset drag state immediately for clicks
      setDraggedBook(null);
      setDragOffset([0, 0, 0]);
      setDragStartMouse(null);
      setIsOverDropZone(false);
      setIsOverTrash(false);
      dragEndProcessingRef.current = false;
      return;
    }

    if (isOverTrash && book._isLocal) {
      // Start flying animation to trash
      const trashDestinationX = TRASH_POSITION[0] + bookcaseX;
      const trashDestinationY = TRASH_POSITION[1] + 0.1;
      const trashDestinationZ = TRASH_POSITION[2];

      const trashDestination: [number, number, number] = [trashDestinationX, trashDestinationY, trashDestinationZ];

      setFlyingBooks(prev => ({
        ...prev,
        [bookKey]: {
          destination: trashDestination,
          onComplete: async () => {
            // Hide the book optimistically so it doesn't snap back to shelf
            setHiddenBookIds(prev => {
              const next = new Set(prev);
              next.add(book.id);
              return next;
            });

            await deleteBook(book.id);
            setFlyingBooks(prev => {
              const next = { ...prev };
              delete next[bookKey];
              return next;
            });
          }
        }
      }));
    } else if (isOverDropZone && !book._isLocal) {
      // Catalog book dropped on library shelf - trigger download with flying animation
      const gutenbergId = book.gutenberg_id ?? book.id;

      // Calculate the approximate next free spot on the top shelf
      const rowHeight = BOOKCASE_HEIGHT / BOOKCASE_ROWS;
      const bookSpacing = BOOK_WIDTH + 0.08;
      const booksPerRow = Math.floor((BOOKCASE_WIDTH - 0.6) / bookSpacing);

      // Determine where this book will likely land (first shelf with space)
      const targetRow = Math.floor(myLibraryBooks.length / booksPerRow);
      const targetCol = myLibraryBooks.length % booksPerRow;

      const visualRow = (BOOKCASE_ROWS - 1) - (targetRow < BOOKCASE_ROWS ? targetRow : 0);
      const startX = -BOOKCASE_WIDTH / 2 + 0.3 + BOOK_WIDTH / 2;

      const x = startX + targetCol * bookSpacing;
      const shelfTopY = visualRow * rowHeight + SHELF_THICKNESS / 2;
      const y = shelfTopY + BASE_BOOK_HEIGHT / 2;
      const z = SHELF_DEPTH * 0.1;

      // Convert destination (local to left bookcase) to be relative to the origin of the RIGHT bookcase
      // Left bookcase is at -bookcaseX, Right bookcase is at bookcaseX
      // So the horizontal offset to add is -2 * bookcaseX
      const libraryDestination: [number, number, number] = [x - 2 * bookcaseX, y, z];

      setHiddenBookIds(prev => {
        const next = new Set(prev);
        // For catalog books, we use gutenbergId or negative ID if needed, but here we used gutenbergId
        next.add(gutenbergId);
        return next;
      });

      setFlyingBooks(prev => ({
        ...prev,
        [bookKey]: {
          destination: libraryDestination,
          onComplete: () => {
            const mobiUrl = book.formats ? bestMobiUrl(book) : null;
            if (mobiUrl) {
              enqueue({
                gutenbergId,
                title: book.title,
                authors: book.authors ? authorsString(book) : (book.author ?? 'Unknown'),
                publicationYear: null,
                coverUrl: book.formats ? coverUrl(book) : book.cover_url,
                mobiUrl,
              });
              setPaused(false);
              resumeAll();
            }

            setFlyingBooks(prev => {
              const next = { ...prev };
              delete next[bookKey];
              return next;
            });

            setTimeout(() => {
              setHiddenBookIds(prev => {
                const next = new Set(prev);
                next.delete(gutenbergId);
                return next;
              });
            }, 500);
          }
        }
      }));
    }

    setDraggedBook(null);
    setDragOffset([0, 0, 0]);
    setDragStartMouse(null);
    setIsOverDropZone(false);
    setIsOverTrash(false);

    // Reset the processing flag after a short delay to allow state updates to settle
    setTimeout(() => {
      dragEndProcessingRef.current = false;
    }, 100);
  }, [isOverDropZone, isOverTrash, deleteBook, enqueue, setPaused, resumeAll, bookcaseX, dragOffset, myLibraryBooks]);


  return (
    <div
      className="w-full h-full bg-[#0a0908] overflow-hidden"
      onPointerUp={() => {
        // Global pointer up handler - captures releases anywhere, including empty space
        if (draggedBook) {
          handleDragEnd(draggedBook);
        }
      }}
    >
      <Canvas
        shadows
        gl={{ antialias: true, alpha: true }}
        camera={{ position: [-1.5, 5, 18], fov: 65 }}
        onPointerMissed={() => {
          // Fires when clicking on empty space in the canvas
          if (draggedBook) {
            handleDragEnd(draggedBook);
          }
        }}
      >
        <CameraController targetBook={selectedBook} isZooming={isZooming} />
        <DragManager draggedBook={draggedBook} dragStartMouse={dragStartMouse} onDragUpdate={handleDragUpdate} />
        <LibraryLighting />

        <group position={[0, 0, 0]} onPointerUp={(e) => {
          if (draggedBook) {
            e.stopPropagation();
            handleDragEnd(draggedBook);
          }
        }}>
          <ReadingRoom />
          <TrashBin isHovered={isOverTrash} position={TRASH_POSITION} />

          {/* Left Bookcase - My Library */}
          <group position={[-bookcaseX, 0, 0]}>
            <Html position={[0, BOOKCASE_HEIGHT + 0.5, 0]} center>
              <div className="px-5 py-2 bg-emerald-500/10 backdrop-blur-xl border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-bold tracking-widest uppercase flex items-center gap-2 whitespace-nowrap shadow-2xl">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                My Library
              </div>
            </Html>
            <Bookcase
              width={BOOKCASE_WIDTH}
              height={BOOKCASE_HEIGHT}
              rows={BOOKCASE_ROWS}
              depth={SHELF_DEPTH}
              shelfThickness={SHELF_THICKNESS}
            />
            {isOverDropZone && (
              <mesh position={[0, BOOKCASE_HEIGHT / 2, 0]}>
                <boxGeometry args={[BOOKCASE_WIDTH + 0.2, BOOKCASE_HEIGHT + 0.2, SHELF_DEPTH + 0.1]} />
                <meshStandardMaterial color="#22d3ee" transparent opacity={0.1} wireframe />
                <pointLight position={[0, 0, 1]} intensity={5} color="#22d3ee" />
              </mesh>
            )}
            {myLibraryBooks.map((book: any, index: number) => {
              const status = getBookStatus(book);
              const progress = getBookProgress(book);
              const downloadProgress = book.downloadProgress ?? 0;
              const gId = book.gutenberg_id ?? book.id;
              const isDragging = draggedBook?.id === book.id;
              const bookKey = `${book.id}-local`;
              const flyInfo = flyingBooks[bookKey];

              // Hide if in the hidden set AND not currently dragging/flying (except for trash flight where we want to keep rendering until it's done)
              // Actually, for trash flight:
              // 1. Drag ends -> flyInfo created.
              // 2. onComplete -> add to hidden, remove flyInfo.
              // So if hidden AND !flyInfo, we don't render.
              // If hidden AND flyInfo (trash flight active), we DO render.
              if (hiddenBookIds.has(book.id) && !isDragging && !flyInfo) return null;

              return (
                <BookMesh
                  key={gId ?? index}
                  title={book.title}
                  coverUrl={book.cover_url ?? book.formats?.['image/jpeg']}
                  position={book.position}
                  index={index}
                  isSelected={selectedBook?.id === book.id}
                  onClick={() => handleBookClick(book)}
                  height={book.bookHeight}
                  width={BOOK_WIDTH}
                  depth={BOOK_DEPTH}
                  status={status}
                  progress={progress}
                  downloadProgress={downloadProgress}
                  author={book.author}
                  initialOffset={recentDrops[gId]}
                  draggable={status === 'local'}
                  onDragStart={(e) => handleDragStart(book, true, e)}
                  isDragging={isDragging}
                  dragOffset={isDragging ? dragOffset : [0, 0, 0]}
                  flyingTo={flyInfo?.destination ?? null}
                  onFlyComplete={flyInfo?.onComplete}
                />
              );
            })}
          </group>

          {/* Right Bookcase - Catalog/Store */}
          <group position={[bookcaseX, 0, 0]}>
            <Html position={[0, BOOKCASE_HEIGHT + 0.5, 0]} center>
              <div className="px-5 py-2 bg-amber-500/10 backdrop-blur-xl border border-amber-500/20 rounded-full text-amber-400 text-xs font-bold tracking-widest uppercase flex items-center gap-2 whitespace-nowrap shadow-2xl">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Gutenberg Catalog
              </div>
            </Html>
            <Bookcase
              width={BOOKCASE_WIDTH}
              height={BOOKCASE_HEIGHT}
              rows={BOOKCASE_ROWS}
              depth={SHELF_DEPTH}
              shelfThickness={SHELF_THICKNESS}
            />
            {catalogBooks.map((book: any, index: number) => {
              const status = getBookStatus(book);
              const progress = getBookProgress(book);
              const isDragging = draggedBook?.id === book.id;
              const gId = book.gutenberg_id ?? book.id;
              const bookKey = `${book.id}-catalog`;
              const flyInfo = flyingBooks[bookKey];

              if (hiddenBookIds.has(gId) && !isDragging && !flyInfo) return null;

              return (
                <BookMesh
                  key={gId ?? index + 100}
                  title={book.title}
                  coverUrl={book.cover_url ?? book.formats?.['image/jpeg']}
                  position={book.position}
                  index={index + 100}
                  isSelected={selectedBook?.id === book.id}
                  onClick={() => handleBookClick(book)}
                  height={book.bookHeight}
                  width={BOOK_WIDTH}
                  depth={BOOK_DEPTH}
                  status={status}
                  progress={progress}
                  draggable={status === 'remote'}
                  onDragStart={(e) => handleDragStart(book, false, e)}
                  isDragging={isDragging}
                  dragOffset={isDragging ? dragOffset : [0, 0, 0]}
                  author={book.authors ? authorsString(book).split(' (')[0] : book.author}
                  downloadCount={book.download_count}
                  flyingTo={flyInfo?.destination ?? null}
                  onFlyComplete={flyInfo?.onComplete}
                />
              );
            })}
          </group>
        </group>


      </Canvas>

      {/* UI Overlay */}
      <div className={`absolute inset-0 pointer-events-none transition-all duration-1000 ${isZooming ? 'opacity-0' : 'opacity-100'}`}>
        {/* Top-Left: Library Stats */}
        <div className="absolute top-12 left-8 flex flex-col gap-1 drop-shadow-2xl">
          <h1 className="text-2xl font-serif font-bold text-white tracking-tight leading-none mb-1">
            The Reading Room
          </h1>
          <div className="flex items-center gap-3 text-[10px] font-bold tracking-widest uppercase">
            <span className="text-emerald-400/90">{filteredBooks.length} Local</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span className="text-amber-400/90">{sortedCatalogResults.length} Catalog</span>
          </div>
        </div>

        {/* Top-Center: Integrated Search */}
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 pointer-events-auto flex flex-col items-center gap-4">
          <div className="relative group w-full">
            {/* Subtle glow behind search */}
            <div className="absolute -inset-2 bg-gradient-to-r from-amber-500/10 to-emerald-500/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition duration-1000" />
            <div className="relative">
              <SearchOverlay
                catalogQuery={catalogQuery}
                setCatalogQuery={setCatalogQuery}
                handleSearch={handleSearch}
                isSearching={catalogQ.isFetching}
                recentSearches={recentSearches}
                clearRecentSearches={clearRecentSearches}
                catalogSearch={catalogSearch}
                onClearSearch={() => setCatalogQuery("")}
              />
            </div>
          </div>

          <SortSwitcher current={sortBy} onSelect={setSortBy} />
        </div>

        {/* Collections Menu - simplified */}
        <CollectionsMenu
          catalogKey={catalogKey}
          setCatalogKey={setCatalogKey}
          activeCatalog={activeCatalog}
        />
      </div>

      {/* Focused Book UI */}
      {focusedBook && !isZooming && (
        <FocusedBookUI
          book={focusedBook}
          status={getBookStatus(focusedBook)}
          progress={getBookProgress(focusedBook)}
          onRead={handleReadBook}
          onDownload={handleDownloadBook}
          onDelete={handleDeleteBook}
          onClose={() => setFocusedBook(null)}
        />
      )}

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