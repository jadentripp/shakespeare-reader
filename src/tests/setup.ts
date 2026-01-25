import { afterEach, beforeEach, mock } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'
import React from 'react'

try {
  GlobalRegistrator.register()
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
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

// MutationObserver mock
if (!global.MutationObserver) {
  global.MutationObserver = class {
    observe() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  }
}

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}

// Global Library Mocks to prevent module leakage and crashes
mock.module('@react-three/fiber', () => ({
  useFrame: mock(() => {}),
  useThree: mock(() => ({
    camera: {},
    scene: { add: mock(), remove: mock() },
    gl: { domElement: {} },
    mouse: { x: 0, y: 0 },
    raycaster: { setFromCamera: mock(), intersectObjects: mock(() => []) },
    size: { width: 1000, height: 1000 },
  })),
  Canvas: ({ children }: any) => React.createElement('div', { 'data-testid': 'canvas' }, children),
  extend: mock(() => {}),
}))

mock.module('@react-three/drei', () => ({
  OrbitControls: () => React.createElement('div', { 'data-testid': 'orbit-controls' }),
  Box: ({ children }: any) => React.createElement('div', { 'data-testid': 'drei-box' }, children),
  Cylinder: ({ children }: any) =>
    React.createElement('div', { 'data-testid': 'drei-cylinder' }, children),
  Html: ({ children }: any) => React.createElement('div', { 'data-testid': 'drei-html' }, children),
  Text: ({ children }: any) => React.createElement('div', { 'data-testid': 'drei-text' }, children),
  Float: ({ children }: any) =>
    React.createElement('div', { 'data-testid': 'drei-float' }, children),
  PerspectiveCamera: ({ children }: any) =>
    React.createElement('div', { 'data-testid': 'drei-camera' }, children),
}))

mock.module('@tanstack/react-router', () => ({
  useNavigate: mock(() => mock(() => {})),
  Link: ({ children, to, params }: any) => {
    let href = to
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        href = href.replace(`$${key}`, String(value))
      }
    }
    return React.createElement('a', { href }, children)
  },
  useParams: mock(() => ({})),
  useSearch: mock(() => ({})),
  useRouterState: mock(() => ({
    location: { pathname: '/not-root', search: {} },
  })),
}))

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  if (typeof window !== 'undefined' && window.document && window.document.body) {
    window.document.body.innerHTML = ''
  }
})

afterEach(() => {
  mock.restore()
})

const originalConsoleError = console.error
console.error = (...args: any[]) => {
  const [first] = args
  if (typeof first === 'string') {
    if (
      first.includes('is using incorrect casing') ||
      first.includes('Received `true` for a non-boolean attribute `transparent`')
    ) {
      return
    }
  }
  originalConsoleError(...args)
}
