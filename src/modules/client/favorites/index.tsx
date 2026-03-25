import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClientLayout } from '@/components/Layout/ClientLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Heart, ShoppingCart, Trash2, Loader2, ImageOff, Package, Plus, Minus, Link2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { cn, storageUrl, formatCurrency } from '@/lib/utils';
import { getProducts, type ProductAPI, type ProductVariationAPI } from '@/modules/admin/products/services';
import { getMyFavorites, removeFavorite, type FavoriteAPI } from './services';
import { useCart } from '@/contexts/CartContext';

function primaryImageUrl(product: ProductAPI): string {
  const images = product.images ?? [];
  const img = images.find((i) => i.is_primary) ?? images[0];
  return img ? storageUrl(img.image_path) : '';
}

export default function Favorites() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { addItem, totalItems } = useCart();

  const [favorites, setFavorites] = useState<FavoriteAPI[]>([]);
  const [products, setProducts] = useState<ProductAPI[]>([]);
  const [loading, setLoading] = useState(true);

  // Sheet de seleção de variação/quantidade
  const [sheetProduct, setSheetProduct] = useState<ProductAPI | null>(null);
  const [selectedVariation, setSelectedVariation] = useState<ProductVariationAPI | null>(null);
  const [qty, setQty] = useState(1);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [favs, productsRes] = await Promise.all([
        getMyFavorites(),
        getProducts({ per_page: 100 }),
      ]);
      setFavorites(favs);
      const list: ProductAPI[] = productsRes.data?.data ?? productsRes.data ?? [];
      setProducts(list);
    } catch (err: unknown) {
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Erro ao carregar favoritos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  const favoriteProducts = favorites
    .map((fav) => ({
      fav,
      product: products.find((p) => p.id === fav.product_id),
    }))
    .filter((x): x is { fav: FavoriteAPI; product: ProductAPI } => !!x.product);

  async function handleRemove(fav: FavoriteAPI) {
    try {
      await removeFavorite(fav.id);
      setFavorites((prev) => prev.filter((f) => f.id !== fav.id));
      toast({ title: 'Removido dos favoritos' });
    } catch {
      toast({ title: 'Erro ao remover', variant: 'destructive' });
    }
  }

  function openSheet(product: ProductAPI) {
    setSheetProduct(product);
    setSelectedVariation(null);
    setQty(1);
  }

  function handleAddToCart() {
    if (!sheetProduct) return;
    const hasVariations = (sheetProduct.variations ?? []).length > 0;
    if (hasVariations && !selectedVariation) {
      toast({ title: 'Selecione uma variação', variant: 'destructive' });
      return;
    }
    addItem(sheetProduct, selectedVariation ?? undefined, qty);
    toast({ title: 'Adicionado ao pedido!', description: sheetProduct.name });
    setSheetProduct(null);
  }

  function handleAddAllToCart() {
    favoriteProducts.forEach(({ product }) => {
      const hasVariations = (product.variations ?? []).length > 0;
      if (!hasVariations && product.is_available) {
        addItem(product, undefined, 1);
      }
    });
    toast({ title: 'Produtos sem variação adicionados ao pedido!' });
    navigate('/my-order');
  }

  return (
    <ClientLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gradient-primary">Meus Favoritos</h1>
            <p className="text-muted-foreground">Produtos salvos para facilitar seus próximos pedidos</p>
          </div>
          {favoriteProducts.length > 0 && (
            <Button onClick={handleAddAllToCart} className="gap-2">
              <ShoppingCart size={16} />
              Adicionar Todos ao Pedido
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-primary" size={40} />
          </div>
        ) : favoriteProducts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Heart size={48} className="mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum favorito ainda</h3>
              <p className="text-muted-foreground mb-4">
                Adicione produtos aos favoritos no catálogo para encontrá-los facilmente
              </p>
              <Button onClick={() => navigate('/catalog')}>
                Explorar Catálogo
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {favoriteProducts.map(({ fav, product }) => {
              const imgUrl = primaryImageUrl(product);
              const unavailable = !product.is_available || product.quantity_available === 0;
              const hasVariations = (product.variations ?? []).length > 0;
              const base = parseFloat(product.price);
              const varPrices = (product.variations ?? [])
                .filter((v) => v.is_available)
                .map((v) => parseFloat(v.price_modifier))
                .filter((p) => p > 0);
              const displayPrice = hasVariations && varPrices.length > 0
                ? Math.min(...varPrices)
                : base;

              return (
                <Card
                  key={fav.id}
                  className={cn(
                    'bg-gradient-surface border-border/50 flex flex-col transition-all duration-300',
                    !unavailable && 'hover:shadow-primary',
                    unavailable && 'opacity-60',
                  )}
                >
                  {/* Image */}
                  <div className="relative aspect-video overflow-hidden rounded-t-xl bg-muted flex items-center justify-center">
                    {imgUrl ? (
                      <img src={imgUrl} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <ImageOff size={36} className="text-muted-foreground" />
                    )}

                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      {product.is_combo && (
                        <Badge className="text-xs bg-primary/90">
                          <Link2 size={10} className="mr-1" />
                          Combo
                        </Badge>
                      )}
                      {unavailable && (
                        <Badge variant="destructive" className="text-xs">Indisponível</Badge>
                      )}
                    </div>

                    <button
                      onClick={() => handleRemove(fav)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500/80 backdrop-blur-sm hover:bg-red-600 transition-colors"
                    >
                      <Trash2 size={14} className="text-white" />
                    </button>
                  </div>

                  <CardContent className="p-4 flex flex-col flex-1">
                    <h3 className="font-semibold text-sm leading-snug mb-1">{product.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                      {product.description}
                    </p>

                    {hasVariations && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {(product.variations ?? []).slice(0, 3).map((v) => (
                          <Badge key={v.id} variant="outline" className="text-xs">
                            {v.name}
                          </Badge>
                        ))}
                        {(product.variations ?? []).length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{(product.variations ?? []).length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    <div className="mt-auto flex items-center justify-between gap-2">
                      <div>
                        <div className="text-lg font-bold text-primary leading-none">
                          {isFinite(displayPrice) ? formatCurrency(displayPrice) : '—'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {hasVariations ? 'a partir de' : 'por diária'}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        disabled={unavailable}
                        onClick={() => openSheet(product)}
                        className="shrink-0"
                      >
                        <ShoppingCart size={14} className="mr-1" />
                        Adicionar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating cart button */}
      {totalItems > 0 && (
        <div className="fixed bottom-6 right-6 z-40">
          <Button
            size="lg"
            className="rounded-full shadow-primary gap-2"
            onClick={() => navigate('/my-order')}
          >
            <ShoppingCart size={20} />
            Ver Pedido
            <Badge variant="secondary" className="ml-1">{totalItems}</Badge>
          </Button>
        </div>
      )}

      {/* Sheet de seleção de variação/quantidade */}
      <Sheet open={!!sheetProduct} onOpenChange={(open) => !open && setSheetProduct(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
          {sheetProduct && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle>{sheetProduct.name}</SheetTitle>
                {sheetProduct.description && (
                  <SheetDescription>{sheetProduct.description}</SheetDescription>
                )}
              </SheetHeader>

              {(sheetProduct.variations ?? []).length > 0 && (
                <div className="mb-5">
                  <p className="text-sm font-medium mb-2">Selecione uma variação *</p>
                  <div className="flex flex-wrap gap-2">
                    {sheetProduct.variations.map((v) => (
                      <button
                        key={v.id}
                        disabled={!v.is_available}
                        onClick={() => setSelectedVariation(v)}
                        className={cn(
                          'px-3 py-1.5 rounded-full border text-sm transition-colors',
                          selectedVariation?.id === v.id
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border hover:border-primary',
                          !v.is_available && 'opacity-40 cursor-not-allowed',
                        )}
                      >
                        {v.name}
                        {parseFloat(v.price_modifier) > 0 && (
                          <span className="ml-1 text-xs opacity-80">
                            +{formatCurrency(v.price_modifier)}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-6">
                <p className="text-sm font-medium mb-2">Quantidade</p>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="icon" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                    <Minus size={16} />
                  </Button>
                  <span className="w-8 text-center font-semibold">{qty}</span>
                  <Button variant="outline" size="icon" onClick={() => setQty((q) => q + 1)}>
                    <Plus size={16} />
                  </Button>
                </div>
              </div>

              <Button className="w-full" size="lg" onClick={handleAddToCart}>
                <ShoppingCart size={18} className="mr-2" />
                Adicionar ao Pedido
              </Button>
            </>
          )}
        </SheetContent>
      </Sheet>
    </ClientLayout>
  );
}
