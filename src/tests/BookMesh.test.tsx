// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import BookMesh from "../components/three/BookMesh";

// Mock R3F
vi.mock("@react-three/fiber", () => ({
  useFrame: vi.fn(),
}));

describe("BookMesh", () => {
  it("should render the book mesh and its components", () => {
    render(
      <BookMesh 
        title="Test Book" 
        index={0}
      />
    );
    
    // Check for the presence of the group or meshes using testId
    // I will add testIds to the new BookMesh implementation
    expect(screen.getByTestId("book-mesh-group")).toBeDefined();
    expect(screen.getByTestId("book-cover-mesh")).toBeDefined();
    expect(screen.getByTestId("page-block-mesh")).toBeDefined();
  });
});
