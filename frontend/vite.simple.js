import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // Simple server configuration
  server: {
    port: 3000,
    host: true,
    cors: true,
    
    // Simple proxy configuration with fallbacks
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        // Add fallback handling for proxy errors
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            console.log('API proxy error:', err);
            if (!res.headersSent) {
              res.writeHead(500, {
                'Content-Type': 'application/json',
              });
              res.end(JSON.stringify({ 
                error: 'Backend connection failed', 
                message: 'API server unreachable, check if backend is running',
                fallback: true
              }));
            }
          });
        }
      }
    }
  },
  
  // Simplify the build config
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
