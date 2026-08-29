import { createServer } from 'vite'

const server = await createServer({
  root: process.cwd(),
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
})
try {
  await server.ssrLoadModule('/src/smoke.jsx')
} finally {
  await server.close()
}
