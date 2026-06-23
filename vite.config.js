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
    rollupOptions: {
      output: {
        // Split large third-party libraries into their own cached chunks so
        // they download in parallel and stay cached across app deploys.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('firebase') || id.includes('@firebase')) return 'vendor-firebase';
          if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
          if (id.includes('socket.io') || id.includes('engine.io')) return 'vendor-socket';
          if (id.includes('react-router') || id.includes('/react-dom/') || id.includes('/react/') || id.includes('/scheduler/')) return 'vendor-react';
        },
      },
    },
  },
})
