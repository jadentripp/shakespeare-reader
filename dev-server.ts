// Bun Fullstack Dev Server with HMR
// Uses HTML imports for automatic bundling, transpilation, and hot reloading

import homepage from "./index.html";

const server = Bun.serve({
  port: 1420,
  development: {
    hmr: true,
    console: true, // Stream browser console logs to terminal
  },

  routes: {
    "/": homepage,
    // Client-side routes - all serve the same SPA
    "/library": homepage,
    "/library/*": homepage,
    "/book/*": homepage,
    "/settings": homepage,
    // Wildcard fallback for SPA
    "/*": homepage,
  },

  async fetch(req) {
    const url = new URL(req.url);
    // console.log(`[DEV-SERVER] Request: ${url.pathname}`);

    // API routes can go here
    if (url.pathname.startsWith("/api/")) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Fallback if routes/static doesn't catch it (though /* should)
    return new Response("Not Found", { status: 404 });
  },
});

console.log(`🚀 Bun dev server with HMR running at http://localhost:${server.port}`);
