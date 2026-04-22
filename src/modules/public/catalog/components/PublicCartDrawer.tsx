import { useState } from 'react';
import { ShoppingCart, X, Plus, Minus, Trash2, LogIn, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGuestCart } from '@/contexts/GuestCartContext';
import { formatCurrency, storageUrl } from '@/lib/utils';

export function PublicCartDrawer() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { guestItems, guestTotalItems, updateGuestQuantity, removeGuestItem } = useGuestCart();

  const total = guestItems.reduce((sum, item) => {
    const price = item.variation
      ? parseFloat(item.variation.price_modifier)
      : parseFloat(item.product.price);
    return sum + price * item.quantity;
  }, 0);

  if (guestTotalItems === 0 && !open) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-primary text-primary-foreground rounded-full px-4 py-3 shadow-lg hover:bg-primary/90 transition-all duration-200"
      >
        <ShoppingCart size={20} />
        <span className="font-semibold text-sm">Orçamento</span>
        <Badge className="bg-white text-primary text-xs px-1.5 min-w-[20px] h-5 flex items-center justify-center ml-1">
          {guestTotalItems}
        </Badge>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={() => setOpen(false)}
        />
      )}

      <div
        className={`fixed top-0 right-0 h-full w-full max-w-sm bg-background border-l border-border z-50 flex flex-col shadow-2xl transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart size={20} className="text-primary" />
            <h2 className="font-bold text-lg">Meu Orçamento</h2>
            <Badge variant="secondary">
              {guestTotalItems} {guestTotalItems === 1 ? 'item' : 'itens'}
            </Badge>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {guestItems.map((item, idx) => {
            const images = item.product.images ?? [];
            const img = images.find((i) => i.is_primary) ?? images[0];
            const imgUrl = img ? storageUrl(img.image_path) : '';
            const price = item.variation
              ? parseFloat(item.variation.price_modifier)
              : parseFloat(item.product.price);
            const limit = item.variation
              ? item.variation.quantity_available
              : item.product.quantity_available;

            return (
              <div key={idx} className="flex gap-3 bg-muted/30 rounded-lg p-3">
                {imgUrl ? (
                  <img
                    src={imgUrl}
                    alt={item.product.name}
                    className="w-14 h-14 object-cover rounded-md shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 bg-muted rounded-md shrink-0 flex items-center justify-center text-xs text-muted-foreground">
                    Sem foto
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm leading-tight truncate">{item.product.name}</p>
                  {item.variation && (
                    <p className="text-xs text-muted-foreground">{item.variation.name}: {item.variation.value}</p>
                  )}
                  <p className="text-primary font-semibold text-sm mt-0.5">{formatCurrency(price)}/dia</p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateGuestQuantity(idx, item.quantity - 1)}
                        className="w-6 h-6 rounded border border-border flex items-center justify-center hover:bg-muted transition-colors"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateGuestQuantity(idx, item.quantity + 1)}
                        disabled={item.quantity >= limit}
                        className="w-6 h-6 rounded border border-border flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    <button
                      onClick={() => removeGuestItem(idx)}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-border space-y-3 shrink-0">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Estimativa por diária</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(total)}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Valor estimado por diária. O total final depende do período e frete.
          </p>
          <Button
            className="w-full btn-primary"
            onClick={() => {
              setOpen(false);
              navigate('/login');
            }}
          >
            <LogIn size={16} className="mr-2" />
            Entrar para finalizar
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setOpen(false);
              navigate('/register');
            }}
          >
            <UserPlus size={16} className="mr-2" />
            Criar conta
          </Button>
        </div>
      </div>
    </>
  );
}
