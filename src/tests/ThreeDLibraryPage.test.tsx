// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ThreeDLibraryPage from "../routes/ThreeDLibraryPage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock tauri
vi.mock("../lib/tauri", () => ({
  listBooks: vi.fn().mockResolvedValue([]),
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
}));

// Mock ThreeDLibraryPage internal components that use R3F hooks
vi.mock("../routes/ThreeDLibraryPage", async () => {
  const actual = await vi.importActual("../routes/ThreeDLibraryPage") as any;
  // We need to keep the default export but mock the internal parts that use hooks
  // Since they are not exported, we might need to mock them by proxy or mock the whole file 
  // and re-implement the structure for testing.
  return actual;
});

// Alternative: Mock @react-three/fiber hooks globally for this test
vi.mock("@react-three/fiber", async () => {
  const actual = await vi.importActual("@react-three/fiber") as any;
  return {
    ...actual,
    useFrame: vi.fn(),
    useThree: vi.fn(() => ({ camera: {}, scene: {}, gl: {} })),
  };
});

const queryClient = new QueryClient();

describe("ThreeDLibraryPage", () => {
  it("should render the 3D scene with ReadingRoom and Bookcase", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ThreeDLibraryPage />
      </QueryClientProvider>
    );
    
    expect(screen.getByTestId("webgpu-scene")).toBeDefined();
    expect(screen.getByTestId("reading-room")).toBeDefined();
    expect(screen.getByTestId("bookcase")).toBeDefined();
  });
});
