import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClientLayout } from '@/components/Layout/ClientLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  User, MapPin, Lock, Bell, Camera, Save, Loader2,
  Navigation, Trash2, Pencil, Plus, Star, X,
  Mail, KeyRound, ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/services/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { ImageCropModal } from '@/components/ImageCropModal';
import { storageUrl } from '@/lib/utils';

interface ProfileData {
  id: number | null;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  cnpj: string;
  person_type: 'pf' | 'pj' | '';
  birthDate: string;
}

interface AddressEntry {
  id?: number;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
  latitude?: number | null;
  longitude?: number | null;
  is_default?: boolean;
}

const emptyProfile: ProfileData = {
  id: null,
  name: '',
  email: '',
  phone: '',
  cpf: '',
  cnpj: '',
  person_type: '',
  birthDate: '',
};

const emptyAddress: AddressEntry = {
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  zip_code: '',
  latitude: null,
  longitude: null,
  is_default: false,
};

type ApiError = { response?: { data?: { message?: string } } };

const BR_STATE_CODES: Record<string, string> = {
  'Acre': 'AC', 'Alagoas': 'AL', 'Amapá': 'AP', 'Amazonas': 'AM',
  'Bahia': 'BA', 'Ceará': 'CE', 'Distrito Federal': 'DF',
  'Espírito Santo': 'ES', 'Goiás': 'GO', 'Maranhão': 'MA',
  'Mato Grosso': 'MT', 'Mato Grosso do Sul': 'MS', 'Minas Gerais': 'MG',
  'Pará': 'PA', 'Paraíba': 'PB', 'Paraná': 'PR', 'Pernambuco': 'PE',
  'Piauí': 'PI', 'Rio de Janeiro': 'RJ', 'Rio Grande do Norte': 'RN',
  'Rio Grande do Sul': 'RS', 'Rondônia': 'RO', 'Roraima': 'RR',
  'Santa Catarina': 'SC', 'São Paulo': 'SP', 'Sergipe': 'SE', 'Tocantins': 'TO',
};

function normalizeState(value: string): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (trimmed.length === 2) return trimmed.toUpperCase();
  return BR_STATE_CODES[trimmed] ?? trimmed.slice(0, 2).toUpperCase();
}

function formatCep(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}


export default function Profile() {
  const { updateUserName, updateUserAvatarPath, userAvatarPath } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>(() => {
    return searchParams.get('tab') ?? 'personal';
  });
  const [client, setClient] = useState<ProfileData>(emptyProfile);
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMode, setPasswordMode] = useState<'change' | 'forgot-send' | 'forgot-verify'>('change');
  const [resetCode, setResetCode] = useState('');
  const [resetPwd, setResetPwd] = useState({ new: '', confirm: '' });
  const [sendingCode, setSendingCode] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [localAvatarPreview, setLocalAvatarPreview] = useState('');
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Address state
  const [addresses, setAddresses] = useState<AddressEntry[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  const [addressForm, setAddressForm] = useState<AddressEntry>(emptyAddress);
  const [savingAddress, setSavingAddress] = useState(false);
  const [deletingAddressId, setDeletingAddressId] = useState<number | null>(null);
  const [fetchingCep, setFetchingCep] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);

  useEffect(() => {
    apiClient.get('/auth/me').then(({ data }) => {
      setClient({
        id: data.id ?? null,
        name: data.name ?? '',
        email: data.email ?? '',
        phone: data.phone ?? '',
        cpf: data.cpf ?? '',
        cnpj: data.cnpj ?? '',
        person_type: data.person_type ?? '',
        birthDate: data.birth_date ? data.birth_date.split('T')[0] : '',
      });
      if (data.profile_picture_path) {
        updateUserAvatarPath(data.profile_picture_path);
      }
    }).catch(() => {});
  }, [updateUserAvatarPath]);

  const loadAddresses = () => {
    setLoadingAddresses(true);
    apiClient.get('/addresses').then(({ data }) => {
      const list = data?.data ?? data ?? [];
      setAddresses(Array.isArray(list) ? list : []);
    }).catch(() => {
      toast.error('Erro ao carregar endereços.');
    }).finally(() => setLoadingAddresses(false));
  };

  useEffect(() => {
    loadAddresses();
  }, []);

  // Abrir aba e formulário via URL params (ex: /profile?tab=address&new=1)
  useEffect(() => {
    const tab = searchParams.get('tab');
    const openNew = searchParams.get('new') === '1';
    if (tab) setActiveTab(tab);
    if ((tab === 'address' || tab === 'addresses') && openNew) {
      // Aguarda endereços carregarem antes de abrir o form
      setTimeout(() => {
        setAddressForm(emptyAddress);
        setEditingAddressId(null);
        setShowAddressForm(true);
      }, 300);
    }
  }, [searchParams]);

  const handlePersonalDataChange = (field: string, value: string) =>
    setClient(prev => ({ ...prev, [field]: value }));

  const handleAddressFormChange = (field: keyof AddressEntry, value: string) =>
    setAddressForm(prev => ({ ...prev, [field]: value }));

  const savePersonalData = async () => {
    setSavingPersonal(true);
    try {
      await apiClient.put('/me', {
        name: client.name,
        phone: client.phone,
        birth_date: client.birthDate || undefined,
      });
      updateUserName(client.name);
      toast.success('Dados pessoais atualizados com sucesso!');
    } catch (err: unknown) {
      toast.error((err as ApiError).response?.data?.message ?? 'Erro ao salvar dados pessoais.');
    } finally {
      setSavingPersonal(false);
    }
  };

  const savePassword = async () => {
    if (!client.id) return;
    if (passwords.new !== passwords.confirm) { toast.error('As senhas não conferem.'); return; }
    if (passwords.new.length < 8) { toast.error('A nova senha deve ter pelo menos 8 caracteres.'); return; }
    setSavingPassword(true);
    try {
      await apiClient.post(`/users/${client.id}/change-password`, {
        current_password: passwords.current,
        new_password: passwords.new,
        new_password_confirmation: passwords.confirm,
      });
      toast.success('Senha alterada com sucesso!');
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (err: unknown) {
      toast.error((err as ApiError).response?.data?.message ?? 'Senha atual incorreta.');
    } finally {
      setSavingPassword(false);
    }
  };

  const sendResetCode = async () => {
    if (!client.email) return;
    setSendingCode(true);
    try {
      await apiClient.post('/auth/forgot-password', { email: client.email });
      toast.success(`Código enviado para ${client.email}`);
      setPasswordMode('forgot-verify');
    } catch (err: unknown) {
      toast.error((err as ApiError).response?.data?.message ?? 'Erro ao enviar código.');
    } finally {
      setSendingCode(false);
    }
  };

  const resetPasswordWithCode = async () => {
    if (resetPwd.new !== resetPwd.confirm) { toast.error('As senhas não conferem.'); return; }
    if (resetPwd.new.length < 8) { toast.error('A nova senha deve ter pelo menos 8 caracteres.'); return; }
    if (resetCode.length !== 6) { toast.error('Digite o código de 6 dígitos.'); return; }
    setResettingPassword(true);
    try {
      await apiClient.post('/auth/reset-password', {
        email: client.email,
        code: resetCode,
        password: resetPwd.new,
        password_confirmation: resetPwd.confirm,
      });
      toast.success('Senha redefinida com sucesso!');
      setPasswordMode('change');
      setResetCode('');
      setResetPwd({ new: '', confirm: '' });
    } catch (err: unknown) {
      toast.error((err as ApiError).response?.data?.message ?? 'Código inválido ou expirado.');
    } finally {
      setResettingPassword(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (imageToCrop) URL.revokeObjectURL(imageToCrop);
    setImageToCrop(URL.createObjectURL(file));
    setCropModalOpen(true);
    e.target.value = '';
  };

  const handleCropConfirm = async (blob: Blob) => {
    if (!client.id) return;
    setCropModalOpen(false);
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('profile_picture', blob, 'avatar.jpg');
      const { data } = await apiClient.post(
        `/users/${client.id}/upload-profile-picture`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      const path = data?.data?.profile_picture_path ?? data?.profile_picture_path ?? '';
      if (path) updateUserAvatarPath(path);
      setLocalAvatarPreview(URL.createObjectURL(blob));
      toast.success('Foto atualizada com sucesso!');
    } catch {
      toast.error('Erro ao fazer upload da foto.');
    } finally {
      setUploadingPhoto(false);
      if (imageToCrop) URL.revokeObjectURL(imageToCrop);
      setImageToCrop('');
    }
  };

  // ─── Address: CEP auto-fill via ViaCEP ───────────────────────────────────
  const fetchCepData = async (rawCep: string) => {
    const digits = rawCep.replace(/\D/g, '');
    if (digits.length !== 8) return;
    setFetchingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) { toast.error('CEP não encontrado.'); return; }
      setAddressForm(prev => ({
        ...prev,
        zip_code: formatCep(digits),
        street: data.logradouro ?? prev.street,
        neighborhood: data.bairro ?? prev.neighborhood,
        city: data.localidade ?? prev.city,
        state: data.uf ?? prev.state,
      }));
    } catch {
      toast.error('Erro ao buscar CEP.');
    } finally {
      setFetchingCep(false);
    }
  };

  const handleCepChange = (value: string) => {
    const formatted = formatCep(value);
    handleAddressFormChange('zip_code', formatted);
    const digits = formatted.replace(/\D/g, '');
    if (digits.length === 8) fetchCepData(digits);
  };

  // ─── Address: Geolocation + Nominatim reverse geocoding ──────────────────
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocalização não suportada pelo seu navegador.');
      return;
    }
    setFetchingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
            { headers: { 'Accept-Language': 'pt-BR' } }
          );
          const data = await res.json();
          const addr = data.address ?? {};
          const street = addr.road ?? addr.street ?? '';
          const number = addr.house_number ?? '';
          const neighborhood = addr.suburb ?? addr.neighbourhood ?? addr.quarter ?? '';
          const city = addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? '';
          const state = normalizeState(addr.state_code ?? addr.state ?? '');
          const zip_code = formatCep(addr.postcode?.replace('-', '') ?? '');
          setAddressForm(prev => ({
            ...prev,
            street,
            number,
            neighborhood,
            city,
            state,
            zip_code,
            latitude,
            longitude,
          }));
          toast.success('Localização obtida com sucesso!');
        } catch {
          toast.error('Não foi possível converter a localização em endereço.');
        } finally {
          setFetchingLocation(false);
        }
      },
      () => {
        toast.error('Permissão de localização negada ou indisponível.');
        setFetchingLocation(false);
      },
      { timeout: 10000 }
    );
  };

  // ─── Address: CRUD ────────────────────────────────────────────────────────
  const startAddAddress = () => {
    setAddressForm(emptyAddress);
    setEditingAddressId(null);
    setShowAddressForm(true);
  };

  const startEditAddress = (address: AddressEntry) => {
    setAddressForm({ ...address });
    setEditingAddressId(address.id ?? null);
    setShowAddressForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelAddressForm = () => {
    setShowAddressForm(false);
    setEditingAddressId(null);
    setAddressForm(emptyAddress);
  };

  const submitAddressForm = async () => {
    const { street, number, neighborhood, city, state, zip_code } = addressForm;
    if (!street || !number || !neighborhood || !city || !state || !zip_code) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    setSavingAddress(true);
    try {
      const payload = {
        street: addressForm.street,
        number: addressForm.number,
        complement: addressForm.complement || undefined,
        neighborhood: addressForm.neighborhood,
        city: addressForm.city,
        state: normalizeState(addressForm.state),
        zip_code: addressForm.zip_code.replace(/\D/g, ''),
        latitude: addressForm.latitude ?? undefined,
        longitude: addressForm.longitude ?? undefined,
      };
      if (editingAddressId) {
        await apiClient.put(`/addresses/${editingAddressId}`, payload);
        toast.success('Endereço atualizado!');
      } else {
        await apiClient.post('/addresses', payload);
        toast.success('Endereço adicionado!');
      }
      cancelAddressForm();
      loadAddresses();
    } catch (err: unknown) {
      toast.error((err as ApiError).response?.data?.message ?? 'Erro ao salvar endereço.');
    } finally {
      setSavingAddress(false);
    }
  };

  const deleteAddress = async (id: number) => {
    setDeletingAddressId(id);
    try {
      await apiClient.delete(`/addresses/${id}`);
      toast.success('Endereço removido.');
      setAddresses(prev => prev.filter(a => a.id !== id));
    } catch (err: unknown) {
      toast.error((err as ApiError).response?.data?.message ?? 'Erro ao remover endereço.');
    } finally {
      setDeletingAddressId(null);
    }
  };

  const setDefaultAddress = async (id: number) => {
    try {
      await apiClient.post(`/addresses/${id}/set-default`);
      toast.success('Endereço padrão atualizado!');
      loadAddresses();
    } catch (err: unknown) {
      toast.error((err as ApiError).response?.data?.message ?? 'Erro ao definir endereço padrão.');
    }
  };

  const isPJ = client.person_type === 'pj';
  const avatarUrl = localAvatarPreview || storageUrl(userAvatarPath);
  const initials = client.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gradient-primary">Meu Perfil</h1>
          <p className="text-muted-foreground">Gerencie suas informações pessoais e configurações</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-auto gap-1">
            <TabsTrigger value="personal" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2.5 text-xs sm:text-sm">
              <User size={16} className="shrink-0" />
              <span className="md:hidden">Dados</span>
              <span className="hidden md:inline">Dados Pessoais</span>
            </TabsTrigger>
            <TabsTrigger value="address" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2.5 text-xs sm:text-sm">
              <MapPin size={16} className="shrink-0" />
              <span>Endereços</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2.5 text-xs sm:text-sm">
              <Lock size={16} className="shrink-0" />
              <span>Segurança</span>
            </TabsTrigger>
          </TabsList>

          {/* Personal Data */}
          <TabsContent value="personal" className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Informações Pessoais</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                {/* Photo */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar
                      className="w-20 h-20 cursor-pointer ring-2 ring-transparent hover:ring-primary transition-all"
                      onClick={() => avatarUrl && setPhotoModalOpen(true)}
                    >
                      <AvatarImage src={avatarUrl} />
                      <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                    </Avatar>
                    {uploadingPhoto && (
                      <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                        <Loader2 className="h-5 w-5 text-white animate-spin" />
                      </div>
                    )}
                  </div>

                  <Dialog open={photoModalOpen} onOpenChange={setPhotoModalOpen}>
                    <DialogContent className="flex items-center justify-center bg-black/90 border-none p-0 max-w-sm">
                      <img
                        src={avatarUrl}
                        alt="Foto de perfil"
                        className="w-full h-full rounded-lg object-contain max-h-[80vh]"
                      />
                    </DialogContent>
                  </Dialog>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      className="flex items-center gap-2"
                      disabled={uploadingPhoto}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera size={16} />
                      {uploadingPhoto ? 'Enviando...' : 'Alterar Foto'}
                    </Button>
                    <p className="text-xs text-muted-foreground">JPG ou PNG · máx 2MB</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/jpg"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </div>

                {/* Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input
                      id="name"
                      value={client.name}
                      onChange={(e) => handlePersonalDataChange('name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={client.email}
                      onChange={(e) => handlePersonalDataChange('email', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={client.phone}
                      onChange={(e) => handlePersonalDataChange('phone', e.target.value)}
                    />
                  </div>
                  {isPJ ? (
                    <div className="space-y-2">
                      <Label htmlFor="cnpj">CNPJ</Label>
                      <Input id="cnpj" value={client.cnpj} disabled />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="cpf">CPF</Label>
                      <Input id="cpf" value={client.cpf} disabled />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="birthDate">Data de Nascimento</Label>
                    <Input
                      id="birthDate"
                      type="date"
                      value={client.birthDate}
                      onChange={(e) => handlePersonalDataChange('birthDate', e.target.value)}
                    />
                  </div>
                </div>

                <Button onClick={savePersonalData} disabled={savingPersonal} className="flex items-center gap-2">
                  {savingPersonal ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {savingPersonal ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Address Tab */}
          <TabsContent value="address" className="space-y-4">

            {/* Add / Edit Form */}
            {showAddressForm && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-base">
                    {editingAddressId ? 'Editar Endereço' : 'Novo Endereço'}
                  </CardTitle>
                  <Button variant="ghost" size="icon" onClick={cancelAddressForm}>
                    <X size={16} />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">

                  {/* CEP + Geolocation row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="zip_code">
                        CEP <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="zip_code"
                          placeholder="00000-000"
                          value={addressForm.zip_code}
                          onChange={(e) => handleCepChange(e.target.value)}
                          maxLength={9}
                        />
                        {fetchingCep && (
                          <Loader2 size={14} className="absolute right-3 top-3 animate-spin text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    <div className="md:col-span-2 flex items-end">
                      <Button
                        variant="outline"
                        className="flex items-center gap-2 w-full"
                        onClick={getCurrentLocation}
                        disabled={fetchingLocation}
                        type="button"
                      >
                        {fetchingLocation
                          ? <Loader2 size={16} className="animate-spin" />
                          : <Navigation size={16} />}
                        {fetchingLocation ? 'Obtendo localização...' : 'Usar minha localização atual'}
                      </Button>
                    </div>
                  </div>

                  {/* Street + Number */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="street">
                        Rua / Avenida <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="street"
                        value={addressForm.street}
                        onChange={(e) => handleAddressFormChange('street', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="number">
                        Número <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="number"
                        value={addressForm.number}
                        onChange={(e) => handleAddressFormChange('number', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Complement + Neighborhood */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="complement">Complemento</Label>
                      <Input
                        id="complement"
                        placeholder="Apto, Bloco, Casa..."
                        value={addressForm.complement}
                        onChange={(e) => handleAddressFormChange('complement', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="neighborhood">
                        Bairro <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="neighborhood"
                        value={addressForm.neighborhood}
                        onChange={(e) => handleAddressFormChange('neighborhood', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* City + State */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="city">
                        Cidade <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="city"
                        value={addressForm.city}
                        onChange={(e) => handleAddressFormChange('city', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">
                        Estado <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="state"
                        placeholder="SP"
                        value={addressForm.state}
                        maxLength={2}
                        onChange={(e) => handleAddressFormChange('state', e.target.value.toUpperCase())}
                      />
                    </div>
                  </div>

                  {/* Coordinates info */}
                  {addressForm.latitude && addressForm.longitude && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin size={12} />
                      Coordenadas salvas: {Number(addressForm.latitude).toFixed(5)}, {Number(addressForm.longitude).toFixed(5)}
                    </p>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button onClick={submitAddressForm} disabled={savingAddress} className="flex items-center gap-2">
                      {savingAddress ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      {savingAddress ? 'Salvando...' : editingAddressId ? 'Atualizar Endereço' : 'Adicionar Endereço'}
                    </Button>
                    <Button variant="outline" onClick={cancelAddressForm}>Cancelar</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Address List */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle>Meus Endereços</CardTitle>
                {!showAddressForm && (
                  <Button size="sm" onClick={startAddAddress} className="flex items-center gap-2">
                    <Plus size={16} /> Adicionar Endereço
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {loadingAddresses ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={24} className="animate-spin text-muted-foreground" />
                  </div>
                ) : addresses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MapPin size={32} className="mx-auto mb-2 opacity-40" />
                    <p>Nenhum endereço cadastrado.</p>
                    <Button variant="link" className="mt-1" onClick={startAddAddress}>
                      Adicionar meu primeiro endereço
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {addresses.map((address) => (
                      <div
                        key={address.id}
                        className="border rounded-lg p-4 space-y-2 hover:bg-muted/40 transition-colors"
                      >
                        {/* Header row */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <MapPin size={16} className="text-primary shrink-0 mt-0.5" />
                            <span className="font-medium text-sm">
                              {address.street}, {address.number}
                              {address.complement ? ` — ${address.complement}` : ''}
                            </span>
                            {address.is_default && (
                              <Badge variant="secondary" className="text-xs">
                                <Star size={10} className="mr-1" fill="currentColor" /> Padrão
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Sub-info */}
                        <p className="text-sm text-muted-foreground pl-6">
                          {address.neighborhood} · {address.city} / {address.state} · CEP {address.zip_code}
                        </p>

                        {/* Coordinates */}
                        {address.latitude && address.longitude && (
                          <p className="text-xs text-muted-foreground pl-6">
                            📍 {Number(address.latitude).toFixed(5)}, {Number(address.longitude).toFixed(5)}
                          </p>
                        )}

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2 pt-1 pl-6">
                          {!address.is_default && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex items-center gap-1 text-xs h-7"
                              onClick={() => address.id && setDefaultAddress(address.id)}
                            >
                              <Star size={12} /> Definir como padrão
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="outline"
                            className="flex items-center gap-1 text-xs h-7"
                            onClick={() => startEditAddress(address)}
                          >
                            <Pencil size={12} /> Editar
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            className="flex items-center gap-1 text-xs h-7 text-destructive hover:text-destructive"
                            onClick={() => address.id && deleteAddress(address.id)}
                            disabled={deletingAddressId === address.id}
                          >
                            {deletingAddressId === address.id
                              ? <Loader2 size={12} className="animate-spin" />
                              : <Trash2 size={12} />}
                            Remover
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security */}
          <TabsContent value="security" className="space-y-4">

            {/* Mode: change password (default) */}
            {passwordMode === 'change' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Lock size={18} className="text-primary" />
                    <CardTitle>Alterar Senha</CardTitle>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Use sua senha atual para definir uma nova senha.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Senha Atual</Label>
                    <Input id="currentPassword" type="password" value={passwords.current}
                      onChange={(e) => setPasswords(prev => ({ ...prev, current: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nova Senha</Label>
                    <Input id="newPassword" type="password" value={passwords.new}
                      onChange={(e) => setPasswords(prev => ({ ...prev, new: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                    <Input id="confirmPassword" type="password" value={passwords.confirm}
                      onChange={(e) => setPasswords(prev => ({ ...prev, confirm: e.target.value }))} />
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
                    <Button onClick={savePassword} disabled={savingPassword} className="flex items-center gap-2">
                      {savingPassword ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      {savingPassword ? 'Salvando...' : 'Alterar Senha'}
                    </Button>
                    <button
                      type="button"
                      onClick={() => { setPasswordMode('forgot-send'); setPasswords({ current: '', new: '', confirm: '' }); }}
                      className="text-sm text-muted-foreground hover:text-primary underline underline-offset-4 transition-colors text-left"
                    >
                      Não lembro minha senha atual
                    </button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Mode: send code to email */}
            {passwordMode === 'forgot-send' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Mail size={18} className="text-primary" />
                    <CardTitle>Redefinir Senha por E-mail</CardTitle>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Enviaremos um código de 6 dígitos para o seu e-mail cadastrado.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-4 py-3">
                    <Mail size={16} className="text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium">{client.email}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button onClick={sendResetCode} disabled={sendingCode} className="flex items-center gap-2">
                      {sendingCode ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                      {sendingCode ? 'Enviando...' : 'Enviar Código'}
                    </Button>
                    <Button variant="outline" onClick={() => setPasswordMode('change')}>
                      Cancelar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Mode: verify code + new password */}
            {passwordMode === 'forgot-verify' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={18} className="text-primary" />
                    <CardTitle>Verificar Código</CardTitle>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Digite o código de 6 dígitos enviado para <strong>{client.email}</strong>. Válido por 15 minutos.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="resetCode">Código de verificação</Label>
                    <Input
                      id="resetCode"
                      placeholder="000000"
                      value={resetCode}
                      maxLength={6}
                      className="text-center text-2xl font-mono tracking-[0.5em] h-14"
                      onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="resetNewPwd">Nova Senha</Label>
                    <Input id="resetNewPwd" type="password" value={resetPwd.new}
                      onChange={(e) => setResetPwd(prev => ({ ...prev, new: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="resetConfirmPwd">Confirmar Nova Senha</Label>
                    <Input id="resetConfirmPwd" type="password" value={resetPwd.confirm}
                      onChange={(e) => setResetPwd(prev => ({ ...prev, confirm: e.target.value }))} />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <Button onClick={resetPasswordWithCode} disabled={resettingPassword} className="flex items-center gap-2">
                      {resettingPassword ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                      {resettingPassword ? 'Redefinindo...' : 'Redefinir Senha'}
                    </Button>
                    <Button variant="outline" onClick={() => setPasswordMode('forgot-send')} disabled={resettingPassword}>
                      Reenviar Código
                    </Button>
                    <Button variant="ghost" onClick={() => { setPasswordMode('change'); setResetCode(''); setResetPwd({ new: '', confirm: '' }); }} disabled={resettingPassword}>
                      Cancelar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

        </Tabs>
      </div>

      <ImageCropModal
        open={cropModalOpen}
        imageSrc={imageToCrop}
        onClose={() => { setCropModalOpen(false); if (imageToCrop) URL.revokeObjectURL(imageToCrop); setImageToCrop(''); }}
        onCrop={handleCropConfirm}
      />
    </ClientLayout>
  );
}
