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
})