// Bun Fullstack Dev Server with HMR
// Uses HTML imports for automatic bundling, transpilation, and hot reloading

import { join } from 'node:path'
import homepage from './index.html'

const publicRoot = join(process.cwd(), 'public')

const sharedHeaders = {
  'Cross-Origin-Resource-Policy': 'same-origin',
}

const servePocketTts = async (req: Request) => {
  const url = new URL(req.url)
  const filePath = join(publicRoot, decodeURIComponent(url.pathname))
  if (!filePath.startsWith(publicRoot)) {
    return new Response('Not found', { status: 404 })
  }
  const file = Bun.file(filePath)
  if (!(await file.exists())) {
    return new Response('Not found', { status: 404 })
  }
  const headers = new Headers(sharedHeaders)
  if (file.type) headers.set('Content-Type', file.type)
  console.log(
    `[DEV-SERVER] /pocket-tts asset: ${url.pathname} (${file.type || 'unknown'}, ${file.size} bytes)`,
  )
  return new Response(file, { headers })
}

const server = Bun.serve({
  port: 1420,
  development: {
    hmr: true,
    console: true, // Stream browser console logs to terminal
  },

  routes: {
    '/': homepage,
    '/library': homepage,
    '/library/*': homepage,
    '/book/*': homepage,
    '/settings': homepage,
    '/tts-demo': homepage,
    '/pocket-tts/*': servePocketTts,
    '/api/*': () =>
      new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...sharedHeaders },
      }),
  },
})

console.log(`🚀 Bun dev server with HMR running at http://localhost:${server.port}`)
