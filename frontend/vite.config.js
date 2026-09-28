import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Treat .js files as JSX so custom-view components (.js) compile.
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.(js|jsx)$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: (process.env.VITE_API_URL || 'http://localhost:5001/api').replace(/\/api\/?$/, ''),
        changeOrigin: true
      }
    }
  }
});
