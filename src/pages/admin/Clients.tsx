import { useState } from 'react';
import { AppLayout } from '@/components/Layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Phone, Mail, MapPin, User, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Dados de exemplo para a listagem
const mockClients = [
  {
    id: 1,
    nome: "João Silva Santos",
    telefone: "(11) 99999-8888",
    email: "joao.silva@email.com",
    cpf: "123.456.789-00",
    dataNascimento: "1985-03-15",
    endereco: "Rua das Flores, 123, São Paulo - SP",
    latitude: -23.5505,
    longitude: -46.6333,
    createdAt: "2024-01-15"
  },
  {
    id: 2,
    nome: "Maria Oliveira Costa",
    telefone: "(11) 88888-7777",
    email: "maria.costa@email.com",
    cpf: "987.654.321-00",
    dataNascimento: "1990-07-22",
    endereco: "Av. Paulista, 456, São Paulo - SP",
    latitude: -23.5629,
    longitude: -46.6544,
    createdAt: "2024-01-20"
  }
];

export default function Clients() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState(mockClients);
  
  // Estados do formulário
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    email: '',
    cpf: '',
    dataNascimento: '',
    endereco: '',
    latitude: '',
    longitude: ''
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações básicas
    if (!formData.nome || !formData.telefone) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e telefone são obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    // Verificar CPF duplicado
    if (formData.cpf && clients.some(client => client.cpf === formData.cpf)) {
      toast({
        title: "CPF já cadastrado",
        description: "Este CPF já está registrado no sistema.",
        variant: "destructive"
      });
      return;
    }

    // Simular cadastro
    const newClient = {
      id: clients.length + 1,
      ...formData,
      latitude: formData.latitude ? parseFloat(formData.latitude) : 0,
      longitude: formData.longitude ? parseFloat(formData.longitude) : 0,
      createdAt: new Date().toISOString().split('T')[0]
    };

    setClients(prev => [...prev, newClient]);
    setFormData({
      nome: '',
      telefone: '',
      email: '',
      cpf: '',
      dataNascimento: '',
      endereco: '',
      latitude: '',
      longitude: ''
    });
    setShowForm(false);
    
    toast({
      title: "Cliente cadastrado",
      description: "Cliente foi cadastrado com sucesso!"
    });
  };

  // Filtrar clientes
  const filteredClients = clients.filter(client => {
    const term = searchTerm.toLowerCase();
    return (
      client.nome.toLowerCase().includes(term) ||
      client.telefone.toLowerCase().includes(term) ||
      client.cpf.toLowerCase().includes(term)
    );
  });

  const handleGetLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            latitude: position.coords.latitude.toString(),
            longitude: position.coords.longitude.toString()
          }));
          toast({
            title: "Localização obtida",
            description: "Coordenadas atualizadas com sucesso!"
          });
        },
        (error) => {
          toast({
            title: "Erro de localização",
            description: "Não foi possível obter a localização.",
            variant: "destructive"
          });
        }
      );
    } else {
      toast({
        title: "Geolocalização não suportada",
        description: "Seu navegador não suporta geolocalização.",
        variant: "destructive"
      });
    }
  };

  return (
    <AppLayout userType="admin" userName="Admin" companyName="Festa & Cia">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Clientes</h1>
            <p className="text-muted-foreground">Gerencie os clientes da empresa</p>
          </div>
          <Button 
            onClick={() => setShowForm(!showForm)}
            className="w-fit"
          >
            <Plus className="mr-2 h-4 w-4" />
            {showForm ? 'Cancelar' : 'Novo Cliente'}
          </Button>
        </div>

        {/* Formulário de Cadastro */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>Cadastrar Novo Cliente</CardTitle>
              <CardDescription>
                Preencha os dados do cliente. Campos marcados com * são obrigatórios.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome *</Label>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => handleInputChange('nome', e.target.value)}
                      placeholder="Nome completo"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone *</Label>
                    <Input
                      id="telefone"
                      value={formData.telefone}
                      onChange={(e) => handleInputChange('telefone', e.target.value)}
                      placeholder="(11) 99999-9999"
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="cliente@email.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF</Label>
                    <Input
                      id="cpf"
                      value={formData.cpf}
                      onChange={(e) => handleInputChange('cpf', e.target.value)}
                      placeholder="000.000.000-00"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="dataNascimento">Data de Nascimento</Label>
                    <Input
                      id="dataNascimento"
                      type="date"
                      value={formData.dataNascimento}
                      onChange={(e) => handleInputChange('dataNascimento', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Coordenadas Geográficas</Label>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleGetLocation}
                      className="w-full"
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      Obter Localização Atual
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endereco">Endereço</Label>
                  <Textarea
                    id="endereco"
                    value={formData.endereco}
                    onChange={(e) => handleInputChange('endereco', e.target.value)}
                    placeholder="Rua, número, bairro, cidade - UF"
                    rows={3}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="latitude">Latitude</Label>
                    <Input
                      id="latitude"
                      value={formData.latitude}
                      onChange={(e) => handleInputChange('latitude', e.target.value)}
                      placeholder="-23.5505"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="longitude">Longitude</Label>
                    <Input
                      id="longitude"
                      value={formData.longitude}
                      onChange={(e) => handleInputChange('longitude', e.target.value)}
                      placeholder="-46.6333"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="submit">
                    Cadastrar Cliente
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowForm(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Filtros e Busca */}
        <Card>
          <CardHeader>
            <CardTitle>Buscar Clientes</CardTitle>
            <CardDescription>
              Filtre por nome, telefone ou CPF
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, telefone ou CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Lista de Clientes */}
        <Card>
          <CardHeader>
            <CardTitle>Clientes Cadastrados</CardTitle>
            <CardDescription>
              {filteredClients.length} cliente(s) encontrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredClients.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>Nenhum cliente encontrado.</p>
                </div>
              ) : (
                filteredClients.map((client) => (
                  <div 
                    key={client.id}
                    className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-lg">{client.nome}</h3>
                        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {client.telefone}
                          </div>
                          {client.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {client.email}
                            </div>
                          )}
                          {client.cpf && (
                            <Badge variant="secondary">{client.cpf}</Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">
                          Cadastrado em {new Date(client.createdAt).toLocaleDateString('pt-BR')}
                        </div>
                        {client.dataNascimento && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(client.dataNascimento).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {client.endereco && (
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>{client.endereco}</span>
                      </div>
                    )}
                    
                    {client.latitude && client.longitude && (
                      <div className="text-xs text-muted-foreground">
                        Coordenadas: {client.latitude}, {client.longitude}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}