import { 
  TrendingUp, 
  Package, 
  Users, 
  ShoppingCart, 
  DollarSign,
  Calendar,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { AppLayout } from '@/components/Layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const statsCards = [
  {
    title: 'Receita Total',
    value: 'R$ 45.231',
    change: '+20.1%',
    changeType: 'increase' as const,
    icon: DollarSign,
    description: 'Em relação ao mês passado'
  },
  {
    title: 'Pedidos Ativos',
    value: '23',
    change: '+5',
    changeType: 'increase' as const,
    icon: ShoppingCart,
    description: 'Aguardando confirmação'
  },
  {
    title: 'Clientes Ativos',
    value: '156',
    change: '+12',
    changeType: 'increase' as const,
    icon: Users,
    description: 'Novos este mês'
  },
  {
    title: 'Produtos Disponíveis',
    value: '89',
    change: '3 indisponíveis',
    changeType: 'warning' as const,
    icon: Package,
    description: 'Do total de 92 produtos'
  },
];

const recentOrders = [
  {
    id: '001',
    client: 'Maria Silva',
    items: 'Mesa Redonda + 8 Cadeiras',
    value: 'R$ 350,00',
    date: '2024-01-15',
    status: 'pending'
  },
  {
    id: '002',
    client: 'João Santos',
    items: 'Pula-pula Pequeno',
    value: 'R$ 180,00',
    date: '2024-01-14',
    status: 'confirmed'
  },
  {
    id: '003',
    client: 'Ana Costa',
    items: 'Toalha Azul + Decoração',
    value: 'R$ 220,00',
    date: '2024-01-14',
    status: 'pending'
  },
];

const upcomingEvents = [
  {
    client: 'Carlos Oliveira',
    event: 'Aniversário Infantil',
    date: '2024-01-20',
    items: 3
  },
  {
    client: 'Fernanda Lima',
    event: 'Casamento',
    date: '2024-01-22',
    items: 8
  },
];

export default function Dashboard() {
  return (
    <AppLayout userType="admin" userName="Administrador">
      <div className="space-y-6">

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat) => (
          <Card key={stat.title} className="bg-gradient-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <div className="flex items-center space-x-2 mt-1">
                <Badge 
                  variant={stat.changeType === 'increase' ? 'default' : 'secondary'}
                  className={
                    stat.changeType === 'increase' 
                      ? 'bg-success text-success-foreground' 
                      : stat.changeType === 'warning'
                      ? 'bg-warning text-warning-foreground'
                      : ''
                  }
                >
                  {stat.changeType === 'increase' && <TrendingUp className="w-3 h-3 mr-1" />}
                  {stat.changeType === 'warning' && <AlertCircle className="w-3 h-3 mr-1" />}
                  {stat.change}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ShoppingCart className="w-5 h-5" />
              <span>Pedidos Recentes</span>
            </CardTitle>
            <CardDescription>
              Últimos pedidos aguardando confirmação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 bg-surface rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{order.client}</p>
                    <p className="text-sm text-muted-foreground">{order.items}</p>
                    <p className="text-xs text-muted-foreground">#{order.id} • {order.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">{order.value}</p>
                    <Badge 
                      variant={order.status === 'confirmed' ? 'default' : 'secondary'}
                      className={order.status === 'confirmed' ? 'bg-success text-success-foreground' : ''}
                    >
                      {order.status === 'confirmed' ? (
                        <>
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Confirmado
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Pendente
                        </>
                      )}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4">
              Ver Todos os Pedidos
            </Button>
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Próximos Eventos</span>
            </CardTitle>
            <CardDescription>
              Eventos agendados para os próximos dias
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingEvents.map((event, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-surface rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{event.client}</p>
                    <p className="text-sm text-muted-foreground">{event.event}</p>
                    <p className="text-xs text-muted-foreground">{event.items} itens</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">{event.date}</p>
                    <Badge variant="outline">
                      <Calendar className="w-3 h-3 mr-1" />
                      Agendado
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4">
              Ver Agenda Completa
            </Button>
          </CardContent>
        </Card>
      </div>
      </div>
    </AppLayout>
  );
}