import { describe, it, expect, mock } from "bun:test";
import { render, screen } from "@testing-library/react";
import BookMesh from "../components/three/BookMesh";
import React from "react";

describe("BookMesh", () => {
  it("should render the book mesh and its components", () => {
    render(
      <BookMesh
        title="Test Book"
        index={0}
      />
    );

    expect(screen.getByTestId("book-mesh-group")).toBeDefined();
    expect(screen.getByTestId("book-cover-mesh")).toBeDefined();
    expect(screen.getByTestId("page-block-mesh")).toBeDefined();
  });
});
