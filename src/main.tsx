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
      const url: string = event.data.url;
      const ordersMatch = url.match(/^\/orders\/(\d+)$/);
      if (ordersMatch) {
        const orderId = ordersMatch[1];
        const userType = localStorage.getItem('user_type');
        window.location.hash = userType === 'client'
          ? `/history?order=${orderId}`
          : `/admin/orders?id=${orderId}`;
      } else {
        window.location.hash = url;
      }
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
