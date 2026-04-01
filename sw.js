// Service Worker - Push Notifications

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  console.log('[SW] Push recebido', event);

  if (!event.data) {
    console.warn('[SW] Push sem dados, ignorando.');
    return;
  }

  let data = {};
  try { data = event.data.json(); } catch { data = { title: 'Nova notificação', message: event.data.text() }; }

  console.log('[SW] Dados do push:', data);

  const title = data.title ?? 'Nova notificação';
  const options = {
    body: data.message ?? '',
    icon: '/logo-192.png',
    badge: '/logo-192.png',
    tag: data.type ?? 'notification',
    data: { url: data.action_url ?? null },
    requireInteraction: false,
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => {
        console.log('[SW] Notificação exibida com sucesso');
        return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
          clients.forEach((client) => client.postMessage({ type: 'NEW_NOTIFICATION' }));
        });
      })
      .catch((err) => {
        console.error('[SW] Erro ao exibir notificação:', err);
      })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const actionUrl = event.notification.data?.url;

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Se já tem aba aberta, foca e navega
        for (const client of clientList) {
          if ('focus' in client) {
            client.focus();
            if (actionUrl) {
              // Envia mensagem para o React Router navegar
              client.postMessage({ type: 'NAVIGATE', url: actionUrl });
            }
            return;
          }
        }
        // Sem aba aberta — abre nova com hash route
        const base = self.registration.scope;
        const target = actionUrl ? `${base}#${actionUrl}` : base;
        return self.clients.openWindow(target);
      }),
  );
});
