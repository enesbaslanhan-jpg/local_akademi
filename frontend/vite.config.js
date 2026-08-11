import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const backendProxy = {
  target: 'http://localhost:3000',
  changeOrigin: true
}

import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    proxy: {
      '/api/memory': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/api/v2': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/api/v1/decision-checks': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/api/news': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/mentor': {
        ...backendProxy
      },
      '/auth': {
        ...backendProxy
      },
      '/courses': backendProxy,
      '/community': backendProxy,
      '/lessons': backendProxy,
      '/enrollments': backendProxy,
      '/knowledge': backendProxy,
      '/learning-path': backendProxy,
      '/learning': backendProxy,
      '/onboarding': backendProxy,
      '/assessment': backendProxy,
      '/admin': backendProxy,
      '/dashboard': backendProxy,
      '/quizzes': backendProxy,
      '/tasks': backendProxy,
      '/flashcards': backendProxy,
      '/practical-cards': backendProxy,
      '/videos': backendProxy,
      '/documents': backendProxy,
      '/business': backendProxy,
      '/workspaces': backendProxy,
      '/formulas': backendProxy,
      '/formula-calculations': backendProxy,
      '/reports': backendProxy,
      '/financial-models': backendProxy,
      '/financial-cases': backendProxy
    }
  }
})
