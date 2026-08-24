import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Project Manager',
        short_name: 'Projects',
        description: 'Gestión personal de proyectos, semanas y tareas diarias.',
        theme_color: '#111827',
        background_color: '#f8fafc',
        display: 'standalone',
        start_url: '/',
        scope: '/',
      },
    }),
  ],
  server: {
    port: 5173,
  },
})
