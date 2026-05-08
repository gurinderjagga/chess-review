import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      react: fileURLToPath(new URL('./node_modules/react', import.meta.url)),
      'chess.js': fileURLToPath(new URL('./node_modules/chess.js', import.meta.url)),
      'lucide-react': fileURLToPath(new URL('./node_modules/lucide-react', import.meta.url)),
    },
  },
  server: {
    fs: {
      allow: ['..']
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('lucide-react')) return 'icons';
            if (id.includes('chess.js')) return 'chess';
            return 'vendor';
          }
        }
      }
    },
    chunkSizeWarningLimit: 3000
  }
})
