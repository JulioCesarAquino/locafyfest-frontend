import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Package, 
  ShoppingCart, 
  Calendar, 
  Settings, 
  Menu,
  X,
  User,
  Heart,
  Home
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const clientMenuItems = [
  { icon: Package, label: 'Catálogo', href: '/catalog' },
  { icon: ShoppingCart, label: 'Meu Pedido', href: '/my-order' },
  { icon: Calendar, label: 'Histórico', href: '/history' },
  { icon: Heart, label: 'Favoritos', href: '/favorites' },
  { icon: User, label: 'Meu Perfil', href: '/profile' },
];

export function ClientSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  
  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="outline"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden bg-white/90 backdrop-blur-sm"
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
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center">
                <Home className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gradient-primary">
                  Festa System
                </h2>
                <p className="text-sm text-muted-foreground">
                  Portal do Cliente
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {clientMenuItems.map((item) => {
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
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-border/50">
            <div className="bg-primary-light rounded-xl p-4">
              <h3 className="font-semibold text-sm text-primary mb-1">
                Precisa de Ajuda?
              </h3>
              <p className="text-xs text-primary/80 mb-2">
                Entre em contato conosco
              </p>
              <Button variant="outline" size="sm" className="w-full text-xs">
                WhatsApp
              </Button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}