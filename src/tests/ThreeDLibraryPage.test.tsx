// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ThreeDLibraryPage from "../routes/ThreeDLibraryPage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LibraryProvider } from "../hooks/LibraryProvider";
import React from "react";

// Mock tauri
vi.mock("../lib/tauri", () => ({
  listBooks: vi.fn().mockResolvedValue([]),
  gutendexCatalogPage: vi.fn().mockResolvedValue({ results: [], count: 0 }),
}));

// Mock @tanstack/react-router
vi.mock("@tanstack/react-router", () => ({
  useNavigate: vi.fn(),
}));

// Mock WebGPUScene to avoid GL initialization in tests
vi.mock("../components/three/WebGPUScene", () => ({
  default: ({ children }: any) => <div data-testid="webgpu-scene">{children}</div>,
}));

// Mock Drei
vi.mock("@react-three/drei", () => ({
  OrbitControls: () => <div data-testid="orbit-controls" />,
  Box: ({ children }: any) => <div data-testid="drei-box">{children}</div>,
  Cylinder: ({ children }: any) => <div data-testid="drei-cylinder">{children}</div>,
}));

// Alternative: Mock @react-three/fiber hooks globally for this test
vi.mock("@react-three/fiber", async () => {
  const actual = await vi.importActual("@react-three/fiber") as any;
  return {
    ...actual,
    useFrame: vi.fn(),
    useThree: vi.fn(() => ({ camera: {}, scene: {}, gl: {} })),
  };
});

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
        }
    }
});

describe("ThreeDLibraryPage", () => {
  it("should render the 3D scene with ReadingRoom, Bookcase and ReadingDesk", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <LibraryProvider>
            <ThreeDLibraryPage />
        </LibraryProvider>
      </QueryClientProvider>
    );
    
    expect(screen.getByTestId("webgpu-scene")).toBeDefined();
    expect(screen.getByTestId("reading-room")).toBeDefined();
    expect(screen.getByTestId("bookcase")).toBeDefined();
    expect(screen.getByTestId("reading-desk")).toBeDefined();
  });
});