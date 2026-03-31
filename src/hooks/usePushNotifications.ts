import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/services/apiClient';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
const SW_PATH = '/sw.js';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export type PushPermission = 'default' | 'granted' | 'denied';

export function usePushNotifications() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<PushPermission>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const isSupported =
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window &&
      !!VAPID_PUBLIC_KEY;
    setSupported(isSupported);
    if (isSupported) {
      setPermission(Notification.permission as PushPermission);
      // Verificar se já está inscrito
      navigator.serviceWorker.ready.then((reg) =>
        reg.pushManager.getSubscription().then((sub) => setSubscribed(!!sub)),
      );
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (!supported || !VAPID_PUBLIC_KEY) return false;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      setPermission(permission as PushPermission);
      if (permission !== 'granted') return false;

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      await apiClient.post('/push-subscriptions', subscription.toJSON());
      setSubscribed(true);
      return true;
    } catch (err) {
      console.error('[Push] Falha ao inscrever:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [supported]);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await apiClient.delete('/push-subscriptions', {
          data: { endpoint: sub.endpoint },
        });
      }
      setSubscribed(false);
    } catch (err) {
      console.error('[Push] Falha ao cancelar inscrição:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { supported, permission, subscribed, loading, subscribe, unsubscribe };
}
