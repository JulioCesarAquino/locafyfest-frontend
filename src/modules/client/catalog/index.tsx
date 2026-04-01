import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClientLayout } from '@/components/Layout/ClientLayout';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Search, ShoppingCart, Package, Loader2, ImageOff, Link2, Plus, Minus, Heart, Eye } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { cn, storageUrl, formatCurrency } from '@/lib/utils';
import { getProducts, type ProductAPI, type ProductVariationAPI, type ComponentSelection } from '@/modules/admin/products/services';
import { useCart } from '@/contexts/CartContext';
import { getMyFavorites, addFavorite, removeFavorite, type FavoriteAPI } from '@/modules/client/favorites/services';

import type { CartItem } from '@/contexts/CartContext';

function primaryImageUrl(product: ProductAPI): string {
  const images = product.images ?? [];
  const img = images.find((i) => i.is_primary) ?? images[0];
  return img ? storageUrl(img.image_path) : '';
}

interface SheetQtyRowProps {
  sheetProduct: ProductAPI | null;
  selectedVariation: ProductVariationAPI | null;
  items: CartItem[];
  qty: number;
  setQty: React.Dispatch<React.SetStateAction<number>>;
  onAdd: () => void;
}

function SheetQtyRow({ sheetProduct, selectedVariation, items, qty, setQty, onAdd }: SheetQtyRowProps) {
  const maxStock = sheetProduct
    ? (selectedVariation ? selectedVariation.quantity_available : sheetProduct.quantity_available)
    : 1;
  const inCart = sheetProduct
    ? items
        .filter((i) => i.product.id === sheetProduct.id && (i.variation?.id ?? null) === (selectedVariation?.id ?? null))
        .reduce((s, i) => s + i.quantity, 0)
    : 0;
  const remaining = Math.max(0, maxStock - inCart);

  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2 border rounded-lg px-2 py-1">
        <button
          onClick={() => setQty((q) => Math.max(1, q - 1))}
          className="p-1 rounded hover:bg-muted transition-colors"
        >
          <Minus size={14} />
        </button>
        <span className="w-6 text-center text-sm font-semibold">{qty}</span>
        <button
          onClick={() => setQty((q) => Math.min(q + 1, remaining))}
          disabled={qty >= remaining}
          className="p-1 rounded hover:bg-muted transition-colors disabled:opacity-40"
        >
          <Plus size={14} />
        </button>
      </div>
      {remaining <= 0 && (
        <span className="text-xs text-destructive">Estoque esgotado no pedido</span>
      )}
      <Button size="sm" disabled={remaining <= 0} onClick={onAdd}>
        <ShoppingCart size={14} className="mr-1.5" />
        Adicionar ao Pedido
      </Button>
    </div>
  );
}

export default function Catalog() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { addItem, items, totalItems } = useCart();

  const [products, setProducts] = useState<ProductAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Favoritos: map de product_id → favorite_id
  const [favMap, setFavMap] = useState<Map<number, number>>(new Map());
  const [togglingFav, setTogglingFav] = useState<number | null>(null);

  // Sheet de seleção de variação / componentes selecionáveis
  const [sheetProduct, setSheetProduct] = useState<ProductAPI | null>(null);
  const [selectedVariation, setSelectedVariation] = useState<ProductVariationAPI | null>(null);
  const [componentSelections, setComponentSelections] = useState<ComponentSelection[]>([]);
  const [qty, setQty] = useState(1);

  // Modal de detalhe do produto
  const [detailProduct, setDetailProduct] = useState<ProductAPI | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [productsRes, favs] = await Promise.all([
          getProducts({ per_page: 100 }),
          getMyFavorites().catch(() => [] as FavoriteAPI[]),
        ]);
        const list: ProductAPI[] = productsRes.data?.data ?? productsRes.data ?? [];
        setProducts(list);
        setFavMap(new Map(favs.map((f) => [f.product_id, f.id])));
      } catch (err: unknown) {
        toast({
          title: 'Erro',
          description: err instanceof Error ? err.message : 'Erro ao carregar produtos',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function toggleFavorite(e: React.MouseEvent, productId: number) {
    e.stopPropagation();
    if (togglingFav === productId) return;
    setTogglingFav(productId);
    try {
      const existingId = favMap.get(productId);
      if (existingId) {
        await removeFavorite(existingId);
        setFavMap((prev) => { const next = new Map(prev); next.delete(productId); return next; });
        toast({ title: 'Removido dos favoritos' });
      } else {
        const fav = await addFavorite(productId);
        setFavMap((prev) => new Map(prev).set(productId, fav.id));
        toast({ title: 'Adicionado aos favoritos!' });
      }
    } catch {
      toast({ title: 'Erro ao atualizar favorito', variant: 'destructive' });
    } finally {
      setTogglingFav(null);
    }
  }

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        (p.description ?? '').toLowerCase().includes(term),
    );
  }, [products, searchTerm]);

  function openSheet(product: ProductAPI) {
    setSheetProduct(product);
    setSelectedVariation(null);
    setComponentSelections([]);
    setQty(1);
  }

  function selectComponentVariation(componentProductId: number, variation: ProductVariationAPI) {
    setComponentSelections((prev) => {
      const next = prev.filter((s) => s.component_product_id !== componentProductId);
      return [...next, { component_product_id: componentProductId, variation_id: variation.id }];
    });
  }

  function handleAddToCart() {
    if (!sheetProduct) return;

    const hasVariations = (sheetProduct.variations ?? []).length > 0;
    if (hasVariations && !selectedVariation) {
      toast({ title: 'Selecione uma variação', variant: 'destructive' });
      return;
    }

    // Verificar estoque disponível
    const maxStock = selectedVariation
      ? selectedVariation.quantity_available
      : sheetProduct.quantity_available;

    // Quantidade já no carrinho para este item
    const inCart = items
      .filter((i) => i.product.id === sheetProduct.id && (i.variation?.id ?? null) === (selectedVariation?.id ?? null))
      .reduce((s, i) => s + i.quantity, 0);

    if (inCart >= maxStock) {
      toast({ title: 'Estoque insuficiente', description: `Você já tem ${inCart} no pedido (máximo: ${maxStock}).`, variant: 'destructive' });
      return;
    }

    const allowedQty = Math.min(qty, maxStock - inCart);

    // Validar seleções de componentes selecionáveis
    const selectableComponents = (sheetProduct.components ?? []).filter((c) => c.is_selectable_by_customer);
    for (const comp of selectableComponents) {
      const selected = componentSelections.find((s) => s.component_product_id === comp.component_product_id);
      if (!selected) {
        const name = comp.component_product?.name ?? 'componente';
        toast({ title: `Selecione uma opção para: ${name}`, variant: 'destructive' });
        return;
      }
    }

    addItem(sheetProduct, selectedVariation ?? undefined, allowedQty, componentSelections.length > 0 ? componentSelections : undefined);
    toast({ title: 'Adicionado ao pedido!', description: sheetProduct.name });
    setSheetProduct(null);
  }

  function cartQtyForProduct(productId: number): number {
    return items
      .filter((i) => i.product.id === productId)
      .reduce((s, i) => s + i.quantity, 0);
  }

  return (
    <ClientLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gradient-primary">Catálogo</h1>
          <p className="text-muted-foreground">Produtos disponíveis para locação</p>
        </div>

        {/* Search */}
        <Card className="bg-gradient-surface border-border/50">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-primary" size={40} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Package size={48} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              {searchTerm ? 'Nenhum produto encontrado para essa busca.' : 'Nenhum produto disponível.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((product) => {
              const imgUrl = primaryImageUrl(product);
              const unavailable = !product.is_available || product.quantity_available === 0;
              const hasVariations = (product.variations ?? []).length > 0;
              const cartQty = cartQtyForProduct(product.id);

              // Preço base ou menor preço entre variações disponíveis
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
                  key={product.id}
                  className={cn(
                    'bg-gradient-surface border-border/50 flex flex-col transition-all duration-300',
                    !unavailable && 'hover:shadow-primary',
                    unavailable && 'opacity-60',
                  )}
                >
                  {/* Image */}
                  <div
                    className="relative aspect-video overflow-hidden rounded-t-xl bg-muted flex items-center justify-center cursor-pointer"
                    onClick={() => setDetailProduct(product)}
                  >
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
                        <Badge variant="destructive" className="text-xs">
                          Indisponível
                        </Badge>
                      )}
                    </div>

                    <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                      {cartQty > 0 && (
                        <Badge className="text-xs bg-primary text-primary-foreground">{cartQty} no pedido</Badge>
                      )}
                      <button
                        onClick={(e) => toggleFavorite(e, product.id)}
                        disabled={togglingFav === product.id}
                        className={cn(
                          'p-1.5 rounded-full backdrop-blur-sm transition-colors',
                          favMap.has(product.id)
                            ? 'bg-red-500/90 hover:bg-red-600'
                            : 'bg-black/40 hover:bg-black/60',
                        )}
                      >
                        <Heart
                          size={14}
                          className={cn('text-white', favMap.has(product.id) && 'fill-white')}
                        />
                      </button>
                    </div>
                  </div>

                  <CardContent className="p-4 flex flex-col flex-1">
                    <h3
                      className="font-semibold text-sm leading-snug mb-1 cursor-pointer hover:text-primary transition-colors"
                      onClick={() => setDetailProduct(product)}
                    >{product.name}</h3>
                    <p
                      className="text-xs text-muted-foreground line-clamp-2 mb-3 cursor-pointer hover:text-foreground transition-colors"
                      onClick={() => setDetailProduct(product)}
                    >
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

                    <div className="mt-auto flex items-center justify-between gap-2 flex-wrap">
                      <div className="min-w-0">
                        <div className="text-lg font-bold text-primary leading-none">
                          {isFinite(displayPrice) ? formatCurrency(displayPrice) : '—'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {hasVariations ? 'a partir de' : 'por diária'}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="px-2"
                          onClick={() => setDetailProduct(product)}
                          title="Ver detalhes"
                        >
                          <Eye size={14} />
                        </Button>
                        <Button
                          size="sm"
                          disabled={unavailable}
                          onClick={() => openSheet(product)}
                        >
                          <ShoppingCart size={14} className="mr-1" />
                          Adicionar
                        </Button>
                      </div>
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
            <Badge variant="secondary" className="ml-1">
              {totalItems}
            </Badge>
          </Button>
        </div>
      )}

      {/* Sheet de seleção */}
      <Sheet open={!!sheetProduct} onOpenChange={(open) => !open && setSheetProduct(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl overflow-y-auto">
          {sheetProduct && (
            <div className="max-w-sm mx-auto">
              <SheetHeader className="mb-3">
                <SheetTitle className="text-base">{sheetProduct.name}</SheetTitle>
                {sheetProduct.description && (
                  <SheetDescription className="text-xs line-clamp-2">{sheetProduct.description}</SheetDescription>
                )}
              </SheetHeader>

              {/* Variações diretas do produto */}
              {(sheetProduct.variations ?? []).length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Variação *</p>
                  <div className="flex flex-wrap gap-1.5">
                    {sheetProduct.variations.map((v) => (
                      <button
                        key={v.id}
                        disabled={!v.is_available}
                        onClick={() => setSelectedVariation(v)}
                        className={cn(
                          'px-3 py-1 rounded-full border text-xs transition-colors',
                          selectedVariation?.id === v.id
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border hover:border-primary',
                          !v.is_available && 'opacity-40 cursor-not-allowed',
                        )}
                      >
                        {v.name}
                        {parseFloat(v.price_modifier) > 0 && (
                          <span className="ml-1 opacity-80">+{formatCurrency(v.price_modifier)}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Componentes selecionáveis do combo (ex: tecido do arco) */}
              {(sheetProduct.components ?? [])
                .filter((c) => c.is_selectable_by_customer && (c.component_product?.variations ?? []).length > 0)
                .map((comp) => {
                  const selectedId = componentSelections.find(
                    (s) => s.component_product_id === comp.component_product_id,
                  )?.variation_id;
                  return (
                    <div key={comp.id} className="mb-4">
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        {comp.component_product?.name ?? 'Opção'} *
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {(comp.component_product?.variations ?? []).map((v) => (
                          <button
                            key={v.id}
                            disabled={!v.is_available}
                            onClick={() => selectComponentVariation(comp.component_product_id, v)}
                            className={cn(
                              'flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-colors',
                              selectedId === v.id
                                ? 'bg-primary/10 border-primary'
                                : 'border-border hover:border-primary',
                              !v.is_available && 'opacity-40 cursor-not-allowed',
                            )}
                          >
                            {v.image_path ? (
                              <img
                                src={storageUrl(v.image_path)}
                                alt={v.name}
                                className="w-full aspect-square object-cover rounded-md"
                              />
                            ) : (
                              <div className="w-full aspect-square bg-muted rounded-md flex items-center justify-center">
                                <ImageOff size={18} className="text-muted-foreground" />
                              </div>
                            )}
                            <span className="text-center leading-tight line-clamp-2">{v.name}</span>
                            {parseFloat(v.price_modifier) > 0 && (
                              <span className="text-primary font-medium">+{formatCurrency(v.price_modifier)}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}

              {/* Quantidade + Botão */}
              <SheetQtyRow
                sheetProduct={sheetProduct}
                selectedVariation={selectedVariation}
                items={items}
                qty={qty}
                setQty={setQty}
                onAdd={handleAddToCart}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Modal de detalhe do produto */}
      <Dialog open={!!detailProduct} onOpenChange={(open) => !open && setDetailProduct(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {detailProduct && (
            <>
              <DialogHeader>
                <DialogTitle>{detailProduct.name}</DialogTitle>
              </DialogHeader>
              {/* Imagem */}
              {(() => {
                const images = detailProduct.images ?? [];
                const img = images.find((i) => i.is_primary) ?? images[0];
                return img ? (
                  <img
                    src={storageUrl(img.image_path)}
                    alt={detailProduct.name}
                    className="w-full rounded-lg object-cover max-h-64"
                  />
                ) : (
                  <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center">
                    <ImageOff size={36} className="text-muted-foreground" />
                  </div>
                );
              })()}
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{detailProduct.description}</p>
              {(detailProduct.variations ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {detailProduct.variations.map((v) => (
                    <Badge key={v.id} variant="outline" className="text-xs">{v.name}</Badge>
                  ))}
                </div>
              )}
              <Button
                className="w-full mt-2"
                disabled={!detailProduct.is_available || detailProduct.quantity_available === 0}
                onClick={() => { setDetailProduct(null); openSheet(detailProduct); }}
              >
                <ShoppingCart size={15} className="mr-2" />
                Adicionar ao Pedido
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </ClientLayout>
  );
}
