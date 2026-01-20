import { Link, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Settings, Box } from "lucide-react";
import { dbInit } from "./lib/tauri";
import { LibraryProvider } from "./hooks/LibraryProvider";

let didInit = false;

export default function AppLayout() {
  useEffect(() => {
    if (!didInit) {
      didInit = true;
      void dbInit();
    }
  }, []);

  return (
    <LibraryProvider>
      <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
        <header className="shrink-0 h-14 z-30 bg-background border-b-2 border-black dark:border-white">
          <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-6">
            <div className="flex items-center gap-10">
              <Link to="/" className="flex items-center gap-3">
                <div className="h-8 w-8 bg-black flex items-center justify-center dark:bg-white">
                  <span className="text-white text-[10px] font-black uppercase dark:text-black">AI</span>
                </div>
                <span className="font-sans text-xs font-black uppercase tracking-[0.3em] text-foreground">
                  Reader
                </span>
              </Link>
              <nav className="flex items-center gap-8">
                <Link
                  to="/3d-library"
                  className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-amber-500 transition-colors flex items-center gap-2"
                >
                  <Box className="h-3.5 w-3.5" />
                  3D SPACE
                </Link>
              </nav>
            </div>
            <Link to="/settings">
              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-10 rounded-none p-0 text-foreground hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </header>
        <main className="flex-1 min-h-0 bg-muted/20 relative overflow-hidden">
          <Outlet />
        </main>
      </div>
    </LibraryProvider>
  );
}
