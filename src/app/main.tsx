import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import '@/styles/index.css'
import App from '@/app/App'

const Root = () => {
  useEffect(() => {
    // Initialize Preline with error handling
    const loadPreline = async () => {
      try {
        const { HSStaticMethods } = await import('preline/preline');
        HSStaticMethods.autoInit();
      } catch (error) {
        console.warn('Preline initialization failed:', error);
      }
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
