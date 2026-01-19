import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterEach, beforeEach, mock } from "bun:test";
import React from "react";
import { cleanup } from "@testing-library/react";

try {
    GlobalRegistrator.register();
} catch (e) {
    // Ignore
}

// Ensure global objects are available for Testing Library
if (typeof global.window === 'undefined') {
    // Should be set by Happy DOM
}

// ResizeObserver mock
if (!global.ResizeObserver) {
    global.ResizeObserver = class {
        observe() { }
        unobserve() { }
        disconnect() { }
    };
}

// MutationObserver mock
if (!global.MutationObserver) {
    global.MutationObserver = class {
        observe() { }
        disconnect() { }
        takeRecords() { return []; }
    };
}

if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => { };
}

// Global Library Mocks to prevent module leakage and crashes
mock.module("@react-three/fiber", () => ({
    useFrame: mock(() => { }),
    useThree: mock(() => ({
        camera: {},
        scene: { add: mock(), remove: mock() },
        gl: { domElement: {} },
        mouse: { x: 0, y: 0 },
        raycaster: { setFromCamera: mock(), intersectObjects: mock(() => []) },
        size: { width: 1000, height: 1000 }
    })),
    Canvas: ({ children }: any) => React.createElement('div', { 'data-testid': 'canvas' }, children),
    extend: mock(() => { }),
}));

mock.module("@react-three/drei", () => ({
    OrbitControls: () => React.createElement('div', { 'data-testid': 'orbit-controls' }),
    Box: ({ children }: any) => React.createElement('div', { 'data-testid': 'drei-box' }, children),
    Cylinder: ({ children }: any) => React.createElement('div', { 'data-testid': 'drei-cylinder' }, children),
    Html: ({ children }: any) => React.createElement('div', { 'data-testid': 'drei-html' }, children),
    Text: ({ children }: any) => React.createElement('div', { 'data-testid': 'drei-text' }, children),
    Float: ({ children }: any) => React.createElement('div', { 'data-testid': 'drei-float' }, children),
    PerspectiveCamera: ({ children }: any) => React.createElement('div', { 'data-testid': 'drei-camera' }, children),
}));

mock.module("@tanstack/react-router", () => ({
    useNavigate: mock(() => mock(() => { })),
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => React.createElement('a', { href: to }, children),
    useParams: mock(() => ({})),
    useSearch: mock(() => ({})),
}));

beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    if (typeof window !== 'undefined' && window.document && window.document.body) {
        window.document.body.innerHTML = "";
    }
});

afterEach(() => {
    mock.restore();
});
