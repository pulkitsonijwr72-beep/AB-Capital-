import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ClockProvider } from './context/ClockContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import AuthRouter from './components/auth/AuthRouter.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <AuthRouter>
        <ClockProvider>
          <App />
        </ClockProvider>
      </AuthRouter>
    </AuthProvider>
  </StrictMode>,
)
