import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  Settings,
  FileBarChart,
  Menu,
  X,
  Calendar,
  UserCheck,
  Tag,
  Ban,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { APP_NAME } from '@/config/app';
import { AbceLogo } from '@/components/AbceLogo';
import { useAuth } from '@/contexts/AuthContext';
import { getOrderBlockingSettings, isOrdersCurrentlyBlocked } from '@/modules/admin/settings/services';

interface SidebarProps {
  userType: 'admin' | 'client';
}

const adminMenuItems = [
  { icon: LayoutDashboard, label: 'Dashboard',        href: '/admin/dashboard', permission: 'dashboard' },
  { icon: Package,         label: 'Produtos',         href: '/admin/products',  permission: 'products'  },
  { icon: Users,           label: 'Clientes',         href: '/admin/clients',   permission: 'clients'   },
  { icon: ShoppingCart,    label: 'Pedidos',          href: '/admin/orders',    permission: 'orders'    },
  { icon: Tag,             label: 'Cupons',           href: '/admin/coupons',   permission: 'orders'    },
  { icon: FileBarChart,    label: 'Relatórios',       href: '/admin/reports',   permission: 'reports'   },
  { icon: UserCheck,       label: 'Administradores',  href: '/admin/admins',    permission: 'admins'    },
  { icon: Settings,        label: 'Configurações',    href: '/admin/settings',  permission: 'settings'  },
];

const clientMenuItems = [
  { icon: Package, label: 'Catálogo', href: '/catalog' },
  { icon: ShoppingCart, label: 'Meu Pedido', href: '/my-order' },
  { icon: Calendar, label: 'Histórico', href: '/history' },
  { icon: Settings, label: 'Perfil', href: '/profile' },
];

export function Sidebar({ userType }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [ordersBlocked, setOrdersBlocked] = useState(false);
  const location = useLocation();
  const { permissions, userType: authUserType } = useAuth();

  useEffect(() => {
    if (userType !== 'admin') return;
    getOrderBlockingSettings()
      .then((s) => setOrdersBlocked(isOrdersCurrentlyBlocked(s)))
      .catch(() => {});
  }, [userType]);

  const menuItems = userType === 'admin'
    ? adminMenuItems.filter(item =>
        authUserType === 'super_admin' || permissions.includes(item.permission)
      )
    : clientMenuItems;

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="outline"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden bg-background/90 backdrop-blur-sm border-border"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </Button>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 h-full w-72 bg-gradient-surface border-r border-border/50 backdrop-blur-xl z-50 transition-transform duration-300 ease-bounce",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-border/50">
            <Link
              to={userType === 'admin' ? '/admin/dashboard' : '/catalog'}
              onClick={() => setIsOpen(false)}
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
            >
              <AbceLogo height={48} />
              <div>
                <h2 className="text-lg font-semibold text-gradient-primary">
                  {APP_NAME}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {userType === 'admin' ? 'Painel Admin' : 'Portal Cliente'}
                </p>
              </div>
            </Link>
          </div>

          {/* Aviso de bloqueio — visível a todos os admins */}
          {userType === 'admin' && ordersBlocked && (
            <div className="mx-4 mt-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 flex gap-2">
              <Ban size={15} className="text-destructive shrink-0 mt-0.5" />
              <p className="text-xs font-medium text-destructive leading-snug">
                Pedidos suspensos no momento
              </p>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 group",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-primary"
                      : "text-muted-foreground hover:bg-surface hover:text-foreground"
                  )}
                >
                  <item.icon
                    size={20}
                    className={cn(
                      "transition-colors duration-300",
                      isActive ? "text-primary-foreground" : "group-hover:text-foreground"
                    )}
                  />
                  <span className="font-medium">{item.label}</span>
                  {ordersBlocked && item.href === '/admin/settings' && (
                    <span className="ml-auto h-2 w-2 rounded-full bg-destructive shrink-0" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-border/50">
            <div className="bg-primary-light rounded-xl p-4">
              <h3 className="font-semibold text-sm text-primary mb-1">
                Sistema de Locação
              </h3>
              <p className="text-xs text-primary/80">
                Gerencie seus eventos com facilidade e eficiência
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}