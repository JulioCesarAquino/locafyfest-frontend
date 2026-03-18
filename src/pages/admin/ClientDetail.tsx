import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/Layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  Phone,
  Mail,
  User,
  Calendar,
  Plus,
  Link2,
  AlertTriangle,
  Loader2,
  Package,
  MapPin,
  Map,
  Navigation,
  Pencil,
  Trash2,
  Star,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  type Client,
  type ClientOrder,
  type ClientAddress,
  type ClientAddressEntry,
  type UpdateManualClientData,
  getClient,
  getClientOrders,
  linkClients,
  updateClient,
  createClientAddress,
  updateClientAddress,
  deleteClientAddress,
  setDefaultClientAddress,
  rejectClientLink,
  deleteManualClient,
} from '@/services/clients';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const orderStatusConfig: Record<string, { label: string; className: string }> = {
  pendente:               { label: 'Pendente',              className: 'bg-yellow-500 text-white' },
  confirmado:             { label: 'Confirmado',            className: 'bg-blue-500 text-white' },
  'aguardando-pagamento': { label: 'Aguardando Pagamento',  className: 'bg-orange-500 text-white' },
  em_andamento:           { label: 'Em Andamento',          className: 'bg-indigo-500 text-white' },
  concluido:              { label: 'Concluído',             className: 'bg-green-600 text-white' },
  cancelado:              { label: 'Cancelado',             className: 'bg-red-500 text-white' },
};

function StatusBadge({ status }: { status: string }) {
  const config = orderStatusConfig[status] ?? { label: status, className: 'bg-gray-500 text-white' };
  return (
    <Badge variant="secondary" className={cn('text-xs', config.className)}>
      {config.label}
    </Badge>
  );
}

// ─── Masks ────────────────────────────────────────────────────────────────────

function maskPhone(v: string) {
  v = v.replace(/\D/g, '').slice(0, 11);
  if (v.length <= 10) return v.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
  return v.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
}
function maskCpf(v: string) {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}
function maskCnpj(v: string) {
  return v.replace(/\D/g, '').slice(0, 14)
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

function formatCep(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 8);
  return d.length <= 5 ? d : `${d.slice(0, 5)}-${d.slice(5)}`;
}

const BR_STATES: Record<string, string> = {
  'Acre':'AC','Alagoas':'AL','Amapá':'AP','Amazonas':'AM','Bahia':'BA','Ceará':'CE',
  'Distrito Federal':'DF','Espírito Santo':'ES','Goiás':'GO','Maranhão':'MA',
  'Mato Grosso':'MT','Mato Grosso do Sul':'MS','Minas Gerais':'MG','Pará':'PA',
  'Paraíba':'PB','Paraná':'PR','Pernambuco':'PE','Piauí':'PI','Rio de Janeiro':'RJ',
  'Rio Grande do Norte':'RN','Rio Grande do Sul':'RS','Rondônia':'RO','Roraima':'RR',
  'Santa Catarina':'SC','São Paulo':'SP','Sergipe':'SE','Tocantins':'TO',
};
function normalizeState(v: string) {
  const t = v.trim();
  if (t.length === 2) return t.toUpperCase();
  return BR_STATES[t] ?? t.slice(0, 2).toUpperCase();
}

const emptyAddressForm: ClientAddress = {
  street: '', number: '', complement: '', neighborhood: '',
  city: '', state: '', zip_code: '', latitude: null, longitude: null,
};

function addressMapQuery(a: ClientAddressEntry) {
  return [a.street, a.number, a.complement, a.neighborhood, a.city, a.state, a.zip_code]
    .filter(Boolean).join(', ');
}

function openGoogleMaps(a: ClientAddressEntry) {
  const q = a.latitude && a.longitude
    ? `${a.latitude},${a.longitude}`
    : encodeURIComponent(addressMapQuery(a));
  window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank');
}

function openWaze(a: ClientAddressEntry) {
  const url = a.latitude && a.longitude
    ? `https://waze.com/ul?ll=${a.latitude},${a.longitude}&navigate=yes`
    : `https://waze.com/ul?q=${encodeURIComponent(addressMapQuery(a))}`;
  window.open(url, '_blank');
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [client, setClient] = useState<Client | null>(null);
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linking, setLinking] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editForm, setEditForm] = useState<UpdateManualClientData & { name: string }>({ name: '' });
  const [editPersonType, setEditPersonType] = useState<'pf' | 'pj'>('pf');
  const [saving, setSaving] = useState(false);

  // address dialog state
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [editingAddress, setEditingAddress] = useState<ClientAddressEntry | null>(null);
  const [addressForm, setAddressForm] = useState<ClientAddress>(emptyAddressForm);
  const [savingAddress, setSavingAddress] = useState(false);
  const [deletingAddressId, setDeletingAddressId] = useState<number | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<number | null>(null);
  const [fetchingCep, setFetchingCep] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);

  useEffect(() => {
    if (!id) return;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [clientData, ordersData] = await Promise.all([
          getClient(Number(id)),
          getClientOrders(Number(id)),
        ]);
        setClient(clientData);
        setOrders(ordersData);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro ao carregar dados do cliente.';
        setError(msg);
        console.error('[ClientDetail]', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleConfirmLink = async () => {
    if (!client?.pending_link_user_id) return;
    setLinking(true);
    try {
      await linkClients(client.id, client.pending_link_user_id);
      toast({ title: 'Clientes vinculados com sucesso!' });
      navigate('/admin/clients');
    } catch {
      toast({ title: 'Erro ao vincular clientes', variant: 'destructive' });
    } finally {
      setLinking(false);
      setShowLinkDialog(false);
    }
  };

  const handleRejectLink = async () => {
    if (!client) return;
    setRejecting(true);
    try {
      await rejectClientLink(client.id);
      setClient((prev) => prev ? { ...prev, source: 'app', pending_link_user_id: undefined, pending_link_user_name: undefined } : prev);
      toast({ title: 'Cadastros marcados como distintos.' });
    } catch {
      toast({ title: 'Erro ao rejeitar vinculação', variant: 'destructive' });
    } finally {
      setRejecting(false);
    }
  };

  const handleDelete = async () => {
    if (!client) return;
    setDeleting(true);
    try {
      const result = await deleteManualClient(client.id);
      toast({ title: result.message });
      navigate('/admin/clients');
    } catch {
      toast({ title: 'Erro ao excluir cliente.', variant: 'destructive' });
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const openEditDialog = () => {
    if (!client) return;
    const pt = client.person_type ?? 'pf';
    setEditPersonType(pt);
    setEditForm({
      name: client.name,
      person_type: pt,
      phone: client.phone ?? '',
      email: client.email ?? '',
      cpf: client.cpf ?? '',
      cnpj: client.cnpj ?? '',
      company_name: client.company_name ?? '',
      birth_date: client.birth_date ? client.birth_date.split('T')[0] : '',
    });
    setShowEditDialog(true);
  };

  const handleEditInput = (field: keyof typeof editForm, value: string) => {
    let masked = value;
    if (field === 'phone') masked = maskPhone(value);
    else if (field === 'cpf') masked = maskCpf(value);
    else if (field === 'cnpj') masked = maskCnpj(value);
    setEditForm((prev) => ({ ...prev, [field]: masked }));
  };

  const switchEditPersonType = (type: 'pf' | 'pj') => {
    setEditPersonType(type);
    setEditForm((prev) => ({ ...prev, person_type: type, cpf: '', cnpj: '', company_name: '' }));
  };

  const handleSaveEdit = async () => {
    if (!client || !editForm.name?.trim()) {
      toast({ title: 'Nome obrigatório', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const updated = await updateClient(client.id, {
        name: editForm.name.trim(),
        person_type: editPersonType,
        phone: editForm.phone?.trim() || null,
        email: editForm.email?.trim() || null,
        cpf: editPersonType === 'pf' ? (editForm.cpf?.trim() || null) : null,
        cnpj: editPersonType === 'pj' ? (editForm.cnpj?.trim() || null) : null,
        company_name: editPersonType === 'pj' ? (editForm.company_name?.trim() || null) : null,
        birth_date: editForm.birth_date || null,
      });
      setClient((prev) => prev ? { ...prev, ...updated } : updated);
      toast({ title: 'Cliente atualizado com sucesso!' });
      setShowEditDialog(false);
    } catch {
      toast({ title: 'Erro ao atualizar cliente', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ── Address handlers ──────────────────────────────────────────────────────

  const openAddAddress = () => {
    setEditingAddress(null);
    setAddressForm(emptyAddressForm);
    setShowAddressDialog(true);
  };

  const openEditAddress = (address: ClientAddressEntry) => {
    setEditingAddress(address);
    setAddressForm({
      street: address.street, number: address.number,
      complement: address.complement ?? '',
      neighborhood: address.neighborhood, city: address.city,
      state: address.state, zip_code: address.zip_code,
      latitude: address.latitude ?? null, longitude: address.longitude ?? null,
    });
    setShowAddressDialog(true);
  };

  const handleAddressFieldChange = (field: keyof ClientAddress, value: string | number | null) =>
    setAddressForm((prev) => ({ ...prev, [field]: value }));

  const handleCepChange = async (value: string) => {
    const formatted = formatCep(value);
    handleAddressFieldChange('zip_code', formatted);
    const digits = formatted.replace(/\D/g, '');
    if (digits.length !== 8) return;
    setFetchingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) { toast({ title: 'CEP não encontrado.', variant: 'destructive' }); return; }
      setAddressForm((prev) => ({
        ...prev,
        zip_code: formatted,
        street: data.logradouro ?? prev.street,
        neighborhood: data.bairro ?? prev.neighborhood,
        city: data.localidade ?? prev.city,
        state: data.uf ?? prev.state,
      }));
    } catch {
      toast({ title: 'Erro ao buscar CEP.', variant: 'destructive' });
    } finally {
      setFetchingCep(false);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: 'Geolocalização não suportada.', variant: 'destructive' });
      return;
    }
    setFetchingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
            { headers: { 'Accept-Language': 'pt-BR' } },
          );
          const data = await res.json();
          const addr = data.address ?? {};
          setAddressForm((prev) => ({
            ...prev,
            street: addr.road ?? addr.street ?? prev.street,
            number: addr.house_number ?? prev.number,
            neighborhood: addr.suburb ?? addr.neighbourhood ?? addr.quarter ?? prev.neighborhood,
            city: addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? prev.city,
            state: normalizeState(addr.state_code ?? addr.state ?? prev.state),
            zip_code: formatCep((addr.postcode ?? '').replace('-', '')),
            latitude, longitude,
          }));
          toast({ title: 'Localização obtida com sucesso!' });
        } catch {
          toast({ title: 'Não foi possível converter a localização.', variant: 'destructive' });
        } finally {
          setFetchingLocation(false);
        }
      },
      () => {
        toast({ title: 'Permissão de localização negada.', variant: 'destructive' });
        setFetchingLocation(false);
      },
      { timeout: 10000 },
    );
  };

  const handleSaveAddress = async () => {
    if (!client) return;
    const { street, number, neighborhood, city, state, zip_code } = addressForm;
    if (!street || !number || !neighborhood || !city || !state || !zip_code) {
      toast({ title: 'Preencha os campos obrigatórios do endereço.', variant: 'destructive' });
      return;
    }
    setSavingAddress(true);
    try {
      if (editingAddress) {
        const updated = await updateClientAddress(editingAddress.id, addressForm);
        setClient((prev) => prev ? {
          ...prev,
          addresses: prev.addresses?.map((a) => a.id === editingAddress.id ? { ...a, ...updated } : a),
        } : prev);
        toast({ title: 'Endereço atualizado!' });
      } else {
        const created = await createClientAddress(client.id, addressForm);
        setClient((prev) => prev ? {
          ...prev,
          addresses: [...(prev.addresses ?? []), created],
        } : prev);
        toast({ title: 'Endereço adicionado!' });
      }
      setShowAddressDialog(false);
    } catch {
      toast({ title: 'Erro ao salvar endereço.', variant: 'destructive' });
    } finally {
      setSavingAddress(false);
    }
  };

  const handleSetDefault = async (addressId: number) => {
    setSettingDefaultId(addressId);
    try {
      await setDefaultClientAddress(addressId);
      setClient((prev) => prev ? {
        ...prev,
        addresses: prev.addresses?.map((a) => ({ ...a, is_default: a.id === addressId })),
      } : prev);
      toast({ title: 'Endereço padrão atualizado!' });
    } catch {
      toast({ title: 'Erro ao definir endereço padrão.', variant: 'destructive' });
    } finally {
      setSettingDefaultId(null);
    }
  };

  const handleDeleteAddress = async (addressId: number) => {
    setDeletingAddressId(addressId);
    try {
      await deleteClientAddress(addressId);
      setClient((prev) => prev ? {
        ...prev,
        addresses: prev.addresses?.filter((a) => a.id !== addressId),
      } : prev);
      toast({ title: 'Endereço removido.' });
    } catch {
      toast({ title: 'Erro ao remover endereço.', variant: 'destructive' });
    } finally {
      setDeletingAddressId(null);
    }
  };

  if (loading) {
    return (
      <AppLayout userType="admin" companyName="Festa & Cia">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (error || !client) {
    return (
      <AppLayout userType="admin" companyName="Festa & Cia">
        <div className="text-center py-24 text-muted-foreground space-y-2">
          <p>{error ?? 'Cliente não encontrado.'}</p>
          <Button variant="link" onClick={() => navigate('/admin/clients')}>
            Voltar para Clientes
          </Button>
        </div>
      </AppLayout>
    );
  }

  const totalSpent = orders
    .filter((o) => o.status === 'concluido')
    .reduce((sum, o) => sum + parseFloat(o.total_amount), 0);

  return (
    <AppLayout userType="admin" companyName="Festa & Cia">
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/clients')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{client.name}</h1>
              <p className="text-muted-foreground text-sm">
                Cadastrado em {new Date(client.created_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {client.source === 'manual' && (
              <>
                <Button
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </Button>
                <Button variant="outline" onClick={openEditDialog}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </Button>
              </>
            )}
            <Button onClick={() => navigate(`/admin/orders?client_id=${client.id}`)}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Pedido
            </Button>
          </div>
        </div>

        {/* Alerta de vinculação pendente */}
        {client.source === 'pending_link' && (
          <Card className="border-yellow-400 bg-yellow-50 dark:bg-yellow-950">
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-800 dark:text-yellow-200">
                      Possível duplicata detectada
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      Este cliente pode ser o mesmo que <strong>{client.pending_link_user_name}</strong>{' '}
                      (cliente manual). Verifique e vincule os registros se necessário.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-red-600 hover:bg-red-50"
                    disabled={rejecting}
                    onClick={handleRejectLink}
                  >
                    {rejecting
                      ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      : <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />}
                    Não é duplicata
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-yellow-500 text-yellow-700 hover:bg-yellow-100"
                    onClick={() => setShowLinkDialog(true)}
                  >
                    <Link2 className="mr-1.5 h-3.5 w-3.5" />
                    Vincular
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-3">

          {/* Dados do cliente */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Dados do Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {client.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span>{client.phone}</span>
                </div>
              )}
              {client.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="break-all">{client.email}</span>
                </div>
              )}
              {client.cpf && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span>CPF: {client.cpf}</span>
                </div>
              )}
              {client.cnpj && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span>CNPJ: {client.cnpj}</span>
                </div>
              )}
              {client.company_name && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span>{client.company_name}</span>
                </div>
              )}
              {client.birth_date && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span>{new Date(client.birth_date).toLocaleDateString('pt-BR')}</span>
                </div>
              )}

              <div className="pt-2 border-t space-y-1">
                <p className="text-xs text-muted-foreground">Tipo de Pessoa</p>
                <Badge
                  variant="outline"
                  className={client.person_type === 'pj'
                    ? 'border-orange-400 text-orange-600 bg-orange-50 dark:bg-orange-950 dark:text-orange-300'
                    : 'border-green-500 text-green-700 bg-green-50 dark:bg-green-950 dark:text-green-300'}
                >
                  {client.person_type === 'pj' ? 'Pessoa Jurídica' : 'Pessoa Física'}
                </Badge>
              </div>

              <div className="pt-2 border-t space-y-1">
                <p className="text-xs text-muted-foreground">Origem</p>
                <Badge
                  variant={client.source === 'app' ? 'default' : 'secondary'}
                  className={client.source === 'app' ? 'bg-blue-600 text-white' : ''}
                >
                  {client.source === 'app' ? 'App' : client.source === 'manual' ? 'Manual' : 'Aguardando vinculação'}
                </Badge>
              </div>

              <div className="pt-2 border-t space-y-1">
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge variant={client.is_active ? 'default' : 'secondary'}
                  className={client.is_active ? 'bg-green-600 text-white' : ''}
                >
                  {client.is_active ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Resumo financeiro + Endereços */}
          <div className="md:col-span-2 flex flex-col gap-4 h-full">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total de Pedidos</CardDescription>
                  <CardTitle className="text-2xl">{orders.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Pedidos Concluídos</CardDescription>
                  <CardTitle className="text-2xl">
                    {orders.filter((o) => o.status === 'concluido').length}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Gasto</CardDescription>
                  <CardTitle className="text-2xl">
                    R$ {totalSpent.toFixed(2).replace('.', ',')}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Endereços */}
            <Card className="flex-1 flex flex-col">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Endereços
                </CardTitle>
                <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={openAddAddress}>
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar
                </Button>
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                {!client.addresses || client.addresses.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <MapPin className="mx-auto h-8 w-8 mb-2 opacity-40" />
                    <p className="text-sm">Nenhum endereço cadastrado.</p>
                    <Button variant="link" size="sm" onClick={openAddAddress}>
                      Adicionar endereço
                    </Button>
                  </div>
                ) : (
                  client.addresses.map((address) => (
                    <div
                      key={address.id}
                      className="border rounded-lg p-3 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm">
                              {address.street}, {address.number}
                              {address.complement ? ` — ${address.complement}` : ''}
                            </p>
                            {address.is_default && (
                              <Badge variant="secondary" className="text-xs gap-1 h-5">
                                <Star className="h-3 w-3" fill="currentColor" />
                                Padrão
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {address.neighborhood} · {address.city} / {address.state}
                            {address.zip_code ? ` · CEP ${address.zip_code}` : ''}
                          </p>
                          {address.latitude && address.longitude && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Navigation className="h-3 w-3 flex-shrink-0" />
                              {Number(address.latitude).toFixed(5)}, {Number(address.longitude).toFixed(5)}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs"
                            onClick={() => openGoogleMaps(address)}>
                            <Map className="h-3.5 w-3.5" />
                            Google Maps
                          </Button>
                          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs"
                            onClick={() => openWaze(address)}>
                            <Navigation className="h-3.5 w-3.5" />
                            Waze
                          </Button>
                          {!address.is_default && (
                            <Button
                              variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-yellow-500"
                              disabled={settingDefaultId === address.id}
                              onClick={() => handleSetDefault(address.id)}
                              title="Definir como padrão"
                            >
                              {settingDefaultId === address.id
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <Star className="h-3.5 w-3.5" />}
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8"
                            onClick={() => openEditAddress(address)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            disabled={deletingAddressId === address.id}
                            onClick={() => handleDeleteAddress(address.id)}>
                            {deletingAddressId === address.id
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Trash2 className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Histórico de pedidos */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Histórico de Pedidos</CardTitle>
                <CardDescription>{orders.length} pedido(s)</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/admin/orders?client_id=${client.id}`)}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Novo Pedido
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Package className="mx-auto h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">Nenhum pedido ainda.</p>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => navigate(`/admin/orders?client_id=${client.id}`)}
                >
                  Criar primeiro pedido
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell className="font-medium">#{order.order_number}</TableCell>
                        <TableCell className="text-sm">
                          <div>{format(new Date(order.rental_start_date), 'dd/MM/yyyy', { locale: ptBR })}</div>
                          <div className="text-muted-foreground text-xs">
                            até {format(new Date(order.rental_end_date), 'dd/MM/yyyy', { locale: ptBR })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={order.status} />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          R$ {parseFloat(order.total_amount).toFixed(2).replace('.', ',')}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => navigate(`/admin/orders?id=${order.id}`)}
                          >
                            <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog de endereço */}
      <Dialog open={showAddressDialog} onOpenChange={setShowAddressDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAddress ? 'Editar endereço' : 'Adicionar endereço'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* CEP + Geolocalização */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="addr-zip">CEP</Label>
                <div className="relative">
                  <Input
                    id="addr-zip"
                    placeholder="00000-000"
                    maxLength={9}
                    value={addressForm.zip_code}
                    onChange={(e) => handleCepChange(e.target.value)}
                  />
                  {fetchingCep && (
                    <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>
              <div className="col-span-2 flex items-end">
                <Button type="button" variant="outline" className="w-full gap-2"
                  onClick={getCurrentLocation} disabled={fetchingLocation}>
                  {fetchingLocation
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Navigation className="h-4 w-4" />}
                  {fetchingLocation ? 'Obtendo...' : 'Minha localização'}
                </Button>
              </div>
            </div>

            {/* Rua + Número */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="addr-street">Rua / Avenida <span className="text-destructive">*</span></Label>
                <Input id="addr-street" value={addressForm.street}
                  onChange={(e) => handleAddressFieldChange('street', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="addr-number">Número <span className="text-destructive">*</span></Label>
                <Input id="addr-number" value={addressForm.number}
                  onChange={(e) => handleAddressFieldChange('number', e.target.value)} />
              </div>
            </div>

            {/* Complemento + Bairro */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="addr-complement">Complemento</Label>
                <Input id="addr-complement" placeholder="Apto, Bloco..."
                  value={addressForm.complement ?? ''}
                  onChange={(e) => handleAddressFieldChange('complement', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="addr-neighborhood">Bairro <span className="text-destructive">*</span></Label>
                <Input id="addr-neighborhood" value={addressForm.neighborhood}
                  onChange={(e) => handleAddressFieldChange('neighborhood', e.target.value)} />
              </div>
            </div>

            {/* Cidade + Estado */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="addr-city">Cidade <span className="text-destructive">*</span></Label>
                <Input id="addr-city" value={addressForm.city}
                  onChange={(e) => handleAddressFieldChange('city', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="addr-state">Estado <span className="text-destructive">*</span></Label>
                <Input id="addr-state" placeholder="SP" maxLength={2}
                  value={addressForm.state}
                  onChange={(e) => handleAddressFieldChange('state', e.target.value.toUpperCase())} />
              </div>
            </div>

            {addressForm.latitude && addressForm.longitude && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Navigation className="h-3 w-3" />
                {Number(addressForm.latitude).toFixed(5)}, {Number(addressForm.longitude).toFixed(5)}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddressDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveAddress} disabled={savingAddress}>
              {savingAddress && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingAddress ? 'Salvar alterações' : 'Adicionar endereço'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de edição */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar cliente</DialogTitle>
            <DialogDescription>Altere os dados do cliente manual.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* PF / PJ toggle */}
            <div className="space-y-2">
              <Label>Tipo de Pessoa</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => switchEditPersonType('pf')}
                  className={`flex-1 rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                    editPersonType === 'pf'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-input hover:bg-muted'
                  }`}
                >
                  Pessoa Física
                </button>
                <button
                  type="button"
                  onClick={() => switchEditPersonType('pj')}
                  className={`flex-1 rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                    editPersonType === 'pj'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-input hover:bg-muted'
                  }`}
                >
                  Pessoa Jurídica
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="edit-name">
                  Nome {editPersonType === 'pf' ? 'Completo' : 'do Responsável'} *
                </Label>
                <Input
                  id="edit-name"
                  value={editForm.name ?? ''}
                  onChange={(e) => handleEditInput('name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Telefone</Label>
                <Input
                  id="edit-phone"
                  value={editForm.phone ?? ''}
                  onChange={(e) => handleEditInput('phone', e.target.value)}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">E-mail</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email ?? ''}
                  onChange={(e) => handleEditInput('email', e.target.value)}
                  placeholder="cliente@email.com"
                />
              </div>

              {editPersonType === 'pf' ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="edit-cpf">CPF</Label>
                    <Input
                      id="edit-cpf"
                      value={editForm.cpf ?? ''}
                      onChange={(e) => handleEditInput('cpf', e.target.value)}
                      placeholder="000.000.000-00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-birth">Data de Nascimento</Label>
                    <Input
                      id="edit-birth"
                      type="date"
                      value={editForm.birth_date ?? ''}
                      onChange={(e) => handleEditInput('birth_date', e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="edit-cnpj">CNPJ</Label>
                    <Input
                      id="edit-cnpj"
                      value={editForm.cnpj ?? ''}
                      onChange={(e) => handleEditInput('cnpj', e.target.value)}
                      placeholder="00.000.000/0000-00"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="edit-company">Razão Social</Label>
                    <Input
                      id="edit-company"
                      value={editForm.company_name ?? ''}
                      onChange={(e) => handleEditInput('company_name', e.target.value)}
                      placeholder="Nome da empresa"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de exclusão */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              Excluir cliente
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir <strong>{client.name}</strong>?
              <br /><br />
              <span className="text-xs text-muted-foreground">
                Se não houver pedidos ou endereços vinculados, o cadastro será removido permanentemente.
                Caso contrário, será desativado e removido das listagens — os históricos serão preservados.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de vinculação */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular clientes</DialogTitle>
            <DialogDescription>
              Ao confirmar, o histórico de pedidos do cliente manual será migrado para esta conta
              e o registro manual será removido. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="rounded-md border p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cliente App (esta conta)</p>
              <p className="font-semibold">{client.name}</p>
              <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                {client.phone && <span>{client.phone}</span>}
                {client.email && <span>{client.email}</span>}
              </div>
            </div>
            <div className="flex items-center justify-center">
              <Link2 className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="rounded-md border p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cliente Manual (será removido)</p>
              <p className="font-semibold">{client.pending_link_user_name}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmLink} disabled={linking}>
              {linking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar vinculação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
