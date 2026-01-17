import { Link, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { dbInit } from "./lib/tauri";

export default function AppLayout() {
  useEffect(() => {
    void dbInit();
  }, []);

  const navBase = buttonVariants({ variant: "ghost", size: "sm" });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="text-lg font-semibold tracking-tight">AI Reader</div>
            <Separator orientation="vertical" className="h-6" />
            <nav className="flex items-center gap-2">
              <Link
                to="/"
                className={navBase}
                activeProps={{ className: cn(navBase, "bg-accent text-accent-foreground") }}
              >
                Library
              </Link>
              <Link
                to="/settings"
                className={navBase}
                activeProps={{ className: cn(navBase, "bg-accent text-accent-foreground") }}
              >
                Settings
              </Link>
            </nav>
          </div>
        </div>
      </header>
      <main className="min-h-[calc(100vh-3.5rem)] bg-muted/20">
        <Outlet />
      </main>
    </div>
  );
}
