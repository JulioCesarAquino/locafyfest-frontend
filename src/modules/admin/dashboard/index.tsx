import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Package,
  Users,
  ShoppingCart,
  DollarSign,
  Calendar,
  AlertCircle,
  CheckCircle,
  Loader2,
  CreditCard,
  RotateCcw,
  XCircle,
  Truck,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { AppLayout } from '@/components/Layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getOrders, type OrderAPI } from '@/modules/admin/orders/services';
import { getClients } from '@/modules/admin/clients/services';
import { getProducts, type ProductAPI } from '@/modules/admin/products/services';
import { formatCurrency } from '@/lib/utils';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR');
}

function daysUntil(dateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending:   { label: 'Pendente',   color: 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30', icon: Clock },
  confirmed: { label: 'Confirmado', color: 'bg-blue-500/15 text-blue-600 border-blue-500/30',       icon: CheckCircle },
  delivered: { label: 'Entregue',   color: 'bg-purple-500/15 text-purple-600 border-purple-500/30', icon: Truck },
  returned:  { label: 'Concluído',  color: 'bg-green-500/15 text-green-600 border-green-500/30',    icon: RotateCcw },
  cancelled: { label: 'Cancelado',  color: 'bg-red-500/15 text-red-600 border-red-500/30',          icon: XCircle },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderAPI[]>([]);
  const [clientCount, setClientCount] = useState(0);
  const [products, setProducts] = useState<ProductAPI[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [ordersData, clientsData, productsRes] = await Promise.all([
          getOrders({ per_page: 200 }),
          getClients(),
          getProducts({ include_unavailable: true }),
        ]);
        setOrders(ordersData);
        setClientCount(clientsData.length);
        const list: ProductAPI[] = productsRes?.data?.data ?? productsRes?.data ?? [];
        setProducts(list);
      } catch (err) {
        console.error('Erro ao carregar dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ─── Derivações ───────────────────────────────────────────────────────────

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Stats de pedidos
  const activeOrders = orders.filter((o) => ['pending', 'confirmed'].includes(o.status));
  const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.total_amount || '0'), 0);

  const unpaidOrders = orders.filter(
    (o) => o.payment_status !== 'paid' && !['cancelled', 'returned'].includes(o.status)
  );
  const unpaidValue = unpaidOrders.reduce(
    (sum, o) => sum + parseFloat(o.total_amount || '0'),
    0
  );

  // Stats de produtos
  const availableProducts = products.filter((p) => p.is_available);
  const unavailableProducts = products.filter((p) => !p.is_available);
  const lowStockProducts = products.filter(
    (p) => p.is_available && p.quantity_available > 0 && p.quantity_available <= 2
  );

  // Pedidos por status
  const statusCounts = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  // Pedidos recentes: pending + confirmed, mais novos primeiro
  const recentOrders = [...orders]
    .filter((o) => ['pending', 'confirmed'].includes(o.status))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  // Devoluções próximas: entregues com rental_end_date nos próximos 7 dias
  const upcomingReturns = [...orders]
    .filter((o) => {
      const days = daysUntil(o.rental_end_date);
      return o.status === 'delivered' && days >= 0 && days <= 7;
    })
    .sort(
      (a, b) =>
        new Date(a.rental_end_date).getTime() - new Date(b.rental_end_date).getTime()
    )
    .slice(0, 5);

  // ─── Stats cards ──────────────────────────────────────────────────────────

  const statsRow1 = [
    {
      title: 'Receita Total',
      value: formatCurrency(totalRevenue),
      badge: `${orders.length} pedido${orders.length !== 1 ? 's' : ''}`,
      badgeType: 'increase' as const,
      icon: DollarSign,
      description: 'Soma de todos os pedidos',
    },
    {
      title: 'Pedidos Ativos',
      value: String(activeOrders.length),
      badge: `${activeOrders.filter((o) => o.status === 'pending').length} pendente${activeOrders.filter((o) => o.status === 'pending').length !== 1 ? 's' : ''}`,
      badgeType: 'increase' as const,
      icon: ShoppingCart,
      description: 'Pendentes e confirmados',
    },
    {
      title: 'Pagamentos Pendentes',
      value: String(unpaidOrders.length),
      badge: unpaidOrders.length > 0 ? 'Atenção' : 'Em dia',
      badgeType: unpaidOrders.length > 0 ? ('warning' as const) : ('increase' as const),
      icon: CreditCard,
      description: 'Pedidos não pagos',
    },
    {
      title: 'Valor a Receber',
      value: formatCurrency(unpaidValue),
      badge: unpaidOrders.length > 0 ? `${unpaidOrders.length} em aberto` : 'Nenhum',
      badgeType: unpaidOrders.length > 0 ? ('warning' as const) : ('increase' as const),
      icon: TrendingUp,
      description: 'Soma dos pedidos não pagos',
    },
  ];

  const statsRow2 = [
    {
      title: 'Clientes',
      value: String(clientCount),
      badge: `${clientCount} cadastrado${clientCount !== 1 ? 's' : ''}`,
      badgeType: 'increase' as const,
      icon: Users,
      description: 'Total de clientes',
    },
    {
      title: 'Produtos Disponíveis',
      value: String(availableProducts.length),
      badge:
        unavailableProducts.length > 0
          ? `${unavailableProducts.length} indisponível`
          : 'Todos ativos',
      badgeType: unavailableProducts.length > 0 ? ('warning' as const) : ('increase' as const),
      icon: Package,
      description: `Do total de ${products.length} produto${products.length !== 1 ? 's' : ''}`,
    },
    {
      title: 'Estoque Baixo',
      value: String(lowStockProducts.length),
      badge: lowStockProducts.length > 0 ? 'Atenção' : 'Normal',
      badgeType: lowStockProducts.length > 0 ? ('warning' as const) : ('increase' as const),
      icon: AlertTriangle,
      description: 'Produtos com ≤ 2 unidades',
    },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <AppLayout userType="admin">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout userType="admin">
      <div className="space-y-6">

        {/* Stats Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsRow1.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </div>

        {/* Stats Row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {statsRow2.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </div>

        {/* Pedidos por Status */}
        <Card className="bg-gradient-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-base">
              <ShoppingCart className="w-4 h-4" />
              <span>Pedidos por Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                const count = statusCounts[key] || 0;
                const Icon = cfg.icon;
                return (
                  <button
                    key={key}
                    onClick={() => navigate(`/admin/orders?status=${key}`)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-opacity hover:opacity-75 cursor-pointer ${cfg.color}`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{cfg.label}</span>
                    <span className="font-bold">{count}</span>
                  </button>
                );
              })}
              {orders.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum pedido cadastrado.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pedidos Recentes + Devoluções Próximas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Pedidos Recentes */}
          <Card className="bg-gradient-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ShoppingCart className="w-5 h-5" />
                <span>Pedidos Recentes</span>
              </CardTitle>
              <CardDescription>Pendentes e confirmados mais recentes</CardDescription>
            </CardHeader>
            <CardContent>
              {recentOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Nenhum pedido ativo no momento.
                </p>
              ) : (
                <div className="space-y-3">
                  {recentOrders.map((order) => {
                    const itemNames = order.items
                      ?.map(
                        (i) =>
                          i.product_snapshot?.name ??
                          i.product?.name ??
                          `Produto #${i.product_id}`
                      )
                      .join(', ');
                    return (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-3 bg-surface rounded-lg"
                      >
                        <div className="flex-1 min-w-0 mr-3">
                          <p className="font-medium text-foreground truncate">
                            {order.client?.name ?? `Cliente #${order.client_id}`}
                          </p>
                          {itemNames && (
                            <p className="text-xs text-muted-foreground truncate">{itemNames}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            #{order.order_number} •{' '}
                            {new Date(order.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold text-sm text-foreground">
                            {formatCurrency(order.total_amount)}
                          </p>
                          <Badge
                            variant={order.status === 'confirmed' ? 'default' : 'secondary'}
                            className={
                              order.status === 'confirmed'
                                ? 'bg-success text-success-foreground text-xs'
                                : 'text-xs'
                            }
                          >
                            {order.status === 'confirmed' ? (
                              <><CheckCircle className="w-3 h-3 mr-1" />Confirmado</>
                            ) : (
                              <><AlertCircle className="w-3 h-3 mr-1" />Pendente</>
                            )}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => navigate('/admin/orders')}
              >
                Ver Todos os Pedidos
              </Button>
            </CardContent>
          </Card>

          {/* Devoluções Próximas */}
          <Card className="bg-gradient-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <RotateCcw className="w-5 h-5" />
                <span>Devoluções Próximas</span>
              </CardTitle>
              <CardDescription>Itens entregues com devolução nos próximos 7 dias</CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingReturns.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Nenhuma devolução prevista nos próximos 7 dias.
                </p>
              ) : (
                <div className="space-y-3">
                  {upcomingReturns.map((order) => {
                    const days = daysUntil(order.rental_end_date);
                    return (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-3 bg-surface rounded-lg"
                      >
                        <div className="flex-1 min-w-0 mr-3">
                          <p className="font-medium text-foreground truncate">
                            {order.client?.name ?? `Cliente #${order.client_id}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            #{order.order_number} • {order.items?.length ?? 0} iten{(order.items?.length ?? 0) !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold text-sm text-foreground">
                            {formatDate(order.rental_end_date)}
                          </p>
                          <Badge
                            variant="outline"
                            className={
                              days === 0
                                ? 'border-red-500 text-red-600 text-xs'
                                : days <= 2
                                ? 'border-yellow-500 text-yellow-600 text-xs'
                                : 'text-xs'
                            }
                          >
                            <Calendar className="w-3 h-3 mr-1" />
                            {days === 0 ? 'Hoje' : days === 1 ? 'Amanhã' : `Em ${days} dias`}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => navigate('/admin/orders')}
              >
                Ver Todos os Pedidos
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Estoque Baixo + Produtos Indisponíveis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Estoque Baixo */}
          <Card className="bg-gradient-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <span>Estoque Baixo</span>
              </CardTitle>
              <CardDescription>Produtos disponíveis com 2 ou menos unidades</CardDescription>
            </CardHeader>
            <CardContent>
              {lowStockProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Todos os produtos têm estoque adequado.
                </p>
              ) : (
                <div className="space-y-3">
                  {lowStockProducts.slice(0, 5).map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-3 bg-surface rounded-lg"
                    >
                      <div className="flex-1 min-w-0 mr-3">
                        <p className="font-medium text-foreground truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(product.price)}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          product.quantity_available === 0
                            ? 'border-red-500 text-red-600'
                            : 'border-yellow-500 text-yellow-600'
                        }
                      >
                        <Package className="w-3 h-3 mr-1" />
                        {product.quantity_available === 0
                          ? 'Sem estoque'
                          : `${product.quantity_available} un.`}
                      </Badge>
                    </div>
                  ))}
                  {lowStockProducts.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{lowStockProducts.length - 5} produto(s) com estoque baixo
                    </p>
                  )}
                </div>
              )}
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => navigate('/admin/products')}
              >
                Ver Produtos
              </Button>
            </CardContent>
          </Card>

          {/* Produtos Indisponíveis */}
          <Card className="bg-gradient-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <XCircle className="w-5 h-5 text-red-500" />
                <span>Produtos Indisponíveis</span>
              </CardTitle>
              <CardDescription>Produtos desativados do catálogo</CardDescription>
            </CardHeader>
            <CardContent>
              {unavailableProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Nenhum produto desativado.
                </p>
              ) : (
                <div className="space-y-3">
                  {unavailableProducts.slice(0, 5).map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-3 bg-surface rounded-lg"
                    >
                      <div className="flex-1 min-w-0 mr-3">
                        <p className="font-medium text-foreground truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {product.quantity_available} un. disponíveis
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        <XCircle className="w-3 h-3 mr-1" />
                        Inativo
                      </Badge>
                    </div>
                  ))}
                  {unavailableProducts.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{unavailableProducts.length - 5} produto(s) desativado(s)
                    </p>
                  )}
                </div>
              )}
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => navigate('/admin/products')}
              >
                Ver Produtos
              </Button>
            </CardContent>
          </Card>
        </div>

      </div>
    </AppLayout>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: string;
  badge: string;
  badgeType: 'increase' | 'warning';
  icon: React.ElementType;
  description: string;
}

function StatCard({ title, value, badge, badgeType, icon: Icon, description }: StatCardProps) {
  return (
    <Card className="bg-gradient-card border-border/50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <div className="flex items-center space-x-2 mt-1">
          <Badge
            variant={badgeType === 'increase' ? 'default' : 'secondary'}
            className={
              badgeType === 'increase'
                ? 'bg-success text-success-foreground'
                : 'bg-warning text-warning-foreground'
            }
          >
            {badgeType === 'increase' ? (
              <TrendingUp className="w-3 h-3 mr-1" />
            ) : (
              <AlertCircle className="w-3 h-3 mr-1" />
            )}
            {badge}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}
