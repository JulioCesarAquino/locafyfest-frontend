import { useState } from 'react';
import { ClientLayout } from '@/components/Layout/ClientLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Calendar, Package, Eye, RotateCcw } from 'lucide-react';
import { mockOrders, statusLabels, statusColors } from '@/data/mockData';
import { cn } from '@/lib/utils';

export default function History() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredOrders = mockOrders.filter(order => {
    const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.items.some(item => 
                           item.productName.toLowerCase().includes(searchTerm.toLowerCase())
                         );
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (status: keyof typeof statusLabels) => {
    return (
      <Badge className={cn(statusColors[status])}>
        {statusLabels[status]}
      </Badge>
    );
  };

  const reorderItems = (orderId: string) => {
    // Simulate reorder functionality
    alert(`Reordenando itens do pedido ${orderId}...`);
  };

  return (
    <ClientLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gradient-primary">Histórico de Pedidos</h1>
          <p className="text-muted-foreground">Acompanhe todos os seus pedidos anteriores</p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                  placeholder="Buscar por ID do pedido ou produto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="confirmed">Confirmado</SelectItem>
                  <SelectItem value="delivered">Entregue</SelectItem>
                  <SelectItem value="returned">Devolvido</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        <div className="space-y-4">
          {filteredOrders.map(order => (
            <Card key={order.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Package size={20} />
                      Pedido #{order.id}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Criado em {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(order.status)}
                    <Button variant="outline" size="sm">
                      <Eye size={16} className="mr-2" />
                      Detalhes
                    </Button>
                    {order.status === 'returned' && (
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => reorderItems(order.id)}
                      >
                        <RotateCcw size={16} className="mr-2" />
                        Reordenar
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Event Dates */}
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <Calendar size={16} />
                      Período do Evento
                    </h4>
                    <div className="text-sm text-muted-foreground">
                      <p>Entrega: {formatDate(order.deliveryDate)}</p>
                      <p>Devolução: {formatDate(order.returnDate)}</p>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="space-y-2">
                    <h4 className="font-medium">Itens ({order.items.length})</h4>
                    <div className="space-y-1">
                      {order.items.slice(0, 3).map((item, index) => (
                        <div key={index} className="text-sm text-muted-foreground">
                          {item.quantity}x {item.productName}
                          {item.variation && ` (${item.variation})`}
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <p className="text-sm text-muted-foreground">
                          +{order.items.length - 3} item(s) a mais
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Total */}
                  <div className="space-y-2">
                    <h4 className="font-medium">Valor Total</h4>
                    <p className="text-2xl font-bold text-primary">
                      R$ {order.totalAmount.toFixed(2)}
                    </p>
                    {order.notes && (
                      <p className="text-sm text-muted-foreground">
                        <strong>Obs:</strong> {order.notes}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredOrders.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Package size={48} className="mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum pedido encontrado.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </ClientLayout>
  );
}