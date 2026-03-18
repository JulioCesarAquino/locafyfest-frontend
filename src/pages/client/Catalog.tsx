import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClientLayout } from '@/components/Layout/ClientLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, ShoppingCart, Package, Loader2, ImageOff, Link2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { cn, storageUrl } from '@/lib/utils';
import { getProducts, type ProductAPI, type ProductVariationAPI } from '@/services/products';

function primaryImageUrl(product: ProductAPI): string {
  const images = product.images ?? [];
  const img = images.find((i) => i.is_primary) ?? images[0];
  return img ? storageUrl(img.image_path) : '';
}

function lowestPrice(product: ProductAPI): number {
  const base = parseFloat(product.price);
  const variationPrices = (product.variations ?? []).map((v) => parseFloat(v.price_modifier));
  if (variationPrices.length === 0) return base;
  return Math.min(...variationPrices.filter((p) => p > 0), base === 0 ? Infinity : base);
}

function formatPrice(value: number): string {
  if (!isFinite(value) || value === 0) return '—';
  return value.toFixed(2).replace('.', ',');
}

export default function Catalog() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [products, setProducts] = useState<ProductAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<Record<number, number>>({});

  useEffect(() => {
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

  const totalCartItems = Object.values(cart).reduce((s, n) => s + n, 0);

  const addToCart = (productId: number) => {
    setCart((prev) => ({ ...prev, [productId]: (prev[productId] ?? 0) + 1 }));
    toast({ title: 'Adicionado', description: 'Item adicionado ao pedido.' });
  };

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
              const price = lowestPrice(product);
              const hasVariations = (product.variations ?? []).length > 0;
              const cartQty = cart[product.id] ?? 0;

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
                  <div className="relative aspect-video overflow-hidden rounded-t-xl bg-muted flex items-center justify-center">
                    {imgUrl ? (
                      <img src={imgUrl} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <ImageOff size={36} className="text-muted-foreground" />
                    )}

                    {/* Badges overlay */}
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

                    {cartQty > 0 && (
                      <div className="absolute top-2 right-2">
                        <Badge className="text-xs bg-green-600">{cartQty} no pedido</Badge>
                      </div>
                    )}
                  </div>

                  <CardContent className="p-4 flex flex-col flex-1">
                    <h3 className="font-semibold text-sm leading-snug mb-1">{product.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                      {product.description}
                    </p>

                    {/* Variations */}
                    {hasVariations && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {(product.variations ?? []).slice(0, 3).map((v: ProductVariationAPI) => (
                          <Badge key={v.id} variant="outline" className="text-xs">
                            {v.name}
                            {parseFloat(v.price_modifier) > 0 &&
                              ` — R$ ${parseFloat(v.price_modifier).toFixed(2).replace('.', ',')}`}
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
                          {price === Infinity ? '—' : `R$ ${formatPrice(price)}`}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {hasVariations ? 'a partir de' : 'por diária'}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        disabled={unavailable}
                        onClick={() => addToCart(product.id)}
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
      {totalCartItems > 0 && (
        <div className="fixed bottom-6 right-6 z-40">
          <Button
            size="lg"
            className="rounded-full shadow-primary gap-2"
            onClick={() => navigate('/my-order')}
          >
            <ShoppingCart size={20} />
            Ver Pedido
            <Badge variant="secondary" className="ml-1">
              {totalCartItems}
            </Badge>
          </Button>
        </div>
      )}
    </ClientLayout>
  );
}
