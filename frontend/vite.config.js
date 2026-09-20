import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  const apiUrl = env.VITE_API_URL || process.env.VITE_API_URL || 'http://localhost:3001';
  const socketUrl = env.VITE_SOCKET_URL || process.env.VITE_SOCKET_URL || apiUrl;

  return {
    base: './', // relative asset paths so the build works from file:// in Electron
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true, // This forces Vite to fail if 5173 isn't available
      watch: {
        ignored: [
          '**/server/**',
          '**/temp_*/**',
          '**/bin/**',
          '**/obj/**',
        ],
      },
    },
    build: {
      outDir: path.resolve(__dirname, '../dist'),
      emptyOutDir: false,
      minify: 'esbuild',
      cssMinify: true,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: undefined
        }
      }
    },
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(apiUrl),
      'import.meta.env.VITE_SOCKET_URL': JSON.stringify(socketUrl)
    }
  };
})