import { Link, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Settings, Box } from "lucide-react";
import { dbInit } from "./lib/tauri";

export default function AppLayout() {
  useEffect(() => {
    void dbInit();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/40">
        <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-4">
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
      <main className="min-h-[calc(100vh-3rem)] bg-muted/20">
        <Outlet />
      </main>
    </div>
  );
}
