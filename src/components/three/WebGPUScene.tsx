import React, { Suspense } from 'react';
import * as THREE from 'three/webgpu';
import { Canvas, extend, ThreeElements } from '@react-three/fiber';

// Extend R3F with Three.js WebGPU nodes if needed
extend(THREE as any);

declare module '@react-three/fiber' {
  interface ThreeElements extends ThreeToJSXElements<typeof THREE> { }
}

interface WebGPUSceneProps {
  children: React.ReactNode;
  className?: string;
}

const WebGPUScene: React.FC<WebGPUSceneProps> = ({ children, className }) => {
  return (
    <div className={`w-full h-full ${className}`}>
      <Suspense fallback={null}>
        <Canvas
          shadows
          gl={async (props) => {
            // Initialize WebGPURenderer
            const renderer = new THREE.WebGPURenderer(props as any);
            await renderer.init();
            return renderer;
          }}
          camera={{ position: [0, 3, 8], fov: 50 }}
        >
          {children}
        </Canvas>
      </Suspense>
    </div>
  );
};

export default WebGPUScene;

// Helper type for JSX elements
type ThreeToJSXElements<T> = {
  [K in keyof T as K extends string ? Uncapitalize<K> : never]: T[K] extends new (...args: any[]) => any
  ? Partial<ThreeElements[K & keyof ThreeElements]> | { [P in keyof InstanceType<T[K]> as P extends string ? `args` | P : never]?: any }
  : never;
};
