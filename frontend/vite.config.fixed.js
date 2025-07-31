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
    
    // Simple proxy configuration
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  
  // Simple build configuration
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
