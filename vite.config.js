import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './', // relative asset paths so the build works from file:// in Electron
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true, // This forces Vite to fail if 5173 isn't available
    watch: {
      // The backend creates/deletes hundreds of dotnet files in server/temp_*
      // while compiling student code. Ignore them so the file churn doesn't
      // crash or wedge the Vite dev server (which causes "site can't be reached").
      ignored: [
        '**/server/**',
        '**/temp_*/**',
        '**/bin/**',
        '**/obj/**',
      ],
    },
  },
  build: {
    // Enable minification (enabled by default in production)
    minify: 'esbuild',
    // Enable CSS minification
    cssMinify: true,
    // Asset size limit warning
    assetsInlineLimit: 4096,
    // Rollup options for better tree shaking
    rollupOptions: {
      // Manual chunk splitting for better caching
      output: {
        manualChunks: undefined // Let Vite handle chunking automatically
      }
    }
  },
  define: {
    // Define environment variables for Vite
    'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || 'http://localhost:3001'),
    'import.meta.env.VITE_SOCKET_URL': JSON.stringify(process.env.VITE_SOCKET_URL || 'http://localhost:3001')
  }
})