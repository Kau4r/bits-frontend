import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import './index.css'
import App from './App.tsx'

// Import Preline
import 'preline/preline';

const Root = () => {
  useEffect(() => {
    // Initialize Preline
    const loadPreline = async () => {
      const { HSStaticMethods } = await import('preline/preline');
      HSStaticMethods.autoInit();
    };
    loadPreline();
  }, [])

  return (
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>
  )
}

createRoot(document.getElementById('root')!).render(<Root />)
