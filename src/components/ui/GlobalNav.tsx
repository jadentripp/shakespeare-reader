import { Link, useLocation } from "@tanstack/react-router";
import { Box, Settings, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export function GlobalNav() {
  const location = useLocation();
  const is3D = location.pathname === "/3d-library";
  const isSettings = location.pathname === "/settings";
  const isHome = location.pathname === "/";
  const isBook = location.pathname.startsWith("/book/");

  if (isBook) return null;

  return (
    <div className="fixed top-6 right-8 z-[100] flex flex-row items-center justify-end gap-3 pointer-events-none touch-action-manipulation">
      {/* 2D Library / Home */}
      {!isHome && (
        <Link
          to="/"
          search={{ q: "", category: "collection-all" }}
          className="pointer-events-auto group flex h-10 items-center gap-2 border-2 border-black bg-background px-3 shadow-sm transition-[color,background-color,border-color,text-decoration-color,fill,stroke,opacity,box-shadow,transform] hover:bg-black hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-black"
          title="Library"
          aria-label="Go to Library"
        >
          <Home className="h-4 w-4" />
          <span className="hidden font-mono text-[10px] font-black uppercase tracking-[0.2em] group-hover:inline">
            LIBRARY
          </span>
        </Link>
      )}

      {/* 3D Space */}
      {!is3D && (
        <Link
          to="/3d-library"
          className="pointer-events-auto group flex h-10 items-center gap-2 border-2 border-black bg-background px-3 shadow-sm transition-[color,background-color,border-color,text-decoration-color,fill,stroke,opacity,box-shadow,transform] hover:bg-black hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-black"
          title="3D Space"
          aria-label="Go to 3D Space"
        >
          <Box className="h-4 w-4" />
          <span className="hidden font-mono text-[10px] font-black uppercase tracking-[0.2em] group-hover:inline">
            3D SPACE
          </span>
        </Link>
      )}

      {/* Settings */}
      <Link
        to="/settings"
        className={cn(
          "pointer-events-auto flex h-10 w-10 items-center justify-center border-2 border-black bg-background shadow-sm transition-[color,background-color,border-color,text-decoration-color,fill,stroke,opacity,box-shadow,transform] hover:bg-black hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-black",
          isSettings && "bg-black text-white dark:bg-white dark:text-black"
        )}
        title="Settings"
        aria-label="Open Settings"
      >
        <Settings className="h-4 w-4" />
      </Link>
    </div>
  );
}
