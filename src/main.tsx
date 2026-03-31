import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch((err) => {
    console.warn('[SW] Falha ao registrar service worker:', err);
  });

  // Quando o SW pede para navegar (click em notificação push)
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'NAVIGATE' && event.data.url) {
      window.location.hash = event.data.url;
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
