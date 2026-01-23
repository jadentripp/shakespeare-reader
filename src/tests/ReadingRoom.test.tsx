import { describe, it, expect } from "bun:test";
import { render, screen } from "@testing-library/react";
import React from "react";
import { ReadingRoom } from "../components/three/ReadingRoom";

describe("ReadingRoom", () => {
  it("should render floor, walls and rug", () => {
    render(<ReadingRoom />);

    expect(screen.getByTestId("floor")).toBeDefined();
    expect(screen.getByTestId("back-wall")).toBeDefined();
    expect(screen.getByTestId("left-wall")).toBeDefined();
    expect(screen.getByTestId("right-wall")).toBeDefined();
    expect(screen.getByTestId("rug")).toBeDefined();
  });
});
