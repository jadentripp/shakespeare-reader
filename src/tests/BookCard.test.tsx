import { describe, it, expect, mock } from "bun:test";
import { render, screen } from "@testing-library/react";
import React from "react";

const mockLink = ({
  children,
  to,
  params,
}: {
  children: React.ReactNode;
  to: string;
  params?: { bookId: string };
}) => {
  const href = to.replace("$bookId", params?.bookId || "");
  return <a href={href}>{children}</a>;
};

mock.module("@tanstack/react-router", () => ({
  Link: mockLink,
}));

import { BookCard } from "../components/library/BookCard";

describe("BookCard", () => {
  const defaultProps = {
    id: 1,
    gutenbergId: 1000,
    title: "Test Book",
    authors: "Test Author",
    coverUrl: "http://example.com/cover.jpg",
    isLocal: true,
  };

  it("should render local book in grid variant by default", () => {
    render(<BookCard {...defaultProps} />);
    const card = screen.getByRole("link", { name: /Test Book/i }).closest("div");
    expect(screen.getByText("Test Book")).toBeDefined();
    expect(screen.getByText("Test Author")).toBeDefined();
  });

  it("should render catalog book in list variant", () => {
    const catalogProps = {
      ...defaultProps,
      isLocal: false,
    };
    render(<BookCard {...catalogProps} />);
    expect(screen.getByText("Test Book")).toBeDefined();
  });
});
