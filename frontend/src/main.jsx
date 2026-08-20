import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { WorkspaceProvider } from './context/WorkspaceContext'
import { ToastProvider } from './context/ToastContext'
import { MentorProvider } from './context/MentorContext'
import { ThemeProvider } from './context/ThemeContext'
import AppRoutes from './router'
import StorageNotice from './components/ui/StorageNotice'
import { installButtonFeedback } from './utils/buttonFeedback'
/* Manrope kendi sunucumuzdan — Google Fonts CDN'i kaldırıldı, böylece
   ziyaretçi IP'si ABD'ye gitmiyor. Token'lardan ÖNCE yüklenir. */
import '@fontsource/manrope/400.css'
import '@fontsource/manrope/500.css'
import '@fontsource/manrope/600.css'
import '@fontsource/manrope/700.css'
import './styles/tokens.css'
import './styles/theme-modes.css'
import './styles/auth-surface.css'
import './styles/motion-glass-tokens.css'
import './styles/base.css'
import './styles/main.css'
import './styles/print.css'
import './styles/tailwind.css'
import './styles/fields.css'
import './styles/buttons.css'

installButtonFeedback()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <WorkspaceProvider>
            <ToastProvider>
              <MentorProvider>
                <AppRoutes />
                <StorageNotice />
              </MentorProvider>
            </ToastProvider>
          </WorkspaceProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
)
