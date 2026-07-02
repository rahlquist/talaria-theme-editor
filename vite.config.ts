import { defineConfig, type Plugin, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Local API bridging the browser UI to the Hermes presets file on disk.
 *   GET  /api/themes → evaluated themes from presets.ts
 *   POST /api/themes → backup (yyyyddmm-epoch-presets.ts) + regenerate file
 *
 * Implemented as dev-server middleware so `npm run dev` is the whole app —
 * no separate backend process. The IO module is imported lazily through
 * Vite's ssrLoadModule so its TS runs without a build step.
 */
function hermesThemeApi(): Plugin {
  return {
    name: 'hermes-theme-api',
    configureServer(server: ViteDevServer) {
      const io = () => server.ssrLoadModule('/src/server/presets-io.ts')

      server.middlewares.use('/api/themes', (req, res) => {
        const fail = (status: number, error: unknown) => {
          res.statusCode = status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: String(error) }))
        }

        if (req.method === 'GET') {
          io()
            .then(m => m.loadThemes())
            .then(payload => {
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(payload))
            })
            .catch(err => fail(500, err))
          return
        }

        if (req.method === 'POST') {
          let body = ''
          req.on('data', chunk => (body += chunk))
          req.on('end', () => {
            Promise.resolve()
              .then(async () => {
                const { themes, defaultSkinName, maxBackups } = JSON.parse(body)
                if (!Array.isArray(themes) || themes.length === 0) throw new Error('themes must be a non-empty array')
                const m = await io()
                const { backupPath, pruned } = await m.saveThemes(
                  themes,
                  defaultSkinName ?? 'nous',
                  undefined,
                  typeof maxBackups === 'number' ? maxBackups : undefined
                )
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ ok: true, backupPath, pruned }))
              })
              .catch(err => fail(500, err))
          })
          return
        }

        fail(405, 'method not allowed')
      })
    }
  }
}

export default defineConfig({
  plugins: [react(), hermesThemeApi()],
  server: { port: 5199 }
})
