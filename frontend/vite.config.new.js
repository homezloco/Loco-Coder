import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

// Load environment variables with fallbacks
function loadEnv() {
  const envFiles = [
    '.env.local',
    '.env.development',
    '.env'
  ];
  
  const env = {};
  
  // Default values
  env.VITE_API_URL = 'http://localhost:8000';
  env.VITE_API_FALLBACK_URL = 'http://127.0.0.1:8000';
  env.VITE_ENABLE_CLIENT_FALLBACKS = 'true';
  env.VITE_MAX_API_RETRIES = '3';
  
  // Try to load from env files
  for (const file of envFiles) {
    try {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        
        for (const line of lines) {
          const match = line.match(/^([\w.-]+)\s*=\s*(.*)$/i);
          if (match && match[1] && match[2]) {
            env[match[1]] = match[2].trim().replace(/^["'](.+)["']$/, '$1');
          }
        }
        console.log(`Loaded environment variables from ${file}`);
        break;
      }
    } catch (e) {
      console.warn(`Failed to load environment from ${file}:`, e);
    }
  }
  
  return env;
}

const env = loadEnv();

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  
  server: {
    port: 3000,
    host: true, // Listen on all addresses
    strictPort: true,
    cors: true,
    hmr: {
      overlay: true,
    },
    watch: {
      usePolling: true,
    },
    
    // Enhanced proxy configuration with multiple fallbacks
    proxy: {
      '/api': {
        target: env.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        configure: (proxy, options) => {
          // Track retry attempts per request
          const retryAttempts = new Map();
          const maxRetries = parseInt(env.VITE_MAX_API_RETRIES || '3');
          
          // Track available API endpoints
          const apiEndpoints = [
            env.VITE_API_URL || 'http://localhost:8000',
            env.VITE_API_FALLBACK_URL || 'http://127.0.0.1:8000',
            'http://localhost:8000', // Additional fallback
          ].filter((url, index, self) => self.indexOf(url) === index); // Remove duplicates
          
          proxy.on('error', (err, req, res) => {
            console.log('Proxy error:', err);
            
            // Get or initialize retry count for this request
            const requestId = req.url + (req.headers['x-request-id'] || Math.random().toString(36).substring(7));
            const currentAttempt = retryAttempts.get(requestId) || 0;
            
            // Try the next endpoint if we haven't exceeded max retries
            if (currentAttempt < maxRetries && currentAttempt < apiEndpoints.length) {
              const nextEndpoint = apiEndpoints[currentAttempt];
              console.log(`Retrying request to ${nextEndpoint} (attempt ${currentAttempt + 1}/${maxRetries})`);
              
              // Update retry counter
              retryAttempts.set(requestId, currentAttempt + 1);
              
              // Update proxy target and retry
              options.target = nextEndpoint;
              proxy.web(req, res, options);
              return;
            }
            
            // All retries failed, return error response
            if (!res.headersSent) {
              res.writeHead(503, {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'X-Fallback-Status': 'active'
              });
            }
            
            res.end(JSON.stringify({ 
              error: 'Backend connection failed',
              message: 'Unable to connect to any API servers. Please check if the backend is running.',
              fallback: true,
              endpoints_tried: apiEndpoints.slice(0, currentAttempt + 1),
              client_fallbacks_available: env.VITE_ENABLE_CLIENT_FALLBACKS === 'true',
              timestamp: new Date().toISOString()
            }));
          });
        }
      }
    }
  },
  
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    minify: 'terser',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react')) {
              return 'vendor-react';
            }
            if (id.includes('monaco-editor')) {
              return 'vendor-monaco';
            }
            return 'vendor';
          }
        }
      }
    }
  },
  
  // Handle environment variables with fallbacks
  define: {
    'process.env': {
      NODE_ENV: JSON.stringify(process.env.NODE_ENV || 'development')
    }
  }
});
