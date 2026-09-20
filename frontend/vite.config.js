import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';
  const defaultApiUrl = isDev ? 'http://localhost:3001' : 'https://verity-2z4v.onrender.com';

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
      assetsInlineLimit: 4096,
      rollupOptions: {
        output: {
          manualChunks: undefined
        }
      }
    },
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || defaultApiUrl),
      'import.meta.env.VITE_SOCKET_URL': JSON.stringify(process.env.VITE_SOCKET_URL || defaultApiUrl)
    }
  };
})