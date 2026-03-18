import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/Layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPlus, Edit, Trash2, Search, Filter, Download, Shield, User, Mail, Calendar, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'react-router-dom';

interface Admin {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  status: 'active' | 'inactive';
  lastLogin: string;
  createdAt: string;
  permissions: string[];
}

interface AdminFormData {
  name: string;
  email: string;
  role: string;
  department: string;
  permissions: string[];
  notes: string;
}

const mockAdmins: Admin[] = [
  {
    id: '1',
    name: 'João Silva',
    email: 'joao@empresa.com',
    role: 'Super Admin',
    department: 'TI',
    status: 'active',
    lastLogin: '2024-01-15 14:30',
    createdAt: '2023-06-15',
    permissions: ['dashboard', 'products', 'clients', 'orders', 'reports', 'settings', 'admins']
  },
  {
    id: '2',
    name: 'Maria Santos',
    email: 'maria@empresa.com',
    role: 'Admin',
    department: 'Vendas',
    status: 'active',
    lastLogin: '2024-01-15 16:45',
    createdAt: '2023-08-20',
    permissions: ['dashboard', 'products', 'clients', 'orders', 'reports']
  },
  {
    id: '3',
    name: 'Pedro Costa',
    email: 'pedro@empresa.com',
    role: 'Moderador',
    department: 'Operações',
    status: 'inactive',
    lastLogin: '2024-01-10 09:15',
    createdAt: '2023-09-10',
    permissions: ['dashboard', 'orders', 'clients']
  },
  {
    id: '4',
    name: 'Ana Oliveira',
    email: 'ana@empresa.com',
    role: 'Operador',
    department: 'Atendimento',
    status: 'active',
    lastLogin: '2024-01-15 11:20',
    createdAt: '2023-11-05',
    permissions: ['dashboard', 'clients']
  }
];

const roles = ['Super Admin', 'Admin', 'Moderador', 'Operador'];
const departments = ['TI', 'Vendas', 'Operações', 'Atendimento', 'Financeiro', 'Marketing'];
const availablePermissions = [
  { id: 'dashboard', label: 'Dashboard', description: 'Visualizar métricas e relatórios gerais' },
  { id: 'products', label: 'Produtos', description: 'Gerenciar produtos e catálogo' },
  { id: 'clients', label: 'Clientes', description: 'Gerenciar dados dos clientes' },
  { id: 'orders', label: 'Pedidos', description: 'Processar e gerenciar pedidos' },
  { id: 'reports', label: 'Relatórios', description: 'Acessar e exportar relatórios' },
  { id: 'settings', label: 'Configurações', description: 'Modificar configurações do sistema' },
  { id: 'admins', label: 'Administradores', description: 'Gerenciar outros administradores' }
];

export default function Admins() {
  const [admins, setAdmins] = useState<Admin[]>(mockAdmins);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [formData, setFormData] = useState<AdminFormData>({
    name: '',
    email: '',
    role: '',
    department: '',
    permissions: [],
    notes: ''
  });
  const { toast } = useToast();
  const location = useLocation();

  // Verificar se deve abrir o dialog de edição automaticamente
  useEffect(() => {
    const { editAdminId } = location.state || {};
    if (editAdminId) {
      const adminToEdit = admins.find(admin => admin.id === editAdminId);
      if (adminToEdit) {
        openEditDialog(adminToEdit);
      }
      // Limpar o state para evitar reabrir o dialog
      window.history.replaceState({}, document.title);
    }
  }, [location.state, admins]);

  const filteredAdmins = admins.filter(admin => {
    const matchesSearch = admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         admin.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || admin.status === statusFilter;
    const matchesRole = roleFilter === 'all' || admin.role === roleFilter;
    return matchesSearch && matchesStatus && matchesRole;
  });

  const handleCreateAdmin = () => {
    const newAdmin: Admin = {
      id: Date.now().toString(),
      name: formData.name,
      email: formData.email,
      role: formData.role,
      department: formData.department,
      status: 'active',
      lastLogin: 'Nunca',
      createdAt: new Date().toISOString().split('T')[0],
      permissions: formData.permissions
    };
    
    setAdmins([...admins, newAdmin]);
    setIsCreateDialogOpen(false);
    resetForm();
    toast({
      title: "Administrador criado",
      description: `${newAdmin.name} foi adicionado com sucesso.`,
    });
  };

  const handleEditAdmin = () => {
    if (!editingAdmin) return;
    
    const updatedAdmins = admins.map(admin => 
      admin.id === editingAdmin.id 
        ? { ...admin, ...formData }
        : admin
    );
    
    setAdmins(updatedAdmins);
    setIsEditDialogOpen(false);
    setEditingAdmin(null);
    resetForm();
    toast({
      title: "Administrador atualizado",
      description: `Os dados foram atualizados com sucesso.`,
    });
  };

  const handleDeleteAdmin = (adminId: string) => {
    setAdmins(admins.filter(admin => admin.id !== adminId));
    toast({
      title: "Administrador removido",
      description: "O administrador foi removido do sistema.",
    });
  };

  const handleToggleStatus = (adminId: string) => {
    const updatedAdmins = admins.map(admin => 
      admin.id === adminId 
        ? { ...admin, status: admin.status === 'active' ? 'inactive' : 'active' as 'active' | 'inactive' }
        : admin
    );
    setAdmins(updatedAdmins);
    toast({
      title: "Status atualizado",
      description: "O status do administrador foi alterado.",
    });
  };

  const openEditDialog = (admin: Admin) => {
    setEditingAdmin(admin);
    setFormData({
      name: admin.name,
      email: admin.email,
      role: admin.role,
      department: admin.department,
      permissions: admin.permissions,
      notes: ''
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      role: '',
      department: '',
      permissions: [],
      notes: ''
    });
  };

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        permissions: [...prev.permissions, permissionId]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        permissions: prev.permissions.filter(p => p !== permissionId)
      }));
    }
  };

  const exportData = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Nome,Email,Cargo,Departamento,Status,Último Login,Criado em\n"
      + filteredAdmins.map(admin => 
          `${admin.name},${admin.email},${admin.role},${admin.department},${admin.status},${admin.lastLogin},${admin.createdAt}`
        ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "administradores.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Dados exportados",
      description: "Os dados foram exportados com sucesso.",
    });
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'Super Admin': return 'destructive';
      case 'Admin': return 'default';
      case 'Moderador': return 'secondary';
      case 'Operador': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <AppLayout userType="admin" companyName="Sistema de Gestão">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Administradores</h1>
            <p className="text-muted-foreground">Gerencie usuários e permissões do sistema</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={exportData} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Novo Administrador
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Adicionar Novo Administrador</DialogTitle>
                </DialogHeader>
                
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="basic">Dados Básicos</TabsTrigger>
                    <TabsTrigger value="permissions">Permissões</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="basic" className="space-y-4 mt-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nome Completo</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Digite o nome completo"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="email@empresa.com"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="role">Cargo</Label>
                        <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o cargo" />
                          </SelectTrigger>
                          <SelectContent>
                            {roles.map(role => (
                              <SelectItem key={role} value={role}>{role}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="department">Departamento</Label>
                        <Select value={formData.department} onValueChange={(value) => setFormData(prev => ({ ...prev, department: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o departamento" />
                          </SelectTrigger>
                          <SelectContent>
                            {departments.map(dept => (
                              <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="notes">Observações</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Observações adicionais (opcional)"
                        rows={3}
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="permissions" className="space-y-4 mt-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-semibold">Permissões do Sistema</h3>
                      </div>
                      
                      <div className="grid gap-4">
                        {availablePermissions.map(permission => (
                          <div key={permission.id} className="flex items-start space-x-3 p-3 rounded-lg border">
                            <Checkbox
                              id={permission.id}
                              checked={formData.permissions.includes(permission.id)}
                              onCheckedChange={(checked) => handlePermissionChange(permission.id, checked as boolean)}
                            />
                            <div className="space-y-1">
                              <Label
                                htmlFor={permission.id}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                {permission.label}
                              </Label>
                              <p className="text-xs text-muted-foreground">
                                {permission.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
                
                <div className="flex justify-end gap-2 mt-6">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateAdmin}>
                    Criar Administrador
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Admins</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{admins.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ativos</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {admins.filter(admin => admin.status === 'active').length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inativos</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {admins.filter(admin => admin.status === 'inactive').length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Super Admins</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {admins.filter(admin => admin.role === 'Super Admin').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Buscar por nome ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="inactive">Inativos</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Cargo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {roles.map(role => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Administrators Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Administrador</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Último Login</TableHead>
                    <TableHead>Permissões</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAdmins.map((admin) => (
                    <TableRow key={admin.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">{admin.name}</div>
                            <div className="text-sm text-muted-foreground">{admin.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(admin.role)}>
                          {admin.role}
                        </Badge>
                      </TableCell>
                      <TableCell>{admin.department}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={admin.status === 'active'}
                            onCheckedChange={() => handleToggleStatus(admin.id)}
                          />
                          <Badge variant={admin.status === 'active' ? 'default' : 'secondary'}>
                            {admin.status === 'active' ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {admin.lastLogin}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {admin.permissions.length} permissões
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(admin)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir o administrador <strong>{admin.name}</strong>? 
                                  Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteAdmin(admin.id)}>
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {filteredAdmins.length === 0 && (
              <div className="text-center py-8">
                <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold">Nenhum administrador encontrado</h3>
                <p className="text-muted-foreground">Tente ajustar os filtros ou adicione um novo administrador.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Administrador</DialogTitle>
            </DialogHeader>
            
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">Dados Básicos</TabsTrigger>
                <TabsTrigger value="permissions">Permissões</TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic" className="space-y-4 mt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Nome Completo</Label>
                    <Input
                      id="edit-name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Digite o nome completo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-email">Email</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="email@empresa.com"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-role">Cargo</Label>
                    <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o cargo" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map(role => (
                          <SelectItem key={role} value={role}>{role}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-department">Departamento</Label>
                    <Select value={formData.department} onValueChange={(value) => setFormData(prev => ({ ...prev, department: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o departamento" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map(dept => (
                          <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-notes">Observações</Label>
                  <Textarea
                    id="edit-notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Observações adicionais (opcional)"
                    rows={3}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="permissions" className="space-y-4 mt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Permissões do Sistema</h3>
                  </div>
                  
                  <div className="grid gap-4">
                    {availablePermissions.map(permission => (
                      <div key={permission.id} className="flex items-start space-x-3 p-3 rounded-lg border">
                        <Checkbox
                          id={`edit-${permission.id}`}
                          checked={formData.permissions.includes(permission.id)}
                          onCheckedChange={(checked) => handlePermissionChange(permission.id, checked as boolean)}
                        />
                        <div className="space-y-1">
                          <Label
                            htmlFor={`edit-${permission.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {permission.label}
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {permission.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleEditAdmin}>
                Salvar Alterações
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}