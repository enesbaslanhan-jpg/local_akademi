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
    /* PORT verilmişse ona bağlan (araçların atadığı portu kullanabilmek
       için). PORT yoksa `undefined` kalır ve Vite kendi varsayılanı olan
       5173'ü kullanır — `npm run dev` davranışı değişmez.
       strictPort yalnız PORT verildiğinde açık: atanan port doluysa
       sessizce başka bir porta kaymak yerine hata vermesi doğru. */
    port: process.env.PORT ? Number(process.env.PORT) : undefined,
    strictPort: Boolean(process.env.PORT),
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
      /* İletişim formu. Üretimde Caddy her şeyi arka uca iletiyor ve
         `/support` API önekleri arasında; burada da olmazsa yalnız
         geliştirmede 404 döner ve form çalışmaz. */
      '/support': backendProxy,
      '/courses': backendProxy,
      '/community': backendProxy,
      '/lessons': backendProxy,
      '/enrollments': backendProxy,
      '/knowledge': backendProxy,
      '/learning-path': backendProxy,
      '/learning': backendProxy,
      '/onboarding': backendProxy,
      '/assessment': backendProxy,
      '/admin': {
        ...backendProxy,
        bypass(request) {
          if (request.headers.accept?.includes('text/html')) return '/index.html'
        }
      },
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
