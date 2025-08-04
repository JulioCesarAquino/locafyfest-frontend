import { useState } from 'react';
import { ClientLayout } from '@/components/Layout/ClientLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CalendarIcon, Plus, Minus, Trash2, Package } from 'lucide-react';
import { mockProducts, type OrderItem } from '@/data/mockData';
import { cn } from '@/lib/utils';

export default function MyOrder() {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedVariation, setSelectedVariation] = useState('');
  const [quantity, setQuantity] = useState(1);

  const addItemToOrder = () => {
    if (!selectedProduct) return;

    const product = mockProducts.find(p => p.id === selectedProduct);
    if (!product) return;

    const existingItemIndex = orderItems.findIndex(
      item => item.productId === selectedProduct && 
      item.variation === (selectedVariation || undefined)
    );

    if (existingItemIndex >= 0) {
      const updatedItems = [...orderItems];
      updatedItems[existingItemIndex].quantity += quantity;
      updatedItems[existingItemIndex].totalPrice = 
        updatedItems[existingItemIndex].quantity * product.price;
      setOrderItems(updatedItems);
    } else {
      const newItem: OrderItem = {
        productId: selectedProduct,
        productName: product.name,
        variation: selectedVariation || undefined,
        quantity,
        unitPrice: product.price,
        totalPrice: quantity * product.price
      };
      setOrderItems([...orderItems, newItem]);
    }

    // Reset form
    setSelectedProduct('');
    setSelectedVariation('');
    setQuantity(1);
  };

  const updateItemQuantity = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(index);
      return;
    }

    const updatedItems = [...orderItems];
    updatedItems[index].quantity = newQuantity;
    updatedItems[index].totalPrice = newQuantity * updatedItems[index].unitPrice;
    setOrderItems(updatedItems);
  };

  const removeItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  const calculateDays = () => {
    if (!deliveryDate || !returnDate) return 1;
    const delivery = new Date(deliveryDate);
    const returnD = new Date(returnDate);
    const diffTime = Math.abs(returnD.getTime() - delivery.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays);
  };

  const submitOrder = () => {
    if (orderItems.length === 0 || !deliveryDate || !returnDate) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    // Simulate order submission
    alert('Pedido enviado com sucesso! Em breve entraremos em contato.');
    
    // Reset form
    setOrderItems([]);
    setDeliveryDate('');
    setReturnDate('');
    setNotes('');
  };

  const selectedProductData = mockProducts.find(p => p.id === selectedProduct);

  return (
    <ClientLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gradient-primary">Fazer Pedido</h1>
          <p className="text-muted-foreground">Monte seu pedido selecionando os produtos desejados</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Add Products */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus size={20} />
                Adicionar Produtos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Produto *</label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockProducts.filter(p => p.available).map(product => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} - R$ {product.price.toFixed(2)}/dia
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedProductData?.variations && (
                <div>
                  <label className="text-sm font-medium">Variação</label>
                  <Select value={selectedVariation} onValueChange={setSelectedVariation}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma variação" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedProductData.variations.map(variation => (
                        <SelectItem key={variation} value={variation}>
                          {variation}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <label className="text-sm font-medium">Quantidade *</label>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    <Minus size={16} />
                  </Button>
                  <Input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 text-center"
                    min="1"
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    <Plus size={16} />
                  </Button>
                </div>
              </div>

              <Button 
                onClick={addItemToOrder}
                disabled={!selectedProduct}
                className="w-full"
              >
                Adicionar ao Pedido
              </Button>
            </CardContent>
          </Card>

          {/* Order Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package size={20} />
                Detalhes do Pedido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Data de Entrega *</label>
                  <Input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Data de Devolução *</label>
                  <Input
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    min={deliveryDate || new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Observações</label>
                <Textarea
                  placeholder="Informações adicionais sobre o evento..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              {deliveryDate && returnDate && (
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-sm">
                    <strong>Período:</strong> {calculateDays()} dia(s)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Resumo do Pedido</CardTitle>
          </CardHeader>
          <CardContent>
            {orderItems.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhum item adicionado ao pedido
              </p>
            ) : (
              <div className="space-y-4">
                {orderItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{item.productName}</h4>
                      {item.variation && (
                        <p className="text-sm text-muted-foreground">Variação: {item.variation}</p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        R$ {item.unitPrice.toFixed(2)}/dia × {item.quantity} = R$ {item.totalPrice.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateItemQuantity(index, item.quantity - 1)}
                      >
                        <Minus size={14} />
                      </Button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateItemQuantity(index, item.quantity + 1)}
                      >
                        <Plus size={14} />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))}

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center text-lg font-semibold">
                    <span>Total ({calculateDays()} dia{calculateDays() > 1 ? 's' : ''})</span>
                    <span>R$ {(calculateTotal() * calculateDays()).toFixed(2)}</span>
                  </div>
                </div>

                <Button 
                  onClick={submitOrder}
                  className="w-full"
                  size="lg"
                >
                  Enviar Pedido
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
}