// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

// Mock three/webgpu before importing the component
vi.mock("three/webgpu", () => ({
  WebGPURenderer: vi.fn().mockImplementation(() => ({
    init: vi.fn().mockResolvedValue(undefined),
  })),
  extend: vi.fn(),
}));

import WebGPUScene from "../components/three/WebGPUScene";

// Mock @react-three/fiber Canvas
vi.mock("@react-three/fiber", async () => {
  const actual = await vi.importActual("@react-three/fiber");
  return {
    ...actual,
    Canvas: ({ children }: any) => <div data-testid="r3f-canvas">{children}</div>,
  };
});

describe("WebGPUScene", () => {
  it("should render the Canvas component", () => {
    const { getByTestId } = render(
      <WebGPUScene>
        <mesh data-testid="test-mesh" />
      </WebGPUScene>
    );
    expect(getByTestId("r3f-canvas")).toBeDefined();
  });
});
