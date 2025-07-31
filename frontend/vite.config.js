import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // Configure worker options
  worker: {
    format: 'es',
    plugins: () => [],
  },
  
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    open: false,
    cors: true,
    
    // HMR configuration
    hmr: {
      host: 'localhost',
      port: 24678,
      protocol: 'ws',
      overlay: true
    },
    
    // File watching for WSL2
    watch: {
      usePolling: true,
      interval: 100
    },
    
    // Proxy configuration
    proxy: {
      '/api': {
        // Target the local backend server
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
        ws: true,
        // Enhanced proxy configuration with better error handling
        configure: (proxy, _options) => {
          proxy.on('error', (err, req, res) => {
            console.error('[PROXY] Error:', err);
            if (!res.headersSent) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ 
                error: 'Proxy error',
                message: 'Failed to connect to the backend server',
                details: process.env.NODE_ENV === 'development' ? err.message : undefined
              }));
            }
          });
          
          // Log proxy requests in development
          if (process.env.NODE_ENV === 'development') {
            proxy.on('proxyReq', (proxyReq, req) => {
              console.log(`[PROXY] ${req.method} ${req.url} -> ${proxyReq.getHeader('host')}`);
            });
          }
        }
      }
    }
  },
  preview: {
    port: 5173,
    host: '0.0.0.0'
  },
  // Resolve path aliases
  resolve: {
    alias: {
      'monaco-editor': 'monaco-editor/esm/vs/editor/editor.api.js',
      // Add @ alias to point to src directory
      '@': '/src'
    }
  }
});
