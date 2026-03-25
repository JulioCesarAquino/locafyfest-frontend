import { useState, useEffect } from 'react';
import { format, parseISO, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AppLayout } from '@/components/Layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarIcon, DollarSign, Package, Users, TrendingUp, ArrowUpDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { cn, formatCurrency } from '@/lib/utils';

import { getSalesReport, SalesReport, DailySale } from './services';
import { getOrders, OrderAPI } from '@/modules/admin/orders/services';
import { getProducts, ProductAPI } from '@/modules/admin/products/services';
import { getClients, Client } from '@/modules/admin/clients/services';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groupByMonth(dailySales: DailySale[]): { month: string; revenue: number; orders: number }[] {
  const map = new Map<string, { revenue: number; orders: number }>();

  for (const sale of dailySales) {
    const key = sale.date.substring(0, 7); // YYYY-MM
    const existing = map.get(key) ?? { revenue: 0, orders: 0 };
    map.set(key, {
      revenue: existing.revenue + Number(sale.revenue),
      orders: existing.orders + sale.orders,
    });
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({
      month: format(parseISO(`${key}-01`), 'MMM/yy', { locale: ptBR }),
      revenue: value.revenue,
      orders: value.orders,
    }));
}

function getDateRange(period: string): { from: Date; to: Date } {
  const to = new Date();
  const days = parseInt(period, 10);
  const from = subDays(to, days - 1);
  return { from, to };
}

// ─── Status maps ──────────────────────────────────────────────────────────────

const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  confirmed: '#10b981',
  delivered: '#3b82f6',
  returned: '#8b5cf6',
  cancelled: '#ef4444',
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  delivered: 'Entregue',
  returned: 'Concluído',
  cancelled: 'Cancelado',
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Aguardando',
  paid: 'Pago',
  failed: 'Falhou',
};

const CLIENT_SOURCE_LABELS: Record<string, string> = {
  app: 'Aplicativo',
  manual: 'Manual',
  pending_link: 'Pendente Vinculação',
};

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

// ─── Skeleton helpers ─────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-24 mb-2" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  );
}

function ChartSkeleton({ height = 300 }: { height?: number }) {
  return <Skeleton className="w-full rounded-lg" style={{ height }} />;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Reports() {
  const [period, setPeriod] = useState('30');
  const [customFrom, setCustomFrom] = useState<Date | undefined>(undefined);
  const [customTo, setCustomTo] = useState<Date | undefined>(undefined);
  const [usingCustom, setUsingCustom] = useState(false);

  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [orders, setOrders] = useState<OrderAPI[]>([]);
  const [products, setProducts] = useState<ProductAPI[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  const [loadingReport, setLoadingReport] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingClients, setLoadingClients] = useState(true);

  const [stockSort, setStockSort] = useState<'name' | 'quantity'>('quantity');
  const [stockSortDir, setStockSortDir] = useState<'asc' | 'desc'>('asc');

  // Compute the effective date range
  function getEffectiveDates(): { startDate: string; endDate: string } {
    if (usingCustom && customFrom && customTo) {
      return {
        startDate: format(customFrom, 'yyyy-MM-dd'),
        endDate: format(customTo, 'yyyy-MM-dd'),
      };
    }
    const { from, to } = getDateRange(period);
    return {
      startDate: format(from, 'yyyy-MM-dd'),
      endDate: format(to, 'yyyy-MM-dd'),
    };
  }

  // Fetch sales report whenever period/custom dates change
  useEffect(() => {
    const { startDate, endDate } = getEffectiveDates();
    setLoadingReport(true);
    setSalesReport(null);

    getSalesReport(startDate, endDate)
      .then(setSalesReport)
      .catch((err) => {
        if (err?.response?.status !== 403) {
          console.error('Erro ao carregar relatório de vendas:', err);
        }
      })
      .finally(() => setLoadingReport(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, usingCustom, customFrom, customTo]);

  // Fetch orders, products, clients once on mount
  useEffect(() => {
    getOrders({ per_page: 500 })
      .then(setOrders)
      .catch((err) => {
        if (err?.response?.status !== 403) {
          console.error('Erro ao carregar pedidos:', err);
        }
      })
      .finally(() => setLoadingOrders(false));

    getProducts({ include_unavailable: true, per_page: 200 })
      .then((data) => {
        // getProducts returns raw response.data; extract array
        // Handles: [...], { data: [...] }, { data: { data: [...] } }
        let list: ProductAPI[] = [];
        const d = (data as Record<string, unknown>)?.data;
        if (Array.isArray(data)) {
          list = data as ProductAPI[];
        } else if (Array.isArray(d)) {
          list = d as ProductAPI[];
        } else if (d && Array.isArray((d as Record<string, unknown>).data)) {
          list = (d as Record<string, unknown>).data as ProductAPI[];
        }
        setProducts(list);
      })
      .catch((err) => {
        if (err?.response?.status !== 403) {
          console.error('Erro ao carregar produtos:', err);
        }
      })
      .finally(() => setLoadingProducts(false));

    getClients()
      .then(setClients)
      .catch((err) => {
        if (err?.response?.status !== 403) {
          console.error('Erro ao carregar clientes:', err);
        }
      })
      .finally(() => setLoadingClients(false));
  }, []);

  // ─── Derived data ────────────────────────────────────────────────────────────

  const monthlyData = salesReport ? groupByMonth(salesReport.daily_sales) : [];
  const topProducts = salesReport ? salesReport.top_products.slice(0, 5) : [];
  const topClients = salesReport ? salesReport.top_clients : [];
  const activeClientsCount = clients.filter((c) => c.is_active).length;

  // Products tab
  const totalProducts = products.length;
  const availableProducts = products.filter((p) => p.is_available).length;
  const unavailableProducts = totalProducts - availableProducts;
  // lowStock usa o estoque real (após deduções) — calculado depois de rentedQtyByProduct

  // Mapa rápido de produto por id (necessário para expandir combos)
  const productMap = products.reduce<Record<number, ProductAPI>>((acc, p) => {
    acc[p.id] = p;
    return acc;
  }, {});

  // Regra de negócio:
  // confirmed ou delivered → itens estão fora do estoque
  // returned / cancelled / pending → itens estão disponíveis
  const rentedQtyByProduct = orders
    .filter((o) => o.status === 'confirmed' || o.status === 'delivered')
    .flatMap((o) => o.items ?? [])
    .reduce<Record<number, number>>((acc, item) => {
      const product = productMap[item.product_id];
      // Conta o item no produto referenciado (incluindo o combo em si)
      acc[item.product_id] = (acc[item.product_id] ?? 0) + item.quantity;
      // Se for combo, debita também em cada componente
      if (product?.is_combo && product.components?.length > 0) {
        for (const comp of product.components) {
          acc[comp.component_product_id] = (acc[comp.component_product_id] ?? 0) + comp.quantity * item.quantity;
        }
      }
      return acc;
    }, {});

  // Estoque real = quantity_available − em_aluguel (confirmado/entregue)
  const getRealAvailable = (p: ProductAPI) =>
    p.quantity_available - (rentedQtyByProduct[p.id] ?? 0);

  const lowStockProducts = [...products]
    .filter((p) => getRealAvailable(p) <= 5)
    .sort((a, b) => getRealAvailable(a) - getRealAvailable(b));

  const sortedStockProducts = [...products].sort((a, b) => {
    const dir = stockSortDir === 'asc' ? 1 : -1;
    if (stockSort === 'name') return a.name.localeCompare(b.name) * dir;
    return (getRealAvailable(a) - getRealAvailable(b)) * dir;
  });

  function toggleSort(col: 'name' | 'quantity') {
    if (stockSort === col) setStockSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setStockSort(col); setStockSortDir('asc'); }
  }
  const productAvailabilityPie = [
    { name: 'Disponível', value: availableProducts },
    { name: 'Indisponível', value: unavailableProducts },
  ].filter((e) => e.value > 0);

  // Operational tab
  const orderStatusGroups = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});
  const orderStatusPie = Object.entries(orderStatusGroups).map(([status, count]) => ({
    name: ORDER_STATUS_LABELS[status] ?? status,
    value: count,
    color: ORDER_STATUS_COLORS[status] ?? '#6b7280',
  }));

  const paymentStatusGroups = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.payment_status] = (acc[o.payment_status] ?? 0) + 1;
    return acc;
  }, {});
  const paymentStatusData = Object.entries(paymentStatusGroups).map(([status, count]) => ({
    name: PAYMENT_STATUS_LABELS[status] ?? status,
    value: count,
  }));

  // Clients tab
  const sourceGroups = clients.reduce<Record<string, number>>((acc, c) => {
    acc[c.source] = (acc[c.source] ?? 0) + 1;
    return acc;
  }, {});
  const sourceData = Object.entries(sourceGroups).map(([src, count]) => ({
    name: CLIENT_SOURCE_LABELS[src] ?? src,
    value: count,
  }));
  const pfCount = clients.filter((c) => c.person_type === 'pf').length;
  const pjCount = clients.filter((c) => c.person_type === 'pj').length;

  // ─── Period selector handlers ────────────────────────────────────────────────

  function selectPreset(p: string) {
    setPeriod(p);
    setUsingCustom(false);
    setCustomFrom(undefined);
    setCustomTo(undefined);
  }

  function applyCustomDates() {
    if (customFrom && customTo) {
      setUsingCustom(true);
    }
  }

  const presets = [
    { label: '7 dias', value: '7' },
    { label: '30 dias', value: '30' },
    { label: '3 meses', value: '90' },
    { label: '6 meses', value: '180' },
  ];

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <AppLayout userType="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Relatórios</h1>
            <p className="text-muted-foreground">Análise completa do desempenho do negócio</p>
          </div>

          {/* Period selector */}
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Preset buttons */}
            <div className="flex gap-1">
              {presets.map((p) => (
                <Button
                  key={p.value}
                  size="sm"
                  variant={!usingCustom && period === p.value ? 'default' : 'outline'}
                  onClick={() => selectPreset(p.value)}
                >
                  {p.label}
                </Button>
              ))}
            </div>

            {/* Custom date pickers */}
            <div className="flex gap-1 items-center">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-[130px] justify-start font-normal">
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {customFrom ? format(customFrom, 'dd/MM/yyyy') : 'Data inicial'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={customFrom}
                    onSelect={setCustomFrom}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-[130px] justify-start font-normal">
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {customTo ? format(customTo, 'dd/MM/yyyy') : 'Data final'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={customTo}
                    onSelect={setCustomTo}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              <Button
                size="sm"
                variant={usingCustom ? 'default' : 'outline'}
                onClick={applyCustomDates}
                disabled={!customFrom || !customTo}
              >
                Aplicar
              </Button>
            </div>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {loadingReport ? (
            <>
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </>
          ) : (
            <>
              <Card className="bg-gradient-card border-border/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Receita Total</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {salesReport ? formatCurrency(salesReport.summary.total_revenue) : '—'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">No período selecionado</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-card border-border/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total de Pedidos</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {salesReport ? salesReport.summary.total_orders : '—'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">No período selecionado</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-card border-border/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Ticket Médio</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {salesReport ? formatCurrency(salesReport.summary.average_order_value) : '—'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Por pedido no período</p>
                </CardContent>
              </Card>
            </>
          )}

          {loadingClients ? (
            <CardSkeleton />
          ) : (
            <Card className="bg-gradient-card border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Clientes Ativos</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{activeClientsCount}</div>
                <p className="text-xs text-muted-foreground mt-1">Total de clientes ativos</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="financial" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
            <TabsTrigger value="financial">Financeiros</TabsTrigger>
            <TabsTrigger value="products">Produtos</TabsTrigger>
            <TabsTrigger value="clients">Clientes</TabsTrigger>
            <TabsTrigger value="operational">Operacionais</TabsTrigger>
          </TabsList>

          {/* ── Financeiros ─────────────────────────────────────────────────── */}
          <TabsContent value="financial" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Evolução da Receita</CardTitle>
                  <CardDescription>Receita agrupada por mês no período</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingReport ? (
                    <ChartSkeleton />
                  ) : monthlyData.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">Nenhum dado disponível</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(value) => [formatCurrency(value as number), 'Receita']} />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke="hsl(var(--primary))"
                          fill="hsl(var(--primary)/0.2)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Número de Pedidos</CardTitle>
                  <CardDescription>Quantidade de pedidos agrupada por mês</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingReport ? (
                    <ChartSkeleton />
                  ) : monthlyData.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">Nenhum dado disponível</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value) => [value, 'Pedidos']} />
                        <Bar dataKey="orders" fill="hsl(var(--primary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Produtos Mais Rentáveis</CardTitle>
                <CardDescription>Top 5 produtos por receita gerada no período</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingReport ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-14 w-full rounded-lg" />
                    ))}
                  </div>
                ) : topProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Nenhum dado disponível</p>
                ) : (
                  <div className="space-y-4">
                    {topProducts.map((product, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-foreground truncate">{product.name}</h4>
                          <p className="text-sm text-muted-foreground">{product.total_quantity} aluguéis</p>
                        </div>
                        <div className="text-right ml-4">
                          <p className="font-semibold text-foreground">{formatCurrency(product.total_revenue)}</p>
                          <p className="text-sm text-muted-foreground">#{index + 1}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Produtos ────────────────────────────────────────────────────── */}
          <TabsContent value="products" className="space-y-6">
            {/* Stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {loadingProducts ? (
                <>
                  <CardSkeleton />
                  <CardSkeleton />
                  <CardSkeleton />
                </>
              ) : (
                <>
                  <Card className="bg-gradient-card border-border/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Total de Produtos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-foreground">{totalProducts}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-card border-border/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Disponíveis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-foreground">{availableProducts}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-card border-border/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Indisponíveis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-foreground">{unavailableProducts}</div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Low stock list */}
              <Card>
                <CardHeader>
                  <CardTitle>Estoque Baixo</CardTitle>
                  <CardDescription>Produtos com 5 ou menos unidades disponíveis</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingProducts ? (
                    <div className="space-y-3">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full rounded-lg" />
                      ))}
                    </div>
                  ) : lowStockProducts.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">Nenhum produto com estoque baixo</p>
                  ) : (
                    <div className="space-y-3">
                      {lowStockProducts.map((product) => (
                        <div key={product.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-foreground truncate">{product.name}</h4>
                          </div>
                          <Badge
                            className={cn(
                              'ml-3',
                              product.quantity_available === 0
                                ? 'bg-destructive text-destructive-foreground'
                                : product.quantity_available <= 2
                                ? 'bg-orange-500 text-white'
                                : 'bg-yellow-500 text-white',
                            )}
                          >
                            {product.quantity_available} un.
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Availability pie */}
              <Card>
                <CardHeader>
                  <CardTitle>Disponibilidade</CardTitle>
                  <CardDescription>Distribuição entre disponíveis e indisponíveis</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingProducts ? (
                    <ChartSkeleton />
                  ) : productAvailabilityPie.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">Nenhum dado disponível</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={productAvailabilityPie}
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {productAvailabilityPie.map((_, index) => (
                            <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Full stock table */}
            <Card>
              <CardHeader>
                <CardTitle>Estoque por Produto</CardTitle>
                <CardDescription>Disponibilidade de todos os produtos</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingProducts ? (
                  <div className="space-y-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full rounded" />
                    ))}
                  </div>
                ) : products.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Nenhum produto encontrado</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                            <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort('name')}>
                              Produto <ArrowUpDown className="h-3 w-3" />
                            </button>
                          </th>
                          <th className="text-center py-2 px-3 font-medium text-muted-foreground">Status</th>
                          <th className="text-right py-2 px-3 font-medium text-muted-foreground">No estoque</th>
                          <th className="text-right py-2 px-3 font-medium text-muted-foreground">Em aluguel</th>
                          <th className="text-right py-2 px-3 font-medium text-muted-foreground">
                            <button className="flex items-center gap-1 hover:text-foreground ml-auto" onClick={() => toggleSort('quantity')}>
                              Real disponível <ArrowUpDown className="h-3 w-3" />
                            </button>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedStockProducts.map((product) => {
                          const rented = rentedQtyByProduct[product.id] ?? 0;
                          const realAvailable = getRealAvailable(product);
                          return (
                            <tr key={product.id} className="border-b border-border/50 hover:bg-muted/30">
                              <td className="py-2 px-3 font-medium text-foreground">{product.name}</td>
                              <td className="py-2 px-3 text-center">
                                <Badge className={cn(product.is_available ? 'bg-green-500 text-white' : 'bg-destructive text-destructive-foreground')}>
                                  {product.is_available ? 'Disponível' : 'Indisponível'}
                                </Badge>
                              </td>
                              <td className="py-2 px-3 text-right text-muted-foreground">
                                {product.quantity_available} un.
                              </td>
                              <td className="py-2 px-3 text-right">
                                {rented > 0 ? (
                                  <span className="text-muted-foreground font-medium">{rented} un.</span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-right">
                                <span className={cn(
                                  'font-semibold',
                                  realAvailable <= 0 ? 'text-destructive' :
                                  realAvailable <= 2 ? 'text-orange-500' :
                                  realAvailable <= 5 ? 'text-yellow-500' :
                                  'text-foreground'
                                )}>
                                  {realAvailable} un.
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Clientes ────────────────────────────────────────────────────── */}
          <TabsContent value="clients" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top clients */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Clientes</CardTitle>
                  <CardDescription>Clientes mais ativos por receita no período</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingReport ? (
                    <div className="space-y-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full rounded-lg" />
                      ))}
                    </div>
                  ) : topClients.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">Nenhum dado disponível</p>
                  ) : (
                    <div className="space-y-4">
                      {topClients.map((client, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-foreground truncate">{client.name}</h4>
                            <p className="text-sm text-muted-foreground truncate">{client.email}</p>
                            <p className="text-xs text-muted-foreground">{client.total_orders} pedidos</p>
                          </div>
                          <div className="text-right ml-4">
                            <p className="font-semibold text-foreground">{formatCurrency(client.total_spent)}</p>
                            <p className="text-sm text-muted-foreground">#{index + 1}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Source distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Origem dos Clientes</CardTitle>
                  <CardDescription>Distribuição por canal de cadastro</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingClients ? (
                    <ChartSkeleton />
                  ) : sourceData.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">Nenhum dado disponível</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={sourceData}
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {sourceData.map((_, index) => (
                            <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* PF vs PJ */}
            {!loadingClients && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-gradient-card border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Pessoa Física (PF)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">{pfCount}</div>
                    <p className="text-xs text-muted-foreground mt-1">clientes cadastrados</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-card border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Pessoa Jurídica (PJ)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">{pjCount}</div>
                    <p className="text-xs text-muted-foreground mt-1">clientes cadastrados</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* ── Operacionais ────────────────────────────────────────────────── */}
          <TabsContent value="operational" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Order status pie */}
              <Card>
                <CardHeader>
                  <CardTitle>Status dos Pedidos</CardTitle>
                  <CardDescription>Distribuição de todos os pedidos por status</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingOrders ? (
                    <ChartSkeleton />
                  ) : orderStatusPie.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">Nenhum dado disponível</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={orderStatusPie}
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          dataKey="value"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {orderStatusPie.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Payment status bar */}
              <Card>
                <CardHeader>
                  <CardTitle>Status de Pagamento</CardTitle>
                  <CardDescription>Distribuição dos pedidos por situação de pagamento</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingOrders ? (
                    <ChartSkeleton />
                  ) : paymentStatusData.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">Nenhum dado disponível</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={paymentStatusData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={90} />
                        <Tooltip formatter={(value) => [value, 'Pedidos']} />
                        <Bar dataKey="value" fill="hsl(var(--primary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
