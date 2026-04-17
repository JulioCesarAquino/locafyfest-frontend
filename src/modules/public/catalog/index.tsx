import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
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
import { Search, ShoppingCart, Package, Loader2, ImageOff, Link2, Eye } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { cn, storageUrl, formatCurrency } from '@/lib/utils';
import { getProducts, type ProductAPI, type ProductVariationAPI } from '@/modules/admin/products/services';
import { useAuth } from '@/contexts/AuthContext';

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
  const navigate = useNavigate();
  const { isAuthenticated, userType } = useAuth();

  const [products, setProducts] = useState<ProductAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [detailProduct, setDetailProduct] = useState<ProductAPI | null>(null);

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
                    !unavailable && 'hover:shadow-primary',
                    unavailable && 'opacity-60',
                  )}
                >
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
                  </div>

                  <CardContent className="p-4 flex flex-col flex-1">
                    <h3
                      className="font-semibold text-sm leading-snug mb-1 cursor-pointer hover:text-primary transition-colors"
                      onClick={() => setDetailProduct(product)}
                    >
                      {product.name}
                    </h3>
                    <p
                      className="text-xs text-muted-foreground line-clamp-2 mb-3 cursor-pointer hover:text-foreground transition-colors"
                      onClick={() => setDetailProduct(product)}
                    >
                      {product.description}
                    </p>

                    {hasVariations && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {(product.variations ?? []).slice(0, 3).map((v: ProductVariationAPI) => (
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
                          onClick={() => navigate('/login')}
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
              {(detailProduct.variations ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {detailProduct.variations.map((v: ProductVariationAPI) => (
                    <Badge key={v.id} variant="outline" className="text-xs">{v.name}</Badge>
                  ))}
                </div>
              )}
              <Button
                className="w-full mt-2"
                disabled={!detailProduct.is_available || detailProduct.quantity_available === 0}
                onClick={() => navigate('/login')}
              >
                <ShoppingCart size={15} className="mr-2" />
                Entrar para adicionar ao pedido
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PublicLayout>
  );
}
