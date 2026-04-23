import { useState, useEffect, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { PublicLayout } from '@/components/Layout/PublicLayout';
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
import { Search, ShoppingCart, Package, Loader2, ImageOff, Link2, Eye, Plus, Minus, CheckCircle2, Info } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { cn, storageUrl, formatCurrency } from '@/lib/utils';
import { getProducts, type ProductAPI, type ProductVariationAPI } from '@/modules/admin/products/services';
import { useAuth } from '@/contexts/AuthContext';
import { useGuestCart } from '@/contexts/GuestCartContext';
import { PublicCartDrawer } from './components/PublicCartDrawer';

function primaryImageUrl(product: ProductAPI): string {
  const images = product.images ?? [];
  const img = images.find((i) => i.is_primary) ?? images[0];
  return img ? storageUrl(img.image_path) : '';
}

function homeFor(userType: string | null): string {
  if (userType === 'admin' || userType === 'super_admin') return '/admin/dashboard';
  if (userType === 'client') return '/catalog';
  return '/login';
}

export default function PublicCatalog() {
  const { toast } = useToast();
  const { isAuthenticated, userType } = useAuth();
  const { guestItems, addGuestItem } = useGuestCart();

  const [products, setProducts] = useState<ProductAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [detailProduct, setDetailProduct] = useState<ProductAPI | null>(null);
  const [selectedVariation, setSelectedVariation] = useState<ProductVariationAPI | null>(null);
  const [addQty, setAddQty] = useState(1);

  useEffect(() => {
    if (isAuthenticated) return;
    (async () => {
      try {
        const res = await getProducts({ per_page: 100 });
        const list: ProductAPI[] = res.data?.data ?? res.data ?? [];
        setProducts(list);
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

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        (p.description ?? '').toLowerCase().includes(term),
    );
  }, [products, searchTerm]);

  if (isAuthenticated) {
    return <Navigate to={homeFor(userType)} replace />;
  }

  // Retorna quantas unidades do combo (produto + variação) já estão no guest cart
  function inCartForCombo(productId: number, variationId?: number | null): number {
    return guestItems
      .filter((i) => i.product.id === productId && (i.variation?.id ?? null) === (variationId ?? null))
      .reduce((s, i) => s + i.quantity, 0);
  }

  // Retorna o total de unidades de um produto (todas as variações) no guest cart
  function inCartForProduct(productId: number): number {
    return guestItems
      .filter((i) => i.product.id === productId)
      .reduce((s, i) => s + i.quantity, 0);
  }

  function openDetail(product: ProductAPI) {
    setDetailProduct(product);
    setSelectedVariation(null);
    setAddQty(1);
  }

  function handleAddDirect(product: ProductAPI) {
    const stock = product.quantity_available;
    const inCart = inCartForCombo(product.id);
    const remaining = Math.max(0, stock - inCart);
    if (remaining === 0) {
      toast({
        title: 'Quantidade máxima já adicionada',
        description: `Você já tem ${inCart} unidade${inCart > 1 ? 's' : ''} de "${product.name}" no orçamento.`,
        variant: 'destructive',
      });
      return;
    }
    addGuestItem(product, undefined, 1);
    toast({ title: 'Adicionado ao orçamento!', description: product.name });
  }

  function handleAddFromModal() {
    if (!detailProduct) return;
    const hasVariations = modalVariations.length > 0;
    if (hasVariations && !selectedVariation) {
      toast({ title: 'Selecione uma variação', variant: 'destructive' });
      return;
    }
    // remaining é garantido > 0 pois o botão fica desabilitado caso contrário
    addGuestItem(detailProduct, selectedVariation ?? undefined, addQty);
    toast({ title: 'Adicionado ao orçamento!', description: detailProduct.name });
    setDetailProduct(null);
  }

  // Variáveis derivadas do estado do modal — reativas automaticamente
  const modalVariations = (detailProduct?.variations ?? []).filter((v) => v.is_available);
  const modalUnavailable = !detailProduct?.is_available || detailProduct?.quantity_available === 0;

  const stockLimit = selectedVariation
    ? selectedVariation.quantity_available
    : detailProduct?.quantity_available ?? 0;

  const alreadyInCart = detailProduct
    ? inCartForCombo(detailProduct.id, selectedVariation?.id ?? null)
    : 0;

  // Quanto ainda pode ser adicionado para este combo específico
  const remaining = Math.max(0, stockLimit - alreadyInCart);

  return (
    <PublicLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gradient-primary">Catálogo</h1>
          <p className="text-muted-foreground">Produtos disponíveis para locação</p>
        </div>

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
              const inCart = inCartForProduct(product.id);
              // Para produtos sem variação, bloqueia o botão quando esgota o estoque físico
              const stockFull = !hasVariations && inCart >= product.quantity_available;

              const base = parseFloat(product.price);
              const varPrices = (product.variations ?? [])
                .filter((v: ProductVariationAPI) => v.is_available)
                .map((v: ProductVariationAPI) => parseFloat(v.price_modifier))
                .filter((p: number) => p > 0);
              const displayPrice = hasVariations && varPrices.length > 0
                ? Math.min(...varPrices)
                : base;

              return (
                <Card
                  key={product.id}
                  className={cn(
                    'bg-gradient-surface border-border/50 flex flex-col transition-all duration-300',
                    !unavailable && !stockFull && 'hover:shadow-primary',
                    (unavailable || stockFull) && 'opacity-60',
                  )}
                >
                  <div
                    className="relative aspect-video overflow-hidden rounded-t-xl bg-muted flex items-center justify-center cursor-pointer"
                    onClick={() => openDetail(product)}
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

                    {inCart > 0 && (
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-green-600 text-white text-xs gap-1">
                          <CheckCircle2 size={10} />
                          {inCart} no orçamento
                        </Badge>
                      </div>
                    )}
                  </div>

                  <CardContent className="p-4 flex flex-col flex-1">
                    <h3
                      className="font-semibold text-sm leading-snug mb-1 cursor-pointer hover:text-primary transition-colors"
                      onClick={() => openDetail(product)}
                    >
                      {product.name}
                    </h3>
                    <p
                      className="text-xs text-muted-foreground line-clamp-2 mb-3 cursor-pointer hover:text-foreground transition-colors"
                      onClick={() => openDetail(product)}
                    >
                      {product.description}
                    </p>

                    {hasVariations && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {(product.variations ?? []).slice(0, 3).map((v: ProductVariationAPI) => (
                          <Badge key={v.id} variant="outline" className="text-xs">
                            {v.value}
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
                          onClick={() => openDetail(product)}
                          title="Ver detalhes"
                        >
                          <Eye size={14} />
                        </Button>
                        <Button
                          size="sm"
                          disabled={unavailable || stockFull}
                          onClick={() => {
                            if (hasVariations) {
                              openDetail(product);
                            } else {
                              handleAddDirect(product);
                            }
                          }}
                        >
                          <ShoppingCart size={14} className="mr-1" />
                          {stockFull
                            ? 'Máximo atingido'
                            : inCart > 0 && !hasVariations
                            ? `Adicionado (${inCart})`
                            : 'Adicionar'}
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

      {/* Modal de detalhes + adicionar ao orçamento */}
      <Dialog open={!!detailProduct} onOpenChange={(open) => !open && setDetailProduct(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {detailProduct && (
            <>
              <DialogHeader>
                <DialogTitle>{detailProduct.name}</DialogTitle>
              </DialogHeader>

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

              {/* Seleção de variação */}
              {modalVariations.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Selecione uma variação</p>
                  <div className="grid grid-cols-1 gap-2">
                    {modalVariations.map((v) => {
                      const varInCart = inCartForCombo(detailProduct.id, v.id);
                      const varRemaining = Math.max(0, v.quantity_available - varInCart);
                      return (
                        <button
                          key={v.id}
                          onClick={() => {
                            setSelectedVariation(v);
                            setAddQty(1);
                          }}
                          className={cn(
                            'flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors text-left',
                            selectedVariation?.id === v.id
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border hover:border-primary/50',
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{v.value}</span>
                            {varInCart > 0 && (
                              <Badge className="bg-green-600 text-white text-xs px-1.5 py-0 h-4">
                                {varInCart} no orçamento
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0 ml-2">
                            <span>{formatCurrency(parseFloat(v.price_modifier))}/dia</span>
                            <span className={varRemaining === 0 ? 'text-destructive font-medium' : ''}>
                              {varRemaining === 0 ? 'esgotado' : `${varRemaining} restantes`}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Seletor de quantidade ou aviso de máximo atingido */}
              {!modalUnavailable && (
                <>
                  {remaining === 0 ? (
                    <div className="flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-700">
                      <Info size={15} className="shrink-0" />
                      <span>
                        {alreadyInCart > 0
                          ? `Você já tem ${alreadyInCart} unidade${alreadyInCart > 1 ? 's' : ''} no orçamento — quantidade máxima do estoque físico atingida.`
                          : 'Este item está esgotado.'}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Quantidade</p>
                        {alreadyInCart > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {alreadyInCart} já no orçamento · ainda {remaining} disponíve{remaining === 1 ? 'l' : 'is'}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setAddQty((q) => Math.max(1, q - 1))}
                          className="w-8 h-8 rounded border border-border flex items-center justify-center hover:bg-muted transition-colors"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-8 text-center font-semibold">{addQty}</span>
                        <button
                          onClick={() => setAddQty((q) => Math.min(remaining, q + 1))}
                          disabled={addQty >= remaining}
                          className="w-8 h-8 rounded border border-border flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Aviso de datas — Problema 2 (Opção A+C) */}
                  <div className="flex items-start gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                    <Info size={13} className="shrink-0 mt-0.5" />
                    <span>
                      O estoque exibido é o total físico. A disponibilidade real será confirmada ao selecionar as datas do evento após o login.
                    </span>
                  </div>
                </>
              )}

              <Button
                className="w-full mt-1"
                disabled={
                  modalUnavailable ||
                  (modalVariations.length > 0 && !selectedVariation) ||
                  remaining === 0
                }
                onClick={handleAddFromModal}
              >
                <ShoppingCart size={15} className="mr-2" />
                {modalUnavailable
                  ? 'Produto indisponível'
                  : modalVariations.length > 0 && !selectedVariation
                  ? 'Selecione uma variação'
                  : remaining === 0
                  ? 'Quantidade máxima atingida'
                  : 'Adicionar ao orçamento'}
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>

      <PublicCartDrawer />
    </PublicLayout>
  );
}
