import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/alumnimain/',
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/alumnimain/api': {
        target: 'https://necalumni.nec.edu.in',
        changeOrigin: true,
        secure: false,
      },
      '/api': {
        target: 'https://necalumni.nec.edu.in/alumnimain',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})

