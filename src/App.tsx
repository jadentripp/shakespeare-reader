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
        <header className="shrink-0 h-12 z-30 bg-background/80 backdrop-blur-md border-b border-border/40">
          <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4">
            <div className="flex items-center gap-6">
              <Link to="/" className="flex items-center gap-2 group">
                <div className="h-7 w-7 rounded-lg bg-foreground flex items-center justify-center">
                  <span className="text-background text-xs font-bold">AI</span>
                </div>
                <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors">
                  Reader
                </span>
              </Link>
              <Link
                to="/3d-library"
                className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
              >
                <Box className="h-3.5 w-3.5" />
                3D Library
              </Link>
            </div>
            <Link to="/settings">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </header>
        <main className="flex-1 min-h-0 bg-muted/20 relative overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </LibraryProvider>
  );
}
