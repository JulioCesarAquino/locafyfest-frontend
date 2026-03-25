import { useState, useEffect, useRef } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  UserPlus, Edit, Trash2, Search, Download, Shield, User, Calendar,
  Activity, Camera, KeyRound, Save, Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ImageCropModal } from '@/components/ImageCropModal';
import * as adminService from './services';
import type { Admin, CreateAdminData, UpdateAdminData } from './services';

const availablePermissions = [
  { id: 'dashboard', label: 'Dashboard',      description: 'Visualizar métricas e relatórios gerais' },
  { id: 'products',  label: 'Produtos',        description: 'Gerenciar produtos e catálogo' },
  { id: 'clients',   label: 'Clientes',        description: 'Gerenciar dados dos clientes' },
  { id: 'orders',    label: 'Pedidos',         description: 'Processar e gerenciar pedidos' },
  { id: 'reports',   label: 'Relatórios',      description: 'Acessar e exportar relatórios' },
  { id: 'settings',  label: 'Configurações',   description: 'Modificar configurações do sistema' },
  { id: 'admins',    label: 'Administradores', description: 'Gerenciar outros administradores' },
];

const getBaseUrl = () => import.meta.env.VITE_STORAGE_URL ?? '';

function ProfilePhoto({ path, name, size = 'md' }: { path?: string; name: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'h-24 w-24' : size === 'md' ? 'h-10 w-10' : 'h-8 w-8';
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const src = path ? `${getBaseUrl()}/${path}` : undefined;
  return (
    <Avatar className={sizeClass}>
      <AvatarImage src={src} alt={name} />
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  );
}

export default function Admins() {
  const { updateUserName, updateUserAvatarPath } = useAuth();
  const { toast } = useToast();

  // Lista de admins
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Meu perfil
  const [me, setMe] = useState<Admin | null>(null);
  const [loadingMe, setLoadingMe] = useState(true);
  const [profileForm, setProfileForm] = useState({ name: '', email: '', phone: '' });
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', new_password_confirmation: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingMyPhoto, setUploadingMyPhoto] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState('');
  const myPhotoRef = useRef<HTMLInputElement>(null);

  // Criar admin
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateAdminData & { password_confirmation: string }>({
    name: '', email: '', password: '', password_confirmation: '', permissions: [],
  });
  const [creating, setCreating] = useState(false);

  // Editar admin
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [editForm, setEditForm] = useState<UpdateAdminData>({ name: '', email: '', permissions: [] });
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const editPhotoRef = useRef<HTMLInputElement>(null);

  // Reset senha
  const [resetTarget, setResetTarget] = useState<Admin | null>(null);
  const [resetForm, setResetForm] = useState({ new_password: '', new_password_confirmation: '' });
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    fetchAdmins();
    fetchMe();
  }, []);

  async function fetchAdmins() {
    setLoadingList(true);
    try {
      const data = await adminService.getAdmins();
      setAdmins(data);
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível carregar os administradores.', variant: 'destructive' });
    } finally {
      setLoadingList(false);
    }
  }

  async function fetchMe() {
    setLoadingMe(true);
    try {
      const data = await adminService.getMe();
      setMe(data);
      setProfileForm({ name: data.name ?? '', email: data.email ?? '', phone: data.phone ?? '' });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível carregar seu perfil.', variant: 'destructive' });
    } finally {
      setLoadingMe(false);
    }
  }

  const filteredAdmins = admins.filter(a => {
    const matchSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        a.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || (statusFilter === 'active' ? a.is_active : !a.is_active);
    return matchSearch && matchStatus;
  });

  function togglePermission(list: string[], id: string, checked: boolean) {
    return checked ? [...list, id] : list.filter(p => p !== id);
  }

  async function handleCreate() {
    setCreating(true);
    try {
      const newAdmin = await adminService.createAdmin({
        name: createForm.name,
        email: createForm.email,
        password: createForm.password,
        permissions: createForm.permissions,
      });
      setAdmins(prev => [newAdmin, ...prev]);
      setIsCreateOpen(false);
      setCreateForm({ name: '', email: '', password: '', password_confirmation: '', permissions: [] });
      toast({ title: 'Administrador criado', description: `${newAdmin.name} foi adicionado com sucesso.` });
    } catch (err: any) {
      toast({ title: 'Erro', description: err?.response?.data?.message ?? 'Erro ao criar administrador.', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  }

  function openEdit(admin: Admin) {
    setEditingAdmin(admin);
    setEditForm({ name: admin.name, email: admin.email, permissions: admin.permissions ?? [] });
  }

  async function handleEdit() {
    if (!editingAdmin) return;
    setSaving(true);
    try {
      const updated = await adminService.updateAdmin(editingAdmin.id, editForm);
      setAdmins(prev => prev.map(a => a.id === updated.id ? updated : a));
      setEditingAdmin(null);
      toast({ title: 'Administrador atualizado', description: 'Dados salvos com sucesso.' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err?.response?.data?.message ?? 'Erro ao salvar.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(admin: Admin) {
    try {
      await adminService.deleteAdmin(admin.id);
      setAdmins(prev => prev.filter(a => a.id !== admin.id));
      toast({ title: 'Administrador removido', description: `${admin.name} foi excluído.` });
    } catch (err: any) {
      toast({ title: 'Erro', description: err?.response?.data?.message ?? 'Erro ao excluir.', variant: 'destructive' });
    }
  }

  async function handleToggleStatus(admin: Admin) {
    try {
      const updated = await adminService.toggleAdminStatus(admin.id);
      setAdmins(prev => prev.map(a => a.id === updated.id ? updated : a));
      toast({ title: 'Status atualizado', description: `${admin.name} foi ${updated.is_active ? 'ativado' : 'desativado'}.` });
    } catch (err: any) {
      toast({ title: 'Erro', description: err?.response?.data?.message ?? 'Erro ao alterar status.', variant: 'destructive' });
    }
  }

  async function handleEditPhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!editingAdmin || !e.target.files?.[0]) return;
    setUploadingPhoto(true);
    try {
      const updated = await adminService.uploadAdminPhoto(editingAdmin.id, e.target.files[0]);
      setAdmins(prev => prev.map(a => a.id === updated.id ? updated : a));
      setEditingAdmin(updated);
      toast({ title: 'Foto atualizada', description: 'A foto do administrador foi atualizada.' });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível atualizar a foto.', variant: 'destructive' });
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  }

  async function handleResetPassword() {
    if (!resetTarget) return;
    setResetting(true);
    try {
      await adminService.resetAdminPassword(resetTarget.id, resetForm);
      setResetTarget(null);
      setResetForm({ new_password: '', new_password_confirmation: '' });
      toast({ title: 'Senha redefinida', description: `Senha de ${resetTarget.name} foi alterada.` });
    } catch (err: any) {
      toast({ title: 'Erro', description: err?.response?.data?.message ?? 'Erro ao redefinir senha.', variant: 'destructive' });
    } finally {
      setResetting(false);
    }
  }

  async function handleSaveProfile() {
    setSavingProfile(true);
    try {
      const updated = await adminService.updateMyProfile(profileForm);
      setMe(updated);
      updateUserName(updated.name);
      toast({ title: 'Perfil atualizado', description: 'Seus dados foram salvos com sucesso.' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err?.response?.data?.message ?? 'Erro ao salvar perfil.', variant: 'destructive' });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword() {
    setSavingPassword(true);
    try {
      await adminService.changeMyPassword(passwordForm);
      setPasswordForm({ current_password: '', new_password: '', new_password_confirmation: '' });
      toast({ title: 'Senha alterada', description: 'Sua senha foi alterada com sucesso.' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err?.response?.data?.message ?? 'Erro ao alterar senha.', variant: 'destructive' });
    } finally {
      setSavingPassword(false);
    }
  }

  function handleMyPhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (imageToCrop) URL.revokeObjectURL(imageToCrop);
    setImageToCrop(URL.createObjectURL(file));
    setCropModalOpen(true);
    e.target.value = '';
  }

  async function handleCropConfirm(blob: Blob) {
    setCropModalOpen(false);
    setUploadingMyPhoto(true);
    try {
      const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
      const updated = await adminService.uploadMyPhoto(file);
      setMe(updated);
      updateUserAvatarPath(updated.profile_picture_path ?? '');
      toast({ title: 'Foto atualizada', description: 'Sua foto de perfil foi atualizada.' });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível atualizar sua foto.', variant: 'destructive' });
    } finally {
      setUploadingMyPhoto(false);
      if (imageToCrop) URL.revokeObjectURL(imageToCrop);
      setImageToCrop('');
    }
  }

  async function handleRemoveMyPhoto() {
    setUploadingMyPhoto(true);
    try {
      const updated = await adminService.removeMyPhoto();
      setMe(updated);
      updateUserAvatarPath('');
      toast({ title: 'Foto removida', description: 'Sua foto de perfil foi removida.' });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível remover sua foto.', variant: 'destructive' });
    } finally {
      setUploadingMyPhoto(false);
    }
  }

  function exportData() {
    const csv = 'data:text/csv;charset=utf-8,Nome,Email,Status,Último Login,Criado em\n'
      + filteredAdmins.map(a =>
          `${a.name},${a.email},${a.is_active ? 'Ativo' : 'Inativo'},${a.last_login ?? ''},${a.created_at}`
        ).join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csv);
    link.download = 'administradores.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Dados exportados', description: 'Arquivo CSV gerado com sucesso.' });
  }

  const PermissionsGrid = ({ value, onChange }: { value: string[]; onChange: (p: string[]) => void }) => (
    <div className="grid gap-3">
      {availablePermissions.map(p => (
        <div key={p.id} className="flex items-start space-x-3 p-3 rounded-lg border">
          <Checkbox
            id={`perm-${p.id}`}
            checked={value.includes(p.id)}
            onCheckedChange={checked => onChange(togglePermission(value, p.id, checked as boolean))}
          />
          <div className="space-y-1">
            <Label htmlFor={`perm-${p.id}`} className="text-sm font-medium">{p.label}</Label>
            <p className="text-xs text-muted-foreground">{p.description}</p>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <AppLayout userType="admin" companyName="Sistema de Gestão">
      <div className="space-y-6">
        <Tabs defaultValue="admins">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Administradores</h1>
              <p className="text-muted-foreground">Gerencie usuários admins e seu perfil</p>
            </div>
            <TabsList>
              <TabsTrigger value="admins">Gerenciar Admins</TabsTrigger>
              <TabsTrigger value="profile">Meu Perfil</TabsTrigger>
            </TabsList>
          </div>

          {/* ===== ABA: GERENCIAR ADMINS ===== */}
          <TabsContent value="admins" className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total</CardTitle>
                  <User className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">{admins.length}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ativos</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold text-green-600">{admins.filter(a => a.is_active).length}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Inativos</CardTitle>
                  <User className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold text-red-600">{admins.filter(a => !a.is_active).length}</div></CardContent>
              </Card>
            </div>

            {/* Filters + actions */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Buscar por nome ou email..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="active">Ativos</SelectItem>
                      <SelectItem value="inactive">Inativos</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={exportData} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />Exportar
                  </Button>
                  <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                      <Button><UserPlus className="h-4 w-4 mr-2" />Novo Admin</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader><DialogTitle>Adicionar Novo Administrador</DialogTitle></DialogHeader>
                      <Tabs defaultValue="basic" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="basic">Dados Básicos</TabsTrigger>
                          <TabsTrigger value="permissions">Permissões</TabsTrigger>
                        </TabsList>
                        <TabsContent value="basic" className="space-y-4 mt-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Nome Completo</Label>
                              <Input value={createForm.name} onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))} placeholder="Nome completo" />
                            </div>
                            <div className="space-y-2">
                              <Label>Email</Label>
                              <Input type="email" value={createForm.email} onChange={e => setCreateForm(p => ({ ...p, email: e.target.value }))} placeholder="email@empresa.com" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Senha</Label>
                              <Input type="password" value={createForm.password} onChange={e => setCreateForm(p => ({ ...p, password: e.target.value }))} placeholder="Mínimo 8 caracteres" />
                            </div>
                            <div className="space-y-2">
                              <Label>Confirmar Senha</Label>
                              <Input type="password" value={createForm.password_confirmation} onChange={e => setCreateForm(p => ({ ...p, password_confirmation: e.target.value }))} placeholder="Repita a senha" />
                            </div>
                          </div>
                        </TabsContent>
                        <TabsContent value="permissions" className="mt-4">
                          <div className="flex items-center gap-2 mb-4">
                            <Shield className="h-5 w-5 text-primary" />
                            <h3 className="text-lg font-semibold">Permissões do Sistema</h3>
                          </div>
                          <PermissionsGrid
                            value={createForm.permissions ?? []}
                            onChange={p => setCreateForm(f => ({ ...f, permissions: p }))}
                          />
                        </TabsContent>
                      </Tabs>
                      <div className="flex justify-end gap-2 mt-6">
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                        <Button onClick={handleCreate} disabled={creating}>
                          {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Criar Administrador
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>

            {/* Table */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Administrador</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Último Login</TableHead>
                        <TableHead>Permissões</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingList ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                          </TableCell>
                        </TableRow>
                      ) : filteredAdmins.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="font-semibold">Nenhum administrador encontrado</p>
                            <p className="text-muted-foreground text-sm">Ajuste os filtros ou adicione um novo.</p>
                          </TableCell>
                        </TableRow>
                      ) : filteredAdmins.map(admin => (
                        <TableRow key={admin.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <ProfilePhoto path={admin.profile_picture_path} name={admin.name} size="sm" />
                              <div>
                                <div className="font-medium">{admin.name}</div>
                                <div className="text-sm text-muted-foreground">{admin.email}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch checked={admin.is_active} onCheckedChange={() => handleToggleStatus(admin)} />
                              <Badge variant={admin.is_active ? 'default' : 'secondary'}>
                                {admin.is_active ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {admin.last_login ? new Date(admin.last_login).toLocaleString('pt-BR') : 'Nunca'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">{(admin.permissions ?? []).length} permissões</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openEdit(admin)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm"><Trash2 className="h-4 w-4" /></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Deseja excluir <strong>{admin.name}</strong>? Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(admin)}>Excluir</AlertDialogAction>
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== ABA: MEU PERFIL ===== */}
          <TabsContent value="profile" className="space-y-6">
            {loadingMe ? (
              <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : me && (
              <>
                {/* Foto + info */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      <div className="relative group">
                        <ProfilePhoto path={me.profile_picture_path} name={me.name} size="lg" />
                        <button
                          className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => myPhotoRef.current?.click()}
                          disabled={uploadingMyPhoto}
                        >
                          {uploadingMyPhoto
                            ? <Loader2 className="h-5 w-5 text-white animate-spin" />
                            : <Camera className="h-5 w-5 text-white" />
                          }
                        </button>
                        <input ref={myPhotoRef} type="file" accept="image/*" className="hidden" onChange={handleMyPhotoUpload} />
                      </div>
                      <div className="text-center sm:text-left">
                        <h2 className="text-xl font-bold">{me.name}</h2>
                        <p className="text-muted-foreground">{me.email}</p>
                        <Badge className="mt-2" variant="outline">Administrador</Badge>
                      </div>
                      {me.profile_picture_path && (
                        <Button variant="outline" size="sm" className="ml-auto" onClick={handleRemoveMyPhoto} disabled={uploadingMyPhoto}>
                          Remover foto
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Dados pessoais */}
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />Dados Pessoais</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Nome Completo</Label>
                        <Input value={profileForm.name} onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input type="email" value={profileForm.email} onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Telefone</Label>
                        <Input value={profileForm.phone} onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))} placeholder="(00) 00000-0000" />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button onClick={handleSaveProfile} disabled={savingProfile}>
                        {savingProfile ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        Salvar Alterações
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Alterar senha */}
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" />Alterar Senha</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Senha Atual</Label>
                        <Input type="password" value={passwordForm.current_password} onChange={e => setPasswordForm(p => ({ ...p, current_password: e.target.value }))} placeholder="••••••••" />
                      </div>
                      <div className="space-y-2">
                        <Label>Nova Senha</Label>
                        <Input type="password" value={passwordForm.new_password} onChange={e => setPasswordForm(p => ({ ...p, new_password: e.target.value }))} placeholder="Mínimo 8 caracteres" />
                      </div>
                      <div className="space-y-2">
                        <Label>Confirmar Nova Senha</Label>
                        <Input type="password" value={passwordForm.new_password_confirmation} onChange={e => setPasswordForm(p => ({ ...p, new_password_confirmation: e.target.value }))} placeholder="Repita a nova senha" />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button onClick={handleChangePassword} disabled={savingPassword} variant="outline">
                        {savingPassword ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <KeyRound className="h-4 w-4 mr-2" />}
                        Alterar Senha
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Dialog: Editar administrador */}
        <Dialog open={!!editingAdmin} onOpenChange={open => !open && setEditingAdmin(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Editar Administrador</DialogTitle></DialogHeader>

            {editingAdmin && (
              <>
                <div className="flex items-center gap-4 pb-4">
                  <div className="relative group">
                    <ProfilePhoto path={editingAdmin.profile_picture_path} name={editingAdmin.name} size="md" />
                    <button
                      className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => editPhotoRef.current?.click()}
                      disabled={uploadingPhoto}
                    >
                      {uploadingPhoto ? <Loader2 className="h-4 w-4 text-white animate-spin" /> : <Camera className="h-4 w-4 text-white" />}
                    </button>
                    <input ref={editPhotoRef} type="file" accept="image/*" className="hidden" onChange={handleEditPhotoUpload} />
                  </div>
                  <div>
                    <p className="font-medium">{editingAdmin.name}</p>
                    <p className="text-sm text-muted-foreground">Clique na foto para alterar</p>
                  </div>
                  <Button variant="outline" size="sm" className="ml-auto" onClick={() => setResetTarget(editingAdmin)}>
                    <KeyRound className="h-4 w-4 mr-2" />Redefinir Senha
                  </Button>
                </div>
                <Separator />
              </>
            )}

            <Tabs defaultValue="basic" className="w-full mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">Dados Básicos</TabsTrigger>
                <TabsTrigger value="permissions">Permissões</TabsTrigger>
              </TabsList>
              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome Completo</Label>
                    <Input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} />
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="permissions" className="mt-4">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Permissões do Sistema</h3>
                </div>
                <PermissionsGrid
                  value={editForm.permissions ?? []}
                  onChange={p => setEditForm(f => ({ ...f, permissions: p }))}
                />
              </TabsContent>
            </Tabs>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setEditingAdmin(null)}>Cancelar</Button>
              <Button onClick={handleEdit} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar Alterações
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog: Redefinir senha */}
        <Dialog open={!!resetTarget} onOpenChange={open => !open && setResetTarget(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Redefinir Senha — {resetTarget?.name}</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Nova Senha</Label>
                <Input type="password" value={resetForm.new_password} onChange={e => setResetForm(p => ({ ...p, new_password: e.target.value }))} placeholder="Mínimo 8 caracteres" />
              </div>
              <div className="space-y-2">
                <Label>Confirmar Nova Senha</Label>
                <Input type="password" value={resetForm.new_password_confirmation} onChange={e => setResetForm(p => ({ ...p, new_password_confirmation: e.target.value }))} placeholder="Repita a nova senha" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setResetTarget(null)}>Cancelar</Button>
              <Button onClick={handleResetPassword} disabled={resetting}>
                {resetting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Redefinir Senha
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <ImageCropModal
        open={cropModalOpen}
        imageSrc={imageToCrop}
        onClose={() => { setCropModalOpen(false); setImageToCrop(''); }}
        onCrop={handleCropConfirm}
      />
    </AppLayout>
  );
}
