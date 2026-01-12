import { Link, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { dbInit } from "./lib/tauri";

export default function AppLayout() {
  useEffect(() => {
    void dbInit();
  }, []);

  return (
    <div className="appShell">
      <header className="topBar">
        <div className="topBarTitle">Shakespeare Reader</div>
        <nav className="topBarNav">
          <Link to="/" className="navLink">
            Library
          </Link>
          <Link to="/settings" className="navLink">
            Settings
          </Link>
        </nav>
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
