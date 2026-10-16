import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
  build: {
    // V30 perf: vendor chunks — leaflet/react বড়, আলাদা করলে cache ভালো হয় ও parallel load হয়
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          maps: ['leaflet'],
        },
      },
    },
  },
  server: {
    port: 4188,
    host: true,
  },
})
