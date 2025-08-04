import { useState } from 'react';
import { ClientLayout } from '@/components/Layout/ClientLayout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, ShoppingCart, Trash2 } from 'lucide-react';
import { mockProducts } from '@/data/mockData';
import { cn } from '@/lib/utils';

export default function Favorites() {
  // Simulate some favorite products
  const [favoriteProductIds, setFavoriteProductIds] = useState(['1', '3', '6']);
  
  const favoriteProducts = mockProducts.filter(product => 
    favoriteProductIds.includes(product.id)
  );

  const removeFavorite = (productId: string) => {
    setFavoriteProductIds(prev => prev.filter(id => id !== productId));
  };

  const addToCart = (productId: string) => {
    // Simulate add to cart
    alert(`Produto adicionado ao carrinho!`);
  };

  return (
    <ClientLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gradient-primary">Meus Favoritos</h1>
          <p className="text-muted-foreground">
            Produtos salvos para facilitar seus próximos pedidos
          </p>
        </div>

        {favoriteProducts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Heart size={48} className="mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum favorito ainda</h3>
              <p className="text-muted-foreground mb-4">
                Adicione produtos aos favoritos para encontrá-los facilmente
              </p>
              <Button asChild>
                <a href="/catalog">Explorar Catálogo</a>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favoriteProducts.map(product => (
              <Card key={product.id} className="group hover:shadow-lg transition-all duration-300">
                <CardHeader className="p-0">
                  <div className="relative">
                    <img 
                      src={product.image} 
                      alt={product.name}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                    <div className="absolute top-3 right-3">
                      <Button 
                        variant="destructive" 
                        size="icon" 
                        className="bg-red-500/80 backdrop-blur-sm hover:bg-red-600"
                        onClick={() => removeFavorite(product.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                    {!product.available && (
                      <div className="absolute inset-0 bg-black/50 rounded-t-lg flex items-center justify-center">
                        <Badge variant="destructive">Indisponível</Badge>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg">{product.name}</h3>
                        <Badge variant="secondary">{product.category}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{product.description}</p>
                    </div>
                    
                    {product.variations && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Variações:</p>
                        <div className="flex flex-wrap gap-1">
                          {product.variations.map(variation => (
                            <Badge key={variation} variant="outline" className="text-xs">
                              {variation}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2">
                      <div>
                        <span className="text-2xl font-bold text-primary">
                          R$ {product.price.toFixed(2)}
                        </span>
                        <span className="text-sm text-muted-foreground">/dia</span>
                      </div>
                      
                      <Button 
                        onClick={() => addToCart(product.id)}
                        disabled={!product.available}
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <ShoppingCart size={16} />
                        Adicionar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ClientLayout>
  );
}