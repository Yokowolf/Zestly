import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base './' — GitHub Pages sirve bajo /Zestly/, rutas relativas funcionan siempre
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  server: { port: 5199 },
})
