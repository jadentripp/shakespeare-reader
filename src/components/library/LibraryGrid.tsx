import React from "react";

interface LibraryGridProps {
  children: React.ReactNode;
  variant?: "grid" | "list";
}

export function LibraryGrid({ children, variant = "grid" }: LibraryGridProps) {
  if (variant === "list") {
    return <div className="flex flex-col gap-4">{children}</div>;
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
      {children}
    </div>
  );
}

export function LibrarySkeleton({ count = 4, variant = "grid" }: { count?: number; variant?: "grid" | "list" }) {
  if (variant === "list") {
    return (
      <div className="flex flex-col gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex gap-4 rounded-xl border border-border/20 bg-card/50 p-4 animate-pulse">
            <div className="h-28 w-20 rounded-lg bg-stone-200 dark:bg-stone-800" />
            <div className="flex-1 space-y-3 py-1">
              <div className="h-5 w-3/4 rounded-md bg-stone-200 dark:bg-stone-800" />
              <div className="h-4 w-1/2 rounded-md bg-stone-100 dark:bg-stone-900" />
              <div className="flex gap-2 pt-2">
                <div className="h-5 w-16 rounded-full bg-stone-100 dark:bg-stone-900" />
                <div className="h-5 w-16 rounded-full bg-stone-100 dark:bg-stone-900" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border/20 bg-card/50 overflow-hidden animate-pulse">
          <div className="aspect-[2/3] w-full bg-stone-200 dark:bg-stone-800" />
          <div className="p-5 space-y-3">
            <div className="h-5 w-full rounded-md bg-stone-200 dark:bg-stone-800" />
            <div className="h-4 w-2/3 rounded-md bg-stone-100 dark:bg-stone-900" />
            <div className="pt-2 flex justify-between">
              <div className="h-8 w-20 rounded-md bg-stone-200 dark:bg-stone-800" />
              <div className="h-8 w-20 rounded-md bg-stone-200 dark:bg-stone-800" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}