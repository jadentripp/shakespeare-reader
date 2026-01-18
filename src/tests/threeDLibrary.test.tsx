// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import ThreeDLibraryPage from "../routes/ThreeDLibraryPage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

describe("ThreeDLibraryPage", () => {
  beforeEach(() => {
    cleanup();
  });

  it("should render the 3D Library placeholder", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ThreeDLibraryPage />
      </QueryClientProvider>
    );

    const placeholder = await screen.findByText(/3D Library/i);
    expect(placeholder).toBeDefined();
  });
});
