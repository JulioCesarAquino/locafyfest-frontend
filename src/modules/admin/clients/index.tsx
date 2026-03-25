import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/Layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Search,
  Plus,
  Phone,
  Mail,
  User,
  Calendar,
  Link2,
  ChevronRight,
  AlertTriangle,
  Loader2,
  MapPin,
  Navigation,
  XCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  type Client,
  type ClientSource,
  type ClientAddress,
  type CreateManualClientData,
  getClients,
  createManualClient,
  linkClients,
  rejectClientLink,
} from './services';

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
function validateCnpj(cnpj: string): boolean {
  const n = cnpj.replace(/\D/g, '');
  if (n.length !== 14 || /^(\d)\1+$/.test(n)) return false;
  const calc = (len: number) => {
    let s = 0, p = len - 7;
    for (let i = 0; i < len; i++) { s += parseInt(n[i]) * p--; if (p < 2) p = 9; }
    const r = s % 11; return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === parseInt(n[12]) && calc(13) === parseInt(n[13]);
}

// ─── Address helpers ──────────────────────────────────────────────────────────

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
  if (!v) return '';
  const t = v.trim();
  if (t.length === 2) return t.toUpperCase();
  return BR_STATES[t] ?? t.slice(0, 2).toUpperCase();
}

const emptyAddress: ClientAddress = {
  street: '', number: '', complement: '', neighborhood: '', city: '', state: '', zip_code: '',
  latitude: null, longitude: null,
};

// ─── Mock data (usado enquanto o backend não implementa source) ───────────────

const mockClients: Client[] = [
  {
    id: 1,
    name: 'João Silva Santos',
    phone: '(11) 99999-8888',
    email: 'joao.silva@email.com',
    cpf: '123.456.789-00',
    cnpj: null,
    company_name: null,
    birth_date: '1985-03-15',
    person_type: 'pf',
    user_type: 'client',
    is_active: true,
    email_verified_at: '2024-01-16T10:00:00Z',
    created_at: '2024-01-15',
    source: 'app',
  },
  {
    id: 2,
    name: 'Maria Oliveira Costa',
    phone: '(11) 88888-7777',
    email: null,
    cpf: null,
    cnpj: null,
    company_name: null,
    birth_date: null,
    person_type: 'pf',
    user_type: 'client',
    is_active: true,
    email_verified_at: null,
    created_at: '2024-01-20',
    source: 'manual',
  },
  {
    id: 3,
    name: 'Pedro Santos',
    phone: '(11) 77777-6666',
    email: 'pedro.santos@email.com',
    cpf: null,
    cnpj: null,
    company_name: null,
    birth_date: null,
    person_type: 'pf',
    user_type: 'client',
    is_active: true,
    email_verified_at: '2024-02-01T09:00:00Z',
    created_at: '2024-01-25',
    source: 'pending_link',
    pending_link_user_id: 4,
    pending_link_user_name: 'Pedro S. (manual)',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sourceBadge: Record<ClientSource, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; className: string }> = {
  app: { label: 'App', variant: 'default', className: 'bg-blue-600 text-white hover:bg-blue-700' },
  manual: { label: 'Manual', variant: 'secondary', className: 'bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-950 dark:text-purple-300' },
  pending_link: { label: 'Aguardando vinculação', variant: 'outline', className: 'border-yellow-500 text-yellow-600 bg-yellow-50 dark:bg-yellow-950' },
};

type TabFilter = 'all' | ClientSource;

// ─── Component ────────────────────────────────────────────────────────────────

export default function Clients() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // link / reject dialog
  const [linkTarget, setLinkTarget] = useState<Client | null>(null);
  const [linkingId, setLinkingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);

  // form state
  const [personType, setPersonType] = useState<'pf' | 'pj'>('pf');
  const [formData, setFormData] = useState<CreateManualClientData & { name: string }>({
    name: '',
    person_type: 'pf',
    phone: '',
    email: '',
    cpf: '',
    cnpj: '',
    company_name: '',
    birth_date: '',
  });

  // address state
  const [addressForm, setAddressForm] = useState<ClientAddress>(emptyAddress);
  const [fetchingCep, setFetchingCep] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);

  const handleAddressChange = (field: keyof ClientAddress, value: string | number | null) =>
    setAddressForm((prev) => ({ ...prev, [field]: value }));

  const fetchCepData = async (digits: string) => {
    setFetchingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) { toast({ title: 'CEP não encontrado.', variant: 'destructive' }); return; }
      setAddressForm((prev) => ({
        ...prev,
        zip_code: formatCep(digits),
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

  const handleCepChange = (value: string) => {
    const formatted = formatCep(value);
    handleAddressChange('zip_code', formatted);
    const digits = formatted.replace(/\D/g, '');
    if (digits.length === 8) fetchCepData(digits);
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: 'Geolocalização não suportada pelo navegador.', variant: 'destructive' });
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
            latitude,
            longitude,
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

  // ── Load clients ──────────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await getClients();
        setClients(data);
      } catch {
        toast({ title: 'Erro ao carregar clientes', description: 'Verifique sua conexão com o servidor.', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ── Derived counts ────────────────────────────────────────────────────────

  const counts = {
    all: clients.length,
    app: clients.filter((c) => c.source === 'app').length,
    manual: clients.filter((c) => c.source === 'manual').length,
    pending_link: clients.filter((c) => c.source === 'pending_link').length,
  };

  // ── Filter ────────────────────────────────────────────────────────────────

  const filtered = clients.filter((c) => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      c.name.toLowerCase().includes(term) ||
      (c.phone ?? '').toLowerCase().includes(term) ||
      (c.email ?? '').toLowerCase().includes(term) ||
      (c.cpf ?? '').toLowerCase().includes(term);
    const matchTab = activeTab === 'all' || c.source === activeTab;
    return matchSearch && matchTab;
  });

  // ── Form ──────────────────────────────────────────────────────────────────

  const handleInput = (field: keyof typeof formData, value: string) => {
    let masked = value;
    if (field === 'phone') masked = maskPhone(value);
    else if (field === 'cpf') masked = maskCpf(value);
    else if (field === 'cnpj') masked = maskCnpj(value);
    setFormData((prev) => ({ ...prev, [field]: masked }));
  };

  const switchPersonType = (type: 'pf' | 'pj') => {
    setPersonType(type);
    setFormData((prev) => ({ ...prev, person_type: type, cpf: '', cnpj: '', company_name: '' }));
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      toast({ title: 'Nome obrigatório', variant: 'destructive' });
      return false;
    }
    if (personType === 'pj' && formData.cnpj?.trim() && !validateCnpj(formData.cnpj)) {
      toast({ title: 'CNPJ inválido', variant: 'destructive' });
      return false;
    }
    const hasContact = formData.phone?.trim() || formData.email?.trim() ||
      (personType === 'pf' ? formData.cpf?.trim() : formData.cnpj?.trim());
    if (!hasContact) {
      toast({
        title: 'Dado de contato obrigatório',
        description: personType === 'pf'
          ? 'Informe pelo menos telefone, e-mail ou CPF.'
          : 'Informe pelo menos telefone, e-mail ou CNPJ.',
        variant: 'destructive',
      });
      return false;
    }
    return true;
  };

  const resetForm = () => {
    setPersonType('pf');
    setFormData({ name: '', person_type: 'pf', phone: '', email: '', cpf: '', cnpj: '', company_name: '', birth_date: '' });
    setAddressForm(emptyAddress);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const hasAddress = addressForm.street.trim() && addressForm.number.trim() &&
        addressForm.city.trim() && addressForm.state.trim() && addressForm.zip_code.trim();

      const created = await createManualClient({
        name: formData.name.trim(),
        person_type: personType,
        phone: formData.phone?.trim() || undefined,
        email: formData.email?.trim() || undefined,
        cpf: personType === 'pf' ? (formData.cpf?.trim() || undefined) : undefined,
        cnpj: personType === 'pj' ? (formData.cnpj?.trim() || undefined) : undefined,
        company_name: personType === 'pj' ? (formData.company_name?.trim() || undefined) : undefined,
        birth_date: formData.birth_date || undefined,
        address: hasAddress ? {
          street: addressForm.street.trim(),
          number: addressForm.number.trim(),
          complement: addressForm.complement?.trim() || undefined,
          neighborhood: addressForm.neighborhood.trim(),
          city: addressForm.city.trim(),
          state: addressForm.state.trim().toUpperCase(),
          zip_code: addressForm.zip_code.trim(),
          latitude: addressForm.latitude ?? null,
          longitude: addressForm.longitude ?? null,
        } : undefined,
      });
      setClients((prev) => [created, ...prev]);
      toast({ title: 'Cliente cadastrado com sucesso!' });
    } catch {
      // fallback local enquanto o backend não está pronto
      const newClient: Client = {
        id: Date.now(),
        name: formData.name.trim(),
        person_type: personType,
        phone: formData.phone?.trim() || null,
        email: formData.email?.trim() || null,
        cpf: personType === 'pf' ? (formData.cpf?.trim() || null) : null,
        cnpj: personType === 'pj' ? (formData.cnpj?.trim() || null) : null,
        company_name: personType === 'pj' ? (formData.company_name?.trim() || null) : null,
        birth_date: formData.birth_date || null,
        user_type: 'client',
        is_active: true,
        email_verified_at: null,
        created_at: new Date().toISOString(),
        source: 'manual',
      };
      setClients((prev) => [newClient, ...prev]);
      toast({ title: 'Cliente cadastrado com sucesso!' });
    } finally {
      setSubmitting(false);
      resetForm();
      setShowForm(false);
    }
  };

  // ── Link ──────────────────────────────────────────────────────────────────

  const handleConfirmLink = async () => {
    if (!linkTarget || !linkTarget.pending_link_user_id) return;
    setLinkingId(linkTarget.id);
    try {
      await linkClients(linkTarget.id, linkTarget.pending_link_user_id);
      setClients((prev) => prev.filter((c) => c.id !== linkTarget.id));
      toast({ title: 'Clientes vinculados com sucesso!' });
    } catch {
      toast({ title: 'Erro ao vincular clientes', variant: 'destructive' });
    } finally {
      setLinkingId(null);
      setLinkTarget(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!linkTarget) return;
    setRejectingId(linkTarget.id);
    try {
      await rejectClientLink(linkTarget.id);
      setClients((prev) =>
        prev.map((c) =>
          c.id === linkTarget.id
            ? { ...c, source: 'app' as ClientSource, pending_link_user_id: undefined, pending_link_user_name: undefined }
            : c,
        ),
      );
      toast({ title: 'Cadastros marcados como distintos.' });
    } catch {
      toast({ title: 'Erro ao rejeitar vinculação', variant: 'destructive' });
    } finally {
      setRejectingId(null);
      setLinkTarget(null);
    }
  };

  const handleDirectReject = async (client: Client) => {
    setRejectingId(client.id);
    try {
      await rejectClientLink(client.id);
      setClients((prev) =>
        prev.map((c) =>
          c.id === client.id
            ? { ...c, source: 'app' as ClientSource, pending_link_user_id: undefined, pending_link_user_name: undefined }
            : c,
        ),
      );
      toast({ title: 'Cadastros marcados como distintos.' });
    } catch {
      toast({ title: 'Erro ao rejeitar vinculação', variant: 'destructive' });
    } finally {
      setRejectingId(null);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <AppLayout userType="admin" companyName="Festa & Cia">
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Clientes</h1>
            <p className="text-muted-foreground">Gerencie os clientes da empresa</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="w-fit">
            <Plus className="mr-2 h-4 w-4" />
            {showForm ? 'Cancelar' : 'Novo Cliente'}
          </Button>
        </div>

        {/* Formulário de cadastro manual */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>Cadastrar Cliente Manual</CardTitle>
              <CardDescription>
                Nome é obrigatório. Informe pelo menos um dado de contato (telefone, e-mail ou CPF)
                para possibilitar vinculação futura caso o cliente se cadastre no app.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">

                {/* Tipo de Pessoa */}
                <div className="space-y-2">
                  <Label>Tipo de Pessoa</Label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => switchPersonType('pf')}
                      className={`flex-1 rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                        personType === 'pf'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-input hover:bg-muted'
                      }`}
                    >
                      Pessoa Física
                    </button>
                    <button
                      type="button"
                      onClick={() => switchPersonType('pj')}
                      className={`flex-1 rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                        personType === 'pj'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-input hover:bg-muted'
                      }`}
                    >
                      Pessoa Jurídica
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome {personType === 'pf' ? 'Completo' : 'do Responsável'} *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInput('name', e.target.value)}
                      placeholder={personType === 'pf' ? 'Nome completo' : 'Nome do responsável'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">
                      Telefone <span className="text-muted-foreground text-xs">(mín. um contato)</span>
                    </Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInput('phone', e.target.value)}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">
                      E-mail <span className="text-muted-foreground text-xs">(mín. um contato)</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInput('email', e.target.value)}
                      placeholder="cliente@email.com"
                    />
                  </div>

                  {personType === 'pf' ? (
                    <div className="space-y-2">
                      <Label htmlFor="cpf">
                        CPF <span className="text-muted-foreground text-xs">(mín. um contato)</span>
                      </Label>
                      <Input
                        id="cpf"
                        value={formData.cpf}
                        onChange={(e) => handleInput('cpf', e.target.value)}
                        placeholder="000.000.000-00"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="cnpj">
                        CNPJ <span className="text-muted-foreground text-xs">(mín. um contato)</span>
                      </Label>
                      <Input
                        id="cnpj"
                        value={formData.cnpj}
                        onChange={(e) => handleInput('cnpj', e.target.value)}
                        placeholder="00.000.000/0000-00"
                      />
                    </div>
                  )}
                </div>

                {personType === 'pj' && (
                  <div className="space-y-2">
                    <Label htmlFor="company_name">Razão Social</Label>
                    <Input
                      id="company_name"
                      value={formData.company_name}
                      onChange={(e) => handleInput('company_name', e.target.value)}
                      placeholder="Nome da empresa"
                    />
                  </div>
                )}

                {personType === 'pf' && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="birth_date">Data de Nascimento</Label>
                      <Input
                        id="birth_date"
                        type="date"
                        value={formData.birth_date}
                        onChange={(e) => handleInput('birth_date', e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Endereço */}
                <div className="border-t pt-4 space-y-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Endereço <span className="text-xs font-normal">(opcional)</span>
                  </p>

                  {/* CEP + Geolocalização */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="zip_code">CEP</Label>
                      <div className="relative">
                        <Input
                          id="zip_code"
                          placeholder="00000-000"
                          value={addressForm.zip_code}
                          onChange={(e) => handleCepChange(e.target.value)}
                          maxLength={9}
                        />
                        {fetchingCep && (
                          <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    <div className="md:col-span-2 flex items-end">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full flex items-center gap-2"
                        onClick={getCurrentLocation}
                        disabled={fetchingLocation}
                      >
                        {fetchingLocation
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Navigation className="h-4 w-4" />}
                        {fetchingLocation ? 'Obtendo localização...' : 'Usar minha localização atual'}
                      </Button>
                    </div>
                  </div>

                  {/* Rua + Número */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="street">Rua / Avenida</Label>
                      <Input
                        id="street"
                        value={addressForm.street}
                        onChange={(e) => handleAddressChange('street', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="number">Número</Label>
                      <Input
                        id="number"
                        value={addressForm.number}
                        onChange={(e) => handleAddressChange('number', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Complemento + Bairro */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="complement">Complemento</Label>
                      <Input
                        id="complement"
                        placeholder="Apto, Bloco, Casa..."
                        value={addressForm.complement}
                        onChange={(e) => handleAddressChange('complement', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="neighborhood">Bairro</Label>
                      <Input
                        id="neighborhood"
                        value={addressForm.neighborhood}
                        onChange={(e) => handleAddressChange('neighborhood', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Cidade + Estado */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="city">Cidade</Label>
                      <Input
                        id="city"
                        value={addressForm.city}
                        onChange={(e) => handleAddressChange('city', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">Estado</Label>
                      <Input
                        id="state"
                        placeholder="SP"
                        maxLength={2}
                        value={addressForm.state}
                        onChange={(e) => handleAddressChange('state', e.target.value.toUpperCase())}
                      />
                    </div>
                  </div>

                  {addressForm.latitude && addressForm.longitude && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      Coordenadas: {Number(addressForm.latitude).toFixed(5)}, {Number(addressForm.longitude).toFixed(5)}
                    </p>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Cadastrar Cliente
                  </Button>
                  <Button type="button" variant="outline" onClick={() => { resetForm(); setShowForm(false); }}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Busca e filtros */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, telefone, e-mail ou CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabFilter)}>
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="all">
              Todos <span className="ml-1.5 text-xs opacity-70">({counts.all})</span>
            </TabsTrigger>
            <TabsTrigger value="app">
              App <span className="ml-1.5 text-xs opacity-70">({counts.app})</span>
            </TabsTrigger>
            <TabsTrigger value="manual">
              Manual <span className="ml-1.5 text-xs opacity-70">({counts.manual})</span>
            </TabsTrigger>
            <TabsTrigger value="pending_link" className="text-yellow-600">
              Aguardando vinculação
              {counts.pending_link > 0 && (
                <span className="ml-1.5 text-xs bg-yellow-500 text-white rounded-full px-1.5">
                  {counts.pending_link}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Lista */}
        <Card>
          <CardHeader>
            <CardTitle>Clientes Cadastrados</CardTitle>
            <CardDescription>
              {loading ? 'Carregando...' : `${filtered.length} cliente(s) encontrado(s)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <User className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>Nenhum cliente encontrado.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((client) => {
                  const badge = sourceBadge[client.source];
                  return (
                    <div
                      key={client.id}
                      className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        {/* Info */}
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-base">{client.name}</h3>
                            <Badge variant={badge.variant} className={badge.className}>
                              {badge.label}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={`text-xs ${client.person_type === 'pj' ? 'border-orange-400 text-orange-600 bg-orange-50 dark:bg-orange-950 dark:text-orange-300' : 'border-green-500 text-green-700 bg-green-50 dark:bg-green-950 dark:text-green-300'}`}
                            >
                              {client.person_type === 'pj' ? 'PJ' : 'PF'}
                            </Badge>
                          </div>

                          {client.source === 'pending_link' && (
                            <div className="flex items-center gap-1.5 text-xs text-yellow-600">
                              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                              Possível duplicata de: <strong>{client.pending_link_user_name}</strong>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                            {client.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3.5 w-3.5" />
                                {client.phone}
                              </span>
                            )}
                            {client.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3.5 w-3.5" />
                                {client.email}
                              </span>
                            )}
                            {client.cpf && (
                              <span className="flex items-center gap-1">
                                <User className="h-3.5 w-3.5" />
                                {client.cpf}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            Cadastrado em {new Date(client.created_at).toLocaleDateString('pt-BR')}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {client.source === 'pending_link' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground hover:text-red-600 hover:bg-red-50"
                                disabled={rejectingId === client.id}
                                onClick={() => handleDirectReject(client)}
                              >
                                {rejectingId === client.id
                                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  : <XCircle className="h-3.5 w-3.5" />}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                                onClick={() => setLinkTarget(client)}
                              >
                                <Link2 className="mr-1.5 h-3.5 w-3.5" />
                                Vincular
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/admin/clients/${client.id}`)}
                          >
                            Ver detalhes
                            <ChevronRight className="ml-1 h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog de vinculação */}
      <Dialog open={!!linkTarget} onOpenChange={(open) => !open && setLinkTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular clientes</DialogTitle>
            <DialogDescription>
              Um cliente do app foi identificado como possível duplicata de um cliente manual.
              Ao confirmar, o histórico de pedidos do cliente manual será migrado para a conta do app
              e o registro manual será removido.
            </DialogDescription>
          </DialogHeader>

          {linkTarget && (
            <div className="space-y-3 py-2">
              <div className="rounded-md border p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cliente App</p>
                <p className="font-semibold">{linkTarget.name}</p>
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  {linkTarget.phone && <span>{linkTarget.phone}</span>}
                  {linkTarget.email && <span>{linkTarget.email}</span>}
                </div>
              </div>
              <div className="flex items-center justify-center">
                <Link2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="rounded-md border p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cliente Manual</p>
                <p className="font-semibold">{linkTarget.pending_link_user_name}</p>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => setLinkTarget(null)}
              disabled={linkingId !== null || rejectingId !== null}
            >
              Cancelar
            </Button>
            <Button
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50"
              onClick={handleConfirmReject}
              disabled={linkingId !== null || rejectingId !== null}
            >
              {rejectingId !== null && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Não é duplicata
            </Button>
            <Button
              onClick={handleConfirmLink}
              disabled={linkingId !== null || rejectingId !== null}
            >
              {linkingId !== null && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar vinculação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
