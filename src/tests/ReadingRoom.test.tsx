// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReadingRoom } from "../components/three/ReadingRoom";

// Mock R3F components since they are used outside of Canvas in this test
vi.mock("@react-three/fiber", () => ({
  useFrame: vi.fn(),
  useThree: vi.fn(),
}));

describe("ReadingRoom", () => {
  it("should render floor, walls and rug", () => {
    // In a real R3F test we'd use a special renderer, 
    // but for simple existence in jsdom with mocks:
    render(<ReadingRoom />);
    
    // We expect these to be in the document as part of the React tree
    // Note: mesh, planeGeometry etc aren't standard HTML tags so we might need to check by testId
    expect(screen.getByTestId("floor")).toBeDefined();
    expect(screen.getByTestId("back-wall")).toBeDefined();
    expect(screen.getByTestId("left-wall")).toBeDefined();
    expect(screen.getByTestId("right-wall")).toBeDefined();
    expect(screen.getByTestId("rug")).toBeDefined();
  });
});
