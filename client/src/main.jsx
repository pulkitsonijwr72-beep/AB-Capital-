import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ClockProvider } from './context/ClockContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ClockProvider>
      <App />
    </ClockProvider>
  </StrictMode>,
)
