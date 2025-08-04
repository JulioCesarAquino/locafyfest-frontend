import { useState } from 'react';
import { ClientLayout } from '@/components/Layout/ClientLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ShoppingCart, Heart, Filter } from 'lucide-react';
import { mockProducts, productCategories } from '@/data/mockData';
import { cn } from '@/lib/utils';

export default function Catalog() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [cart, setCart] = useState<{[key: string]: number}>({});

  const filteredProducts = mockProducts.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (productId: string) => {
    setCart(prev => ({
      ...prev,
      [productId]: (prev[productId] || 0) + 1
    }));
  };

  const getCartQuantity = (productId: string) => cart[productId] || 0;

  return (
    <ClientLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gradient-primary">Catálogo de Produtos</h1>
          <p className="text-muted-foreground">Explore nossos produtos disponíveis para locação</p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                  placeholder="Buscar produtos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full md:w-48">
                  <Filter size={18} className="mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {productCategories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map(product => (
            <Card key={product.id} className={cn(
              "group hover:shadow-lg transition-all duration-300",
              !product.available && "opacity-60"
            )}>
              <CardHeader className="p-0">
                <div className="relative">
                  <img 
                    src={product.image} 
                    alt={product.name}
                    className="w-full h-48 object-cover rounded-t-lg"
                  />
                  <div className="absolute top-3 right-3">
                    <Button variant="outline" size="icon" className="bg-white/80 backdrop-blur-sm">
                      <Heart size={16} />
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
                    
                    <div className="flex items-center gap-2">
                      {getCartQuantity(product.id) > 0 && (
                        <Badge variant="default" className="px-2">
                          {getCartQuantity(product.id)}
                        </Badge>
                      )}
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
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhum produto encontrado.</p>
          </div>
        )}

        {/* Floating Cart Button */}
        {Object.keys(cart).length > 0 && (
          <div className="fixed bottom-6 right-6">
            <Button size="lg" className="rounded-full shadow-lg">
              <ShoppingCart className="mr-2" size={20} />
              Ir para Pedido
              <Badge variant="secondary" className="ml-2">
                {Object.values(cart).reduce((sum, qty) => sum + qty, 0)}
              </Badge>
            </Button>
          </div>
        )}
      </div>
    </ClientLayout>
  );
}