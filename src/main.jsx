import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
      })
      .catch(err => {
      });
  });
}

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }
  
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
} catch (error) {
  console.error('Failed to render React app:', error);
  // Optionally show a user-friendly error message
  document.body.innerHTML = `
    <div style="padding: 20px; color: red;">
      <h2>Application Error</h2>
      <p>${error.message}</p>
      <p>Please refresh the page or contact support.</p>
    </div>
  `;
}
