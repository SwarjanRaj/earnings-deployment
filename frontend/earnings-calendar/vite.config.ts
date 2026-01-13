import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  server: {
    port: 5173,
    host: true,
    hmr: {
      overlay: true,
      clientPort: 5173,
    },
    watch: {
      usePolling: true,
      interval: 1000,
    },
    // Configure server for SPA fallback
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        // Skip API routes, Vite assets, and static files
        if (req.url.startsWith('/api/') ||
          req.url.startsWith('/@') ||
          req.url.startsWith('/node_modules/') ||
          req.url.includes('.') ||
          req.url === '/') {
          return next();
        }

        // For all other routes (SPA routes), serve index.html
        req.url = '/index.html';
        next();
      });
    },
    proxy: {
      '/api/auth': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        cookieDomainRewrite: 'localhost',
        configure: (proxy: any, _options: any) => {
          proxy.on('proxyRes', (proxyRes: any, _req: any, res: any) => {
            const setCookieHeaders = proxyRes.headers['set-cookie'];
            if (setCookieHeaders) {
              res.setHeader('Set-Cookie', setCookieHeaders);
            }
          });
        },
      },
      '/api/users': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        cookieDomainRewrite: 'localhost',
        configure: (proxy: any, _options: any) => {
          proxy.on('proxyRes', (proxyRes: any, _req: any, res: any) => {
            const setCookieHeaders = proxyRes.headers['set-cookie'];
            if (setCookieHeaders) {
              res.setHeader('Set-Cookie', setCookieHeaders);
            }
          });
        },
      },
      // Admin Chat routes - Must go to adminservice (3002)
      '/api/admin/chat': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        cookieDomainRewrite: 'localhost',
        configure: (proxy: any, _options: any) => {
          proxy.on('proxyRes', (proxyRes: any, _req: any, res: any) => {
            const setCookieHeaders = proxyRes.headers['set-cookie'];
            if (setCookieHeaders) {
              res.setHeader('Set-Cookie', setCookieHeaders);
            }
          });
        },
      },
      '/api/admin': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        cookieDomainRewrite: 'localhost',
        configure: (proxy: any, _options: any) => {
          proxy.on('proxyRes', (proxyRes: any, _req: any, res: any) => {
            const setCookieHeaders = proxyRes.headers['set-cookie'];
            if (setCookieHeaders) {
              res.setHeader('Set-Cookie', setCookieHeaders);
            }
          });
        },
      },
      '/api/stock': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        cookieDomainRewrite: 'localhost',
        configure: (proxy: any, _options: any) => {
          proxy.on('proxyRes', (proxyRes: any, _req: any, res: any) => {
            const setCookieHeaders = proxyRes.headers['set-cookie'];
            if (setCookieHeaders) {
              res.setHeader('Set-Cookie', setCookieHeaders);
            }
          });
        },
      },
      '/api/earnings': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        cookieDomainRewrite: 'localhost',
        configure: (proxy: any, _options: any) => {
          proxy.on('proxyRes', (proxyRes: any, _req: any, res: any) => {
            const setCookieHeaders = proxyRes.headers['set-cookie'];
            if (setCookieHeaders) {
              res.setHeader('Set-Cookie', setCookieHeaders);
            }
          });
        },
      },

      // Chat HTTP routes go through gateway (port 3000)
      '/api/chat': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        cookieDomainRewrite: 'localhost',
        ws: false, // Disable WebSocket proxying for this route
        configure: (proxy: any, _options: any) => {
          proxy.on('proxyRes', (proxyRes: any, _req: any, res: any) => {
            const setCookieHeaders = proxyRes.headers['set-cookie'];
            if (setCookieHeaders) {
              res.setHeader('Set-Cookie', setCookieHeaders);
            }
          });
        },
      },
      // WebSocket connections (Socket.IO) go directly to adminservice (port 3002)
      '/socket.io': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        ws: true,
        configure: (proxy: any, _options: any) => {
          proxy.on('proxyRes', (proxyRes: any, _req: any, res: any) => {
            const setCookieHeaders = proxyRes.headers['set-cookie'];
            if (setCookieHeaders) {
              res.setHeader('Set-Cookie', setCookieHeaders);
            }
          });
        },
      },
      '/api/health': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        cookieDomainRewrite: 'localhost',
        configure: (proxy: any, _options: any) => {
          proxy.on('proxyRes', (proxyRes: any, _req: any, res: any) => {
            const setCookieHeaders = proxyRes.headers['set-cookie'];
            if (setCookieHeaders) {
              res.setHeader('Set-Cookie', setCookieHeaders);
            }
          });
        },
      },
    },
  },
})
