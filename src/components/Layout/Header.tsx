import { Bell, BellOff, User, LogOut, Moon, Sun, Settings, CheckCheck, ShoppingCart, CreditCard, Package, AlertTriangle, Info, Truck, RotateCcw, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect, useCallback, useRef } from 'react';
import { logout } from '@/services/authService';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { storageUrl } from '@/lib/utils';
import {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  type NotificationAPI,
} from '@/services/notifications';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface HeaderProps {
  userName: string;
  userType: 'admin' | 'client';
  companyName?: string;
}

const TYPE_ICON: Record<string, React.ElementType> = {
  new_order:         ShoppingCart,
  order_confirmed:   CheckCheck,
  order_delivered:   ShoppingCart,
  order_returned:    ShoppingCart,
  order_cancelled:   AlertTriangle,
  payment_received:  CreditCard,
  payment_failed:    CreditCard,
  reminder_return:   AlertTriangle,
  product_available: Package,
  order_to_deliver:  Truck,
  order_to_collect:  RotateCcw,
  order_overdue:     AlertTriangle,
};

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

const POLL_INTERVAL = 5_000; // 5s — checa unread count; busca lista só quando muda

export function Header({ userName, userType, companyName }: HeaderProps) {
  const navigate = useNavigate();
  const { resolvedTheme, setTheme } = useTheme();
  const { userAvatarPath } = useAuth();
  const { supported: pushSupported, permission: pushPermission, subscribed: pushSubscribed, loading: pushLoading, subscribe: subscribePush, unsubscribe: unsubscribePush } = usePushNotifications();
  const avatarUrl = storageUrl(userAvatarPath);

  const [notifications, setNotifications] = useState<NotificationAPI[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const lastUnreadRef = useRef<number | null>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const loadNotifications = useCallback(async () => {
    try {
      const data = await getMyNotifications();
      setNotifications(data);
      lastUnreadRef.current = data.filter((n) => !n.is_read).length;
    } catch {
      // silently fail — não bloquear a UI
    }
  }, []);

  // Polling leve: só checa contagem; busca lista completa quando o número aumenta
  useEffect(() => {
    loadNotifications();
    const interval = setInterval(async () => {
      try {
        const count = await getUnreadCount();
        if (lastUnreadRef.current === null || count > lastUnreadRef.current) {
          await loadNotifications();
        }
      } catch { /* silently fail */ }
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  // Recarrega lista quando o Service Worker sinaliza nova notificação push
  useEffect(() => {
    const handler = () => loadNotifications();
    navigator.serviceWorker?.addEventListener('message', handler);
    return () => navigator.serviceWorker?.removeEventListener('message', handler);
  }, [loadNotifications]);

  const handleMarkRead = async (n: NotificationAPI) => {
    if (!n.is_read) {
      await markAsRead(n.id);
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x))
      );
    }
    setNotifOpen(false);

    // Resolve destination — normalize backend URLs like /orders/18
    const ordersRouteMatch = n.action_url?.match(/^\/orders\/(\d+)$/);
    const orderId = ordersRouteMatch?.[1] ?? n.data?.order_id;

    if (orderId) {
      if (userType === 'client') {
        navigate(`/history?order=${orderId}`);
      } else {
        navigate(`/admin/orders?id=${orderId}`);
      }
    } else if (n.action_url) {
      navigate(n.action_url);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    await deleteNotification(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleDeleteAll = async () => {
    await deleteAllNotifications(notifications.map((n) => n.id));
    setNotifications([]);
  };

  const toggleDarkMode = () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');

  const recent = [...notifications]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8);

  return (
    <header className="h-16 backdrop-blur-xl border-b border-border/50 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30 bg-background/80">
      {/* Left */}
      <div className="flex items-center space-x-4">
        {companyName && (
          <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
            {companyName}
          </p>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center space-x-2 sm:space-x-4">
        {/* Theme Toggle — desktop only */}
        <Button
          variant="outline"
          size="icon"
          onClick={toggleDarkMode}
          className="w-8 h-8 sm:w-9 sm:h-9 hidden sm:flex"
        >
          {resolvedTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </Button>

        {/* Push Notifications — botão para habilitar, apenas quando ainda não concedido */}
        {pushSupported && !pushSubscribed && pushPermission !== 'denied' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="w-8 h-8 sm:w-9 sm:h-9 text-muted-foreground"
                onClick={subscribePush}
                disabled={pushLoading}
              >
                <BellOff size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Ativar notificações no celular</TooltipContent>
          </Tooltip>
        )}

        {/* Notifications — visible on all screen sizes */}
        <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="relative w-8 h-8 sm:w-9 sm:h-9"
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <Badge className="absolute -top-2 -right-2 w-5 h-5 p-0 flex items-center justify-center text-xs bg-danger">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-80 bg-background border-border z-50">
            <div className="flex items-center justify-between px-3 py-2">
              <DropdownMenuLabel className="p-0">
                Notificações {unreadCount > 0 && (
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    ({unreadCount} não lida{unreadCount !== 1 ? 's' : ''})
                  </span>
                )}
              </DropdownMenuLabel>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto py-0 px-1 text-xs text-muted-foreground hover:text-foreground"
                    onClick={handleMarkAllRead}
                  >
                    <CheckCheck className="w-3 h-3 mr-1" />
                    Marcar todas
                  </Button>
                )}
                {notifications.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto py-0 px-1 text-xs text-muted-foreground hover:text-destructive"
                    onClick={handleDeleteAll}
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Limpar
                  </Button>
                )}
              </div>
            </div>

            <DropdownMenuSeparator />

            {recent.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma notificação.
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {recent.map((n) => {
                  const Icon = TYPE_ICON[n.type] ?? Info;
                  return (
                    <DropdownMenuItem
                      key={n.id}
                      className={`flex items-start gap-3 px-3 py-3 cursor-pointer ${!n.is_read ? 'bg-muted/40' : ''}`}
                      onClick={() => handleMarkRead(n)}
                    >
                      <div className={`mt-0.5 shrink-0 rounded-full p-1.5 ${!n.is_read ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-snug truncate ${!n.is_read ? 'font-semibold' : 'font-medium'}`}>
                          {n.title}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {n.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {timeAgo(n.created_at)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {!n.is_read && (
                          <span className="w-2 h-2 rounded-full bg-primary" />
                        )}
                        <button
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          onClick={(e) => handleDelete(e, n.id)}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </DropdownMenuItem>
                  );
                })}
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center space-x-2 h-8 sm:h-9 px-2 sm:px-3"
            >
              <Avatar className="w-8 h-8 sm:w-9 sm:h-9">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs sm:text-sm">
                  {userName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="text-left hidden lg:block">
                <p className="text-sm font-medium truncate max-w-32">{userName}</p>
                <p className="text-xs text-muted-foreground capitalize">{userType}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-background border-border z-50">
            <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => navigate(userType === 'client' ? '/profile' : '/admin/admins')}
            >
              <User className="mr-2 h-4 w-4" />
              <span>Perfil</span>
            </DropdownMenuItem>
            {userType === 'admin' && (
              <DropdownMenuItem onClick={() => navigate('/admin/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Configurações</span>
              </DropdownMenuItem>
            )}
            {/* Tema — só aparece no mobile (sm:hidden) */}
            <DropdownMenuItem className="sm:hidden" onClick={toggleDarkMode}>
              {resolvedTheme === 'dark'
                ? <Sun className="mr-2 h-4 w-4" />
                : <Moon className="mr-2 h-4 w-4" />}
              <span>{resolvedTheme === 'dark' ? 'Modo claro' : 'Modo escuro'}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-danger" onClick={async () => { if (pushSubscribed) await unsubscribePush(); logout(); }}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
