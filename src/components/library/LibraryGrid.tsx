import React from "react";

interface LibraryGridProps {
  children: React.ReactNode;
  variant?: "grid" | "list";
}

export function LibraryGrid({ children, variant = "grid" }: LibraryGridProps) {
  if (variant === "list") {
    return <div className="space-y-3">{children}</div>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {children}
    </div>
  );
}

export function LibrarySkeleton({ count = 4, variant = "grid" }: { count?: number; variant?: "grid" | "list" }) {
  if (variant === "list") {
    return (
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex gap-4 rounded-xl border border-border/40 bg-card p-4 animate-pulse">
            <div className="h-24 w-16 rounded-lg bg-muted" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-4 w-3/4 rounded bg-muted" />
              <div className="h-3 w-1/2 rounded bg-muted" />
              <div className="flex gap-2 pt-2">
                <div className="h-4 w-16 rounded bg-muted" />
                <div className="h-4 w-16 rounded bg-muted" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border/40 bg-card overflow-hidden animate-pulse">
          <div className="aspect-[2/3] w-full bg-muted" />
          <div className="p-4 space-y-2">
            <div className="h-4 w-full rounded bg-muted" />
            <div className="h-3 w-2/3 rounded bg-muted" />
            <div className="pt-2 flex justify-between">
              <div className="h-8 w-16 rounded bg-muted" />
              <div className="h-8 w-16 rounded bg-muted" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
