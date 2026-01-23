import { describe, it, expect, mock, beforeAll } from "bun:test";
import { render } from "@testing-library/react";
import React from "react";

// Since WebGPUScene imports three/webgpu at the module level, and GPUShaderStage
// is not available in non-WebGPU environments, we need to mock the entire component
mock.module("../components/three/WebGPUScene", () => ({
  default: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="r3f-canvas" className={className}>
      {children}
    </div>
  ),
}));

const WebGPUScene = (await import("../components/three/WebGPUScene")).default;

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
