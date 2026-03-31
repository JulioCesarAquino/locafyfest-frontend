import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch((err) => {
    console.warn('[SW] Falha ao registrar service worker:', err);
  });
}

createRoot(document.getElementById("root")!).render(<App />);
