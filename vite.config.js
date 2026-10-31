import { defineConfig } from 'vite'

const routePaths = [
  '/app',
  '/emergency',
  '/app/check/url',
  '/app/check/message',
  '/app/check/image',
  '/app/assistant',
  '/awareness',
  '/awareness/article',
  '/app/profile',
  '/login',
  '/admin',
]

function cleanRouteFallback() {
  const rewrite = (req, _res, next) => {
    const requestUrl = req.url || '/'
    const url = new URL(requestUrl, 'http://localhost')
    const route = url.pathname.replace(/\/+$/, '') || '/'

    if (routePaths.includes(route)) {
      req.url = `${route}/index.html${url.search}`
    }

    next()
  }

  return {
    name: 'surakshit-gujarat-clean-route-fallback',
    configureServer(server) {
      server.middlewares.use(rewrite)
    },
    configurePreviewServer(server) {
      server.middlewares.use(rewrite)
    },
  }
}

export default defineConfig({
  plugins: [cleanRouteFallback()],
})
