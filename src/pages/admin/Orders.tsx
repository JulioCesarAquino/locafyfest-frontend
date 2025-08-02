import { useState } from 'react';
import { AppLayout } from '@/components/Layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarIcon, Plus, Search, Package, Users, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

// Dados de exemplo
const clientsExample = [
  { id: '1', name: 'João Silva', phone: '(11) 99999-9999' },
  { id: '2', name: 'Maria Santos', phone: '(11) 88888-8888' },
  { id: '3', name: 'Pedro Costa', phone: '(11) 77777-7777' },
];

const productsExample = [
  {
    id: '1',
    name: 'Mesa de Festa Redonda',
    variations: [
      { id: '1', name: 'Branca', price: 50, quantity: 10 },
      { id: '2', name: 'Azul', price: 55, quantity: 5 },
    ]
  },
  {
    id: '2',
    name: 'Cadeira Plástica',
    variations: [
      { id: '3', name: 'Branca', price: 8, quantity: 50 },
      { id: '4', name: 'Preta', price: 8, quantity: 30 },
      { id: '5', name: 'Vermelha', price: 10, quantity: 20 },
    ]
  },
  {
    id: '3',
    name: 'Toalha de Mesa',
    variations: [
      { id: '6', name: 'Branca', price: 15, quantity: 25 },
      { id: '7', name: 'Azul', price: 18, quantity: 15 },
    ]
  }
];

const ordersExample = [
  {
    id: '1',
    client: 'João Silva',
    items: [
      { product: 'Mesa de Festa Redonda', variation: 'Branca', quantity: 2, price: 50 },
      { product: 'Cadeira Plástica', variation: 'Branca', quantity: 8, price: 8 }
    ],
    startDate: '2024-02-15',
    endDate: '2024-02-16',
    status: 'confirmado',
    total: 164
  },
  {
    id: '2',
    client: 'Maria Santos',
    items: [
      { product: 'Toalha de Mesa', variation: 'Azul', quantity: 3, price: 18 }
    ],
    startDate: '2024-02-20',
    endDate: '2024-02-22',
    status: 'pendente',
    total: 54
  }
];

const statusOptions = [
  { value: 'pendente', label: 'Pendente', color: 'bg-yellow-500' },
  { value: 'confirmado', label: 'Confirmado', color: 'bg-blue-500' },
  { value: 'aguardando-pagamento', label: 'Aguardando Pagamento', color: 'bg-orange-500' },
  { value: 'concluido', label: 'Concluído', color: 'bg-green-500' },
  { value: 'cancelado', label: 'Cancelado', color: 'bg-red-500' }
];

interface OrderItem {
  productId: string;
  variationId: string;
  quantity: number;
}

export default function Orders() {
  const [activeTab, setActiveTab] = useState<'list' | 'new'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form states
  const [selectedClient, setSelectedClient] = useState('');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedVariation, setSelectedVariation] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [status, setStatus] = useState('pendente');

  const getStatusBadge = (status: string) => {
    const statusConfig = statusOptions.find(s => s.value === status);
    return (
      <Badge 
        variant="secondary" 
        className={cn("text-white", statusConfig?.color)}
      >
        {statusConfig?.label}
      </Badge>
    );
  };

  const selectedProductData = productsExample.find(p => p.id === selectedProduct);
  const selectedVariationData = selectedProductData?.variations.find(v => v.id === selectedVariation);

  const addItemToOrder = () => {
    if (!selectedProduct || !selectedVariation || quantity < 1) {
      toast({
        title: "Erro",
        description: "Selecione um produto, variação e quantidade válida",
        variant: "destructive"
      });
      return;
    }

    const newItem: OrderItem = {
      productId: selectedProduct,
      variationId: selectedVariation,
      quantity: quantity
    };

    setOrderItems([...orderItems, newItem]);
    setSelectedProduct('');
    setSelectedVariation('');
    setQuantity(1);
    
    toast({
      title: "Item adicionado",
      description: "Item adicionado ao pedido com sucesso"
    });
  };

  const removeItemFromOrder = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return orderItems.reduce((total, item) => {
      const product = productsExample.find(p => p.id === item.productId);
      const variation = product?.variations.find(v => v.id === item.variationId);
      return total + (variation?.price || 0) * item.quantity;
    }, 0);
  };

  const handleSubmitOrder = () => {
    if (!selectedClient || orderItems.length === 0 || !startDate || !endDate) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    // Aqui seria feita a chamada para a API
    toast({
      title: "Pedido criado",
      description: "Pedido criado com sucesso!"
    });

    // Reset form
    setSelectedClient('');
    setOrderItems([]);
    setStartDate(undefined);
    setEndDate(undefined);
    setStatus('pendente');
    setActiveTab('list');
  };

  const filteredOrders = ordersExample.filter(order =>
    order.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.id.includes(searchTerm)
  );

  return (
    <AppLayout userType="admin" userName="Administrador">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Pedidos</h1>
            <p className="text-muted-foreground">Gerencie os pedidos de aluguel</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              variant={activeTab === 'list' ? 'default' : 'outline'}
              onClick={() => setActiveTab('list')}
              className="flex items-center gap-2 justify-center"
              size="sm"
            >
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Listar Pedidos</span>
              <span className="sm:hidden">Lista</span>
            </Button>
            <Button
              variant={activeTab === 'new' ? 'default' : 'outline'}
              onClick={() => setActiveTab('new')}
              className="flex items-center gap-2 justify-center"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Novo Pedido</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          </div>
        </div>

        {activeTab === 'list' && (
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <CardTitle className="text-lg sm:text-xl">Pedidos</CardTitle>
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-full sm:w-64"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <div className="min-w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">ID</TableHead>
                      <TableHead className="min-w-32">Cliente</TableHead>
                      <TableHead className="hidden md:table-cell min-w-48">Itens</TableHead>
                      <TableHead className="hidden lg:table-cell min-w-32">Período</TableHead>
                      <TableHead className="min-w-24">Status</TableHead>
                      <TableHead className="min-w-20 text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium text-xs sm:text-sm">#{order.id}</TableCell>
                        <TableCell>
                          <div className="text-xs sm:text-sm font-medium">{order.client}</div>
                          <div className="md:hidden text-xs text-muted-foreground mt-1">
                            {order.items.length} {order.items.length === 1 ? 'item' : 'itens'}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="space-y-1">
                            {order.items.map((item, index) => (
                              <div key={index} className="text-sm">
                                {item.quantity}x {item.product} ({item.variation})
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="text-sm">
                            <div>{format(new Date(order.startDate), 'dd/MM/yyyy', { locale: ptBR })}</div>
                            <div className="text-muted-foreground text-xs">até {format(new Date(order.endDate), 'dd/MM/yyyy', { locale: ptBR })}</div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell className="font-medium text-right text-sm">R$ {order.total}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'new' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5" />
                  Informações do Pedido
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="client">Cliente *</Label>
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border z-50">
                      {clientsExample.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name} - {client.phone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data de Início *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal text-sm",
                            !startDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-background border-border z-50" align="start">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Data de Entrega *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal text-sm",
                            !endDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? format(endDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-background border-border z-50" align="start">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border z-50">
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Package className="h-5 w-5" />
                  Adicionar Produtos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="product">Produto</Label>
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um produto" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border z-50">
                      {productsExample.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedProductData && (
                  <div className="space-y-2">
                    <Label htmlFor="variation">Variação</Label>
                    <Select value={selectedVariation} onValueChange={setSelectedVariation}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma variação" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border-border z-50">
                        {selectedProductData.variations.map((variation) => (
                          <SelectItem key={variation.id} value={variation.id}>
                            {variation.name} - R$ {variation.price} (Estoque: {variation.quantity})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantidade</Label>
                  <div className="flex gap-2">
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      max={selectedVariationData?.quantity || 1}
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      className="flex-1"
                    />
                    <Button onClick={addItemToOrder} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {orderItems.length > 0 && (
                  <div className="space-y-2">
                    <Label>Itens do Pedido</Label>
                    <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
                      {orderItems.map((item, index) => {
                        const product = productsExample.find(p => p.id === item.productId);
                        const variation = product?.variations.find(v => v.id === item.variationId);
                        return (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <span className="text-xs sm:text-sm">
                              {item.quantity}x {product?.name} ({variation?.name})
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-xs sm:text-sm">R$ {(variation?.price || 0) * item.quantity}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItemFromOrder(index)}
                                className="h-6 w-6 p-0"
                              >
                                ×
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                      <div className="border-t pt-2 font-medium text-sm">
                        Total: R$ {calculateTotal()}
                      </div>
                    </div>
                  </div>
                )}

                <Button onClick={handleSubmitOrder} className="w-full" size="lg">
                  <Clock className="mr-2 h-4 w-4" />
                  Criar Pedido
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}