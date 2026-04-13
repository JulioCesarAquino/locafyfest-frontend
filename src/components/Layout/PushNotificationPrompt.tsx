import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'push_prompt_dismissed_at';
const REDISPLAY_DAYS = 7;
const SHOW_DELAY_MS = 2500;

function wasDismissedRecently(): boolean {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  const daysSince = (Date.now() - parseInt(raw)) / (1000 * 60 * 60 * 24);
  return daysSince < REDISPLAY_DAYS;
}

interface PushNotificationPromptProps {
  /** true quando suportado, permissão ainda não concedida/negada e não inscrito */
  visible: boolean;
  loading: boolean;
  onEnable: () => Promise<boolean>;
}

export function PushNotificationPrompt({ visible, loading, onEnable }: PushNotificationPromptProps) {
  const [show, setShow] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!visible || wasDismissedRecently()) return;

    const timer = setTimeout(() => {
      setShow(true);
      // pequeno delay para ativar a transição CSS após montar no DOM
      requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)));
    }, SHOW_DELAY_MS);

    return () => clearTimeout(timer);
  }, [visible]);

  const dismiss = () => {
    setEntered(false);
    setTimeout(() => setShow(false), 300);
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  };

  const handleEnable = async () => {
    try {
      await onEnable();
    } catch {
      // ignora erro — o prompt nativo pode falhar se o browser bloquear
    } finally {
      // Em qualquer caso (granted, denied ou erro), o banner não é mais necessário:
      // - Se concedeu: subscribed=true → showPushPrompt=false
      // - Se negou: permission='denied' → showPushPrompt=false
      // - Se erro: fechamos o banner para não travar o usuário
      dismiss();
    }
  };

  if (!show) return null;

  return (
    <div
      className={cn(
        'fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm',
        'transition-all duration-300 ease-out',
        entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
      )}
    >
      <div className="rounded-xl border bg-card text-card-foreground shadow-lg p-4 flex gap-3 items-start">
        <div className="shrink-0 mt-0.5 flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 text-primary">
          <Bell size={18} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-snug">Ativar notificações?</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
            Receba alertas de pedidos, confirmações e atualizações em tempo real neste dispositivo.
          </p>
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              className="h-7 text-xs px-3"
              onClick={handleEnable}
              disabled={loading}
            >
              {loading ? 'Aguarde...' : 'Ativar'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs px-3 text-muted-foreground"
              onClick={dismiss}
              disabled={loading}
            >
              Agora não
            </Button>
          </div>
        </div>

        <button
          onClick={dismiss}
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors mt-0.5"
          aria-label="Fechar"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
