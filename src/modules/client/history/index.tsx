import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClientLayout } from '@/components/Layout/ClientLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Search, Calendar, Package, Loader2, MapPin, FileText,
  ChevronDown, ChevronUp, Truck,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { getMyOrders, type OrderAPI } from '@/modules/admin/orders/services';
import { InvoiceSection } from './invoice-section';
import { toast } from 'sonner';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  delivered: 'Entregue',
  returned: 'Concluído',
  cancelled: 'Cancelado',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  delivered: 'bg-green-100 text-green-800',
  returned: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function History() {
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('order') ? Number(searchParams.get('order')) : null;

  const [orders, setOrders] = useState<OrderAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<number | null>(highlightId);

  const highlightRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    getMyOrders()
      .then(setOrders)
      .catch(() => toast.error('Erro ao carregar pedidos'))
      .finally(() => setLoading(false));
  }, []);

  // Scroll to highlighted order after loading
  useEffect(() => {
    if (!loading && highlightId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [loading, highlightId]);

  const filtered = orders.filter((o) => {
    const matchesSearch =
      o.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.items ?? []).some((i) =>
        (i.product?.name ?? i.product_snapshot?.name ?? '')
          .toLowerCase()
          .includes(searchTerm.toLowerCase()),
      );
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <ClientLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gradient-primary">Histórico de Pedidos</h1>
          <p className="text-muted-foreground">Acompanhe todos os seus pedidos</p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                  placeholder="Buscar por número do pedido ou produto..."
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
                  <SelectItem value="returned">Concluído</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Orders */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-muted-foreground" size={32} />
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((order) => {
              const isHighlighted = order.id === highlightId;
              const isExpanded = expandedId === order.id;
              const items = order.items ?? [];
              const addr = order.delivery_address ?? order.address;

              return (
                <div key={order.id} ref={isHighlighted ? highlightRef : undefined}>
                  <Card className={cn('transition-shadow hover:shadow-md', isHighlighted && 'ring-2 ring-primary')}>
                    {/* Clickable header to expand/collapse */}
                    <CardHeader
                      className="cursor-pointer select-none"
                      onClick={() => setExpandedId(isExpanded ? null : order.id)}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Package size={20} />
                            Pedido #{order.order_number}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Criado em {formatDate(order.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={cn(STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-800')}>
                            {STATUS_LABELS[order.status] ?? order.status}
                          </Badge>
                          {isExpanded
                            ? <ChevronUp size={16} className="text-muted-foreground" />
                            : <ChevronDown size={16} className="text-muted-foreground" />}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent>
                      {/* Summary row */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <h4 className="font-medium flex items-center gap-2">
                            <Calendar size={16} />
                            Período
                          </h4>
                          <div className="text-sm text-muted-foreground">
                            <p>Início: {formatDate(order.rental_start_date)}</p>
                            <p>Devolução: {formatDate(order.rental_end_date)}</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-medium">Itens ({items.length})</h4>
                          <div className="space-y-1">
                            {items.slice(0, 3).map((item) => (
                              <div key={item.id} className="text-sm text-muted-foreground">
                                {item.quantity}x {item.product?.name ?? item.product_snapshot?.name ?? '—'}
                                {item.variation?.name && ` (${item.variation.name})`}
                              </div>
                            ))}
                            {items.length > 3 && (
                              <p className="text-sm text-muted-foreground">
                                +{items.length - 3} item(s) a mais
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-medium">Valor Total</h4>
                          <p className="text-2xl font-bold text-primary">
                            {formatCurrency(parseFloat(order.total_amount))}
                          </p>
                        </div>
                      </div>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="mt-6 pt-4 border-t space-y-4">
                          {/* All items with prices */}
                          {items.length > 0 && (
                            <div>
                              <h4 className="font-medium mb-2">Itens do pedido</h4>
                              <div className="space-y-1">
                                {items.map((item) => (
                                  <div key={item.id} className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                      {item.quantity}x {item.product?.name ?? item.product_snapshot?.name ?? '—'}
                                      {item.variation?.name && ` (${item.variation.name})`}
                                    </span>
                                    <span>{formatCurrency(parseFloat(item.unit_price) * item.quantity)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Fees & total */}
                          <div className="space-y-1 text-sm">
                            {order.delivery_fee && parseFloat(order.delivery_fee) > 0 && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground flex items-center gap-1">
                                  <Truck size={13} /> Frete
                                </span>
                                <span>{formatCurrency(parseFloat(order.delivery_fee))}</span>
                              </div>
                            )}
                            {order.discount_amount && parseFloat(order.discount_amount) > 0 && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Desconto</span>
                                <span className="text-green-600">
                                  -{formatCurrency(parseFloat(order.discount_amount))}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                              <span>Total</span>
                              <span>{formatCurrency(parseFloat(order.total_amount))}</span>
                            </div>
                          </div>

                          {/* Address */}
                          {addr && (
                            <div>
                              <h4 className="font-medium flex items-center gap-2 mb-1">
                                <MapPin size={14} /> Endereço de Entrega
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {addr.street}, {addr.number}
                                {addr.complement ? ` - ${addr.complement}` : ''},{' '}
                                {addr.neighborhood}, {addr.city} - {addr.state}
                              </p>
                            </div>
                          )}

                          {/* Notes */}
                          {order.notes && (
                            <div>
                              <h4 className="font-medium flex items-center gap-2 mb-1">
                                <FileText size={14} /> Observações
                              </h4>
                              <p className="text-sm text-muted-foreground">{order.notes}</p>
                            </div>
                          )}

                          {/* Cancellation reason */}
                          {order.cancellation_reason && (
                            <div>
                              <h4 className="font-medium mb-1 text-destructive">Motivo do cancelamento</h4>
                              <p className="text-sm text-muted-foreground">{order.cancellation_reason}</p>
                            </div>
                          )}

                          {/* Nota Fiscal */}
                          <InvoiceSection order={order} />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            })}

            {filtered.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <Package size={48} className="mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhum pedido encontrado.</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
