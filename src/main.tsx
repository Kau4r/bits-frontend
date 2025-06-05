import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Import Preline
import 'preline/preline'
import type { IStaticMethods } from 'preline/preline'

declare global {
  interface Window {
    HSStaticMethods: IStaticMethods
  }
}

const Root = () => {
  useEffect(() => {
    // Initialize Preline
    import('preline/preline').then(({ HSStaticMethods }) => {
      HSStaticMethods.autoInit()
    })
  }, [])

  return (
    <StrictMode>
      <App />
    </StrictMode>
  )
}

createRoot(document.getElementById('root')!).render(<Root />)
