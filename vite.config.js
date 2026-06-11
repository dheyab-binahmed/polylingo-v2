import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // honor the port assigned by tooling (falls back to Vite's default 5173)
    port: Number(process.env.PORT) || 5173,
  },
  build: {
    outDir: 'dist',
  },
})
