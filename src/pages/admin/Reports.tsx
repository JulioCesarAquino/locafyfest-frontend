import { useState } from 'react';
import { AppLayout } from '@/components/Layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, CalendarIcon, Download, Filter, TrendingUp, TrendingDown, Users, Package, DollarSign, Clock } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Mock data
const revenueData = [
  { month: 'Jan', revenue: 15000, orders: 45 },
  { month: 'Fev', revenue: 18000, orders: 52 },
  { month: 'Mar', revenue: 22000, orders: 68 },
  { month: 'Abr', revenue: 19000, orders: 58 },
  { month: 'Mai', revenue: 25000, orders: 75 },
  { month: 'Jun', revenue: 28000, orders: 82 },
];

const topProducts = [
  { name: 'Mesa Redonda Elegante', rentals: 45, revenue: 9000 },
  { name: 'Cadeira Tiffany Dourada', rentals: 120, revenue: 7200 },
  { name: 'Toalha Renda Branca', rentals: 85, revenue: 6800 },
  { name: 'Centro de Mesa Cristal', rentals: 32, revenue: 4800 },
  { name: 'Arranjo Floral Premium', rentals: 28, revenue: 4200 },
];

const orderStatusData = [
  { name: 'Confirmados', value: 45, color: '#10b981' },
  { name: 'Pendentes', value: 12, color: '#f59e0b' },
  { name: 'Entregues', value: 38, color: '#3b82f6' },
  { name: 'Cancelados', value: 5, color: '#ef4444' },
];

const topClients = [
  { name: 'Maria Silva', orders: 8, revenue: 12000, lastOrder: '2024-01-15' },
  { name: 'João Santos', orders: 6, revenue: 9500, lastOrder: '2024-01-12' },
  { name: 'Ana Costa', orders: 5, revenue: 8200, lastOrder: '2024-01-10' },
  { name: 'Carlos Lima', orders: 4, revenue: 6800, lastOrder: '2024-01-08' },
  { name: 'Lucia Oliveira', orders: 3, revenue: 5500, lastOrder: '2024-01-05' },
];

export default function Reports() {
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [period, setPeriod] = useState('30');

  const summaryCards = [
    {
      title: 'Receita Total',
      value: 'R$ 127.800',
      change: '+12.5%',
      changeType: 'increase' as const,
      icon: DollarSign,
      description: 'Últimos 30 dias'
    },
    {
      title: 'Total de Pedidos',
      value: '340',
      change: '+8.2%',
      changeType: 'increase' as const,
      icon: Package,
      description: 'Últimos 30 dias'
    },
    {
      title: 'Clientes Ativos',
      value: '156',
      change: '+15.3%',
      changeType: 'increase' as const,
      icon: Users,
      description: 'Últimos 30 dias'
    },
    {
      title: 'Taxa de Ocupação',
      value: '87%',
      change: '-2.1%',
      changeType: 'decrease' as const,
      icon: Clock,
      description: 'Média do período'
    }
  ];

  return (
    <AppLayout userType="admin" companyName="Festas & Eventos">
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Relatórios</h1>
            <p className="text-muted-foreground">Análise completa do desempenho do negócio</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[140px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "dd/MM", { locale: ptBR }) : "Data inicial"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[140px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "dd/MM", { locale: ptBR }) : "Data final"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </Button>
              <Button>
                <Filter className="mr-2 h-4 w-4" />
                Aplicar Filtros
              </Button>
            </div>
          </div>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map((card, index) => (
            <Card key={index} className="bg-gradient-card border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground mb-1">
                  {card.value}
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={cn(
                    card.changeType === 'increase' 
                      ? 'bg-success text-success-foreground' 
                      : 'bg-danger text-danger-foreground'
                  )}>
                    {card.changeType === 'increase' ? (
                      <TrendingUp className="mr-1 h-3 w-3" />
                    ) : (
                      <TrendingDown className="mr-1 h-3 w-3" />
                    )}
                    {card.change}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="financial" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
            <TabsTrigger value="financial">Financeiros</TabsTrigger>
            <TabsTrigger value="products">Produtos</TabsTrigger>
            <TabsTrigger value="clients">Clientes</TabsTrigger>
            <TabsTrigger value="operational">Operacionais</TabsTrigger>
          </TabsList>

          {/* Relatórios Financeiros */}
          <TabsContent value="financial" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Evolução da Receita</CardTitle>
                  <CardDescription>Receita mensal dos últimos 6 meses</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value) => [`R$ ${value}`, 'Receita']}
                        labelFormatter={(label) => `Mês: ${label}`}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="hsl(var(--primary)/0.2)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Número de Pedidos</CardTitle>
                  <CardDescription>Quantidade de pedidos por mês</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value) => [value, 'Pedidos']}
                        labelFormatter={(label) => `Mês: ${label}`}
                      />
                      <Bar dataKey="orders" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Produtos Mais Rentáveis</CardTitle>
                <CardDescription>Top 5 produtos por receita gerada</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topProducts.map((product, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground">{product.name}</h4>
                        <p className="text-sm text-muted-foreground">{product.rentals} aluguéis</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-foreground">R$ {product.revenue.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">#{index + 1}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Relatórios de Produtos */}
          <TabsContent value="products" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Taxa de Ocupação por Categoria</CardTitle>
                  <CardDescription>Porcentagem de uso por tipo de produto</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { category: 'Mesas', occupation: 87, available: 45, rented: 39 },
                      { category: 'Cadeiras', occupation: 92, available: 200, rented: 184 },
                      { category: 'Toalhas', occupation: 78, available: 80, rented: 62 },
                      { category: 'Decoração', occupation: 65, available: 60, rented: 39 },
                    ].map((item, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-foreground">{item.category}</span>
                          <span className="text-sm text-muted-foreground">{item.occupation}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ width: `${item.occupation}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{item.rented} em uso</span>
                          <span>{item.available} disponíveis</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Produtos com Baixa Rotatividade</CardTitle>
                  <CardDescription>Produtos que precisam de atenção</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { name: 'Mesa Quadrada Vintage', lastRental: '45 dias', status: 'warning' },
                      { name: 'Cadeira Napoleão Prata', lastRental: '30 dias', status: 'warning' },
                      { name: 'Toalha Xadrez Azul', lastRental: '60 dias', status: 'danger' },
                      { name: 'Lustre Cristal Grande', lastRental: '90 dias', status: 'danger' },
                    ].map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <h4 className="font-medium text-foreground">{item.name}</h4>
                          <p className="text-sm text-muted-foreground">Último aluguel há {item.lastRental}</p>
                        </div>
                        <Badge className={cn(
                          item.status === 'warning' 
                            ? 'bg-warning text-warning-foreground' 
                            : 'bg-danger text-danger-foreground'
                        )}>
                          {item.status === 'warning' ? 'Atenção' : 'Crítico'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Relatórios de Clientes */}
          <TabsContent value="clients" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top Clientes</CardTitle>
                  <CardDescription>Clientes mais ativos por receita</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {topClients.map((client, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium text-foreground">{client.name}</h4>
                          <p className="text-sm text-muted-foreground">{client.orders} pedidos</p>
                          <p className="text-xs text-muted-foreground">Último: {format(new Date(client.lastOrder), "dd/MM/yyyy", { locale: ptBR })}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-foreground">R$ {client.revenue.toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">#{index + 1}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Análise Geográfica</CardTitle>
                  <CardDescription>Distribuição de clientes por região</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { region: 'Centro', clients: 45, percentage: 35 },
                      { region: 'Zona Sul', clients: 38, percentage: 29 },
                      { region: 'Zona Norte', clients: 28, percentage: 22 },
                      { region: 'Zona Oeste', clients: 18, percentage: 14 },
                    ].map((item, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-foreground">{item.region}</span>
                          <div className="text-right">
                            <span className="text-sm font-medium text-foreground">{item.clients} clientes</span>
                            <span className="text-xs text-muted-foreground ml-2">({item.percentage}%)</span>
                          </div>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ width: `${item.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Relatórios Operacionais */}
          <TabsContent value="operational" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Status dos Pedidos</CardTitle>
                  <CardDescription>Distribuição atual dos pedidos</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={orderStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {orderStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performance de Entregas</CardTitle>
                  <CardDescription>Análise do cumprimento de prazos</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { metric: 'Entregas no Prazo', value: '94%', status: 'success' },
                      { metric: 'Entregas Antecipadas', value: '12%', status: 'success' },
                      { metric: 'Entregas Atrasadas', value: '6%', status: 'warning' },
                      { metric: 'Tempo Médio de Entrega', value: '2.3h', status: 'neutral' },
                    ].map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <span className="font-medium text-foreground">{item.metric}</span>
                        <Badge className={cn(
                          item.status === 'success' && 'bg-success text-success-foreground',
                          item.status === 'warning' && 'bg-warning text-warning-foreground',
                          item.status === 'neutral' && 'bg-muted text-muted-foreground'
                        )}>
                          {item.value}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Análise de Cancelamentos</CardTitle>
                <CardDescription>Motivos e tendências de cancelamento</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium text-foreground">Motivos de Cancelamento</h4>
                    {[
                      { reason: 'Mudança de Data', count: 8, percentage: 40 },
                      { reason: 'Problemas Financeiros', count: 6, percentage: 30 },
                      { reason: 'Mudança de Local', count: 4, percentage: 20 },
                      { reason: 'Outros', count: 2, percentage: 10 },
                    ].map((item, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-foreground">{item.reason}</span>
                          <span className="text-sm text-muted-foreground">{item.count} ({item.percentage}%)</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5">
                          <div 
                            className="bg-primary h-1.5 rounded-full" 
                            style={{ width: `${item.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-medium text-foreground">Tendência de Cancelamentos</h4>
                    <div className="space-y-3">
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm font-medium text-foreground">Taxa de Cancelamento</p>
                        <p className="text-2xl font-bold text-foreground">4.2%</p>
                        <p className="text-xs text-muted-foreground">Mês atual</p>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm font-medium text-foreground">Média de Antecedência</p>
                        <p className="text-2xl font-bold text-foreground">8 dias</p>
                        <p className="text-xs text-muted-foreground">Para cancelamento</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}