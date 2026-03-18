import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/Layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Clock, FileText, Calculator, Upload, Navigation, Loader2, MapPin } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  getFeeSettings, saveFeeSettings,
  getCompanyInfo, saveCompanyInfo,
  getWorkingHours, saveWorkingHours,
  getBusinessRules, saveBusinessRules,
  DEFAULT_COMPANY, DEFAULT_WORKING_HOURS, DEFAULT_BUSINESS_RULES, DEFAULT_FEES,
  type CompanyInfo, type WorkingHoursSettings, type BusinessRulesSettings, type FeeSettings,
} from '@/services/settings';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

const DAY_NAMES: Record<keyof WorkingHoursSettings, string> = {
  monday:    'Segunda-feira',
  tuesday:   'Terça-feira',
  wednesday: 'Quarta-feira',
  thursday:  'Quinta-feira',
  friday:    'Sexta-feira',
  saturday:  'Sábado',
  sunday:    'Domingo',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function Settings() {
  const [company, setCompany] = useState<CompanyInfo>({ ...DEFAULT_COMPANY, address: { ...DEFAULT_COMPANY.address } });
  const [workingHours, setWorkingHours] = useState<WorkingHoursSettings>(structuredClone(DEFAULT_WORKING_HOURS));
  const [businessRules, setBusinessRules] = useState<BusinessRulesSettings>({ ...DEFAULT_BUSINESS_RULES });
  const [fees, setFees] = useState<FeeSettings>({ ...DEFAULT_FEES });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchingCep, setFetchingCep] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [c, wh, br, f] = await Promise.all([
          getCompanyInfo(),
          getWorkingHours(),
          getBusinessRules(),
          getFeeSettings(),
        ]);
        setCompany(c);
        setWorkingHours(wh);
        setBusinessRules(br);
        setFees(f);
      } catch {
        toast({ title: 'Erro ao carregar configurações', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ─── Company ──────────────────────────────────────────────────────────────

  const setAddr = (field: keyof CompanyInfo['address'], value: string | number | null) =>
    setCompany(prev => ({ ...prev, address: { ...prev.address, [field]: value } }));

  const fetchCepData = async (rawCep: string) => {
    const digits = rawCep.replace(/\D/g, '');
    if (digits.length !== 8) return;
    setFetchingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) {
        toast({ title: 'CEP não encontrado.', variant: 'destructive' });
        return;
      }
      setCompany(prev => ({
        ...prev,
        address: {
          ...prev.address,
          zip_code: formatCep(digits),
          street: data.logradouro ?? prev.address.street,
          neighborhood: data.bairro ?? prev.address.neighborhood,
          city: data.localidade ?? prev.address.city,
          state: data.uf ?? prev.address.state,
        },
      }));
    } catch {
      toast({ title: 'Erro ao buscar CEP.', variant: 'destructive' });
    } finally {
      setFetchingCep(false);
    }
  };

  const handleCepChange = (value: string) => {
    const formatted = formatCep(value);
    setAddr('zip_code', formatted);
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
      async ({ coords }) => {
        const { latitude, longitude } = coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
            { headers: { 'Accept-Language': 'pt-BR' } },
          );
          const data = await res.json();
          const addr = data.address ?? {};
          setCompany(prev => ({
            ...prev,
            address: {
              ...prev.address,
              street: addr.road ?? addr.street ?? prev.address.street,
              number: addr.house_number ?? prev.address.number,
              neighborhood: addr.suburb ?? addr.neighbourhood ?? addr.quarter ?? prev.address.neighborhood,
              city: addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? prev.address.city,
              state: normalizeState(addr.state_code ?? addr.state ?? prev.address.state),
              zip_code: formatCep((addr.postcode ?? '').replace('-', '')) || prev.address.zip_code,
              latitude,
              longitude,
            },
          }));
          toast({ title: 'Localização obtida', description: 'Endereço e coordenadas atualizados.' });
        } catch {
          // Still save coordinates even if reverse geocoding fails
          setAddr('latitude', latitude);
          setAddr('longitude', longitude);
          toast({ title: 'Coordenadas obtidas', description: 'Não foi possível converter em endereço.' });
        } finally {
          setFetchingLocation(false);
        }
      },
      () => {
        toast({ title: 'Permissão negada ou localização indisponível.', variant: 'destructive' });
        setFetchingLocation(false);
      },
      { timeout: 10000 },
    );
  };

  const handleSaveCompany = async () => {
    const saved = { ...company, address: { ...company.address, state: normalizeState(company.address.state) } };
    setSaving(true);
    try {
      await saveCompanyInfo(saved);
      setCompany(saved);
      toast({ title: 'Empresa salva', description: 'Dados da empresa atualizados com sucesso.' });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ title: 'Erro ao salvar', description: msg ?? 'Tente novamente.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ─── Working hours ────────────────────────────────────────────────────────

  const updateDay = (day: keyof WorkingHoursSettings, field: 'start' | 'end' | 'active', value: string | boolean) =>
    setWorkingHours(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }));

  const handleSaveWorkingHours = async () => {
    setSaving(true);
    try {
      await saveWorkingHours(workingHours);
      toast({ title: 'Horários salvos', description: 'Horários de funcionamento atualizados.' });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ title: 'Erro ao salvar', description: msg ?? 'Tente novamente.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ─── Business rules ───────────────────────────────────────────────────────

  const handleSaveBusinessRules = async () => {
    setSaving(true);
    try {
      await saveBusinessRules(businessRules);
      toast({ title: 'Políticas salvas', description: 'Regras de negócio atualizadas.' });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ title: 'Erro ao salvar', description: msg ?? 'Tente novamente.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ─── Fees ─────────────────────────────────────────────────────────────────

  const handleSaveFees = async () => {
    setSaving(true);
    try {
      await saveFeeSettings(fees);
      toast({ title: 'Taxas salvas', description: 'Configurações de taxas atualizadas.' });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ title: 'Erro ao salvar', description: msg ?? 'Tente novamente.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">Gerencie as configurações do sistema e da empresa</p>
        </div>

        <Tabs defaultValue="company" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="company" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Empresa
            </TabsTrigger>
            <TabsTrigger value="hours" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Horários
            </TabsTrigger>
            <TabsTrigger value="rules" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Políticas
            </TabsTrigger>
            <TabsTrigger value="fees" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Taxas
            </TabsTrigger>
          </TabsList>

          {/* ── Empresa ── */}
          <TabsContent value="company">
            <Card>
              <CardHeader>
                <CardTitle>Informações da Empresa</CardTitle>
                <CardDescription>Configure os dados cadastrais e o endereço da loja</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                {/* Dados cadastrais */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Nome da Empresa</Label>
                    <Input
                      id="companyName"
                      value={company.name}
                      onChange={(e) => setCompany(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input
                      id="cnpj"
                      placeholder="00.000.000/0001-00"
                      value={company.cnpj}
                      onChange={(e) => setCompany(prev => ({ ...prev, cnpj: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyEmail">E-mail</Label>
                    <Input
                      id="companyEmail"
                      type="email"
                      value={company.email}
                      onChange={(e) => setCompany(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyPhone">Telefone</Label>
                    <Input
                      id="companyPhone"
                      value={company.phone}
                      onChange={(e) => setCompany(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={company.website}
                      onChange={(e) => setCompany(prev => ({ ...prev, website: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Logo da Empresa</Label>
                  <div className="flex items-center gap-4">
                    <Button variant="outline" className="flex items-center gap-2" type="button">
                      <Upload className="h-4 w-4" />
                      Selecionar Logo
                    </Button>
                    <span className="text-sm text-muted-foreground">Formatos aceitos: PNG, JPG (máx. 2MB)</span>
                  </div>
                </div>

                <Separator />

                {/* Endereço */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin className="h-4 w-4 text-primary" />
                    <h4 className="font-medium">Endereço da Loja</h4>
                  </div>

                  {/* CEP + botão de localização */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="space-y-2">
                      <Label htmlFor="zip_code">CEP</Label>
                      <div className="relative">
                        <Input
                          id="zip_code"
                          placeholder="00000-000"
                          value={company.address.zip_code}
                          onChange={(e) => handleCepChange(e.target.value)}
                          maxLength={9}
                        />
                        {fetchingCep && (
                          <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    <div className="md:col-span-2 flex items-end">
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        className="flex items-center gap-2"
                        onClick={getCurrentLocation}
                        disabled={fetchingLocation}
                      >
                        {fetchingLocation
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Navigation className="h-4 w-4" />}
                        {fetchingLocation ? 'Obtendo...' : 'Usar localização atual'}
                      </Button>
                    </div>
                  </div>

                  {/* Rua + Número */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="street">Rua / Avenida</Label>
                      <Input
                        id="street"
                        value={company.address.street}
                        onChange={(e) => setAddr('street', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="number">Número</Label>
                      <Input
                        id="number"
                        value={company.address.number}
                        onChange={(e) => setAddr('number', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Complemento + Bairro */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <Label htmlFor="complement">Complemento</Label>
                      <Input
                        id="complement"
                        placeholder="Sala, Galpão, Bloco..."
                        value={company.address.complement}
                        onChange={(e) => setAddr('complement', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="neighborhood">Bairro</Label>
                      <Input
                        id="neighborhood"
                        value={company.address.neighborhood}
                        onChange={(e) => setAddr('neighborhood', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Cidade + Estado */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="city">Cidade</Label>
                      <Input
                        id="city"
                        value={company.address.city}
                        onChange={(e) => setAddr('city', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">Estado (UF)</Label>
                      <Input
                        id="state"
                        placeholder="SP"
                        maxLength={2}
                        value={company.address.state}
                        onChange={(e) => setAddr('state', e.target.value.toUpperCase())}
                      />
                    </div>
                  </div>

                  {/* Coordenadas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="latitude">Latitude</Label>
                      <Input
                        id="latitude"
                        type="number"
                        step="any"
                        placeholder="Ex: -23.5505"
                        value={company.address.latitude ?? ''}
                        onChange={(e) => setAddr('latitude', e.target.value ? parseFloat(e.target.value) : null)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="longitude">Longitude</Label>
                      <Input
                        id="longitude"
                        type="number"
                        step="any"
                        placeholder="Ex: -46.6333"
                        value={company.address.longitude ?? ''}
                        onChange={(e) => setAddr('longitude', e.target.value ? parseFloat(e.target.value) : null)}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    As coordenadas são usadas para calcular a distância de entrega até o cliente.
                  </p>
                </div>

                <Button onClick={handleSaveCompany} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Salvar Informações da Empresa
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Horários ── */}
          <TabsContent value="hours">
            <Card>
              <CardHeader>
                <CardTitle>Horários de Funcionamento</CardTitle>
                <CardDescription>Configure os horários de atendimento e disponibilidade</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(Object.keys(DAY_NAMES) as (keyof WorkingHoursSettings)[]).map((day) => {
                  const hours = workingHours[day];
                  return (
                    <div key={day} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="w-36 shrink-0">
                        <Label className="font-medium">{DAY_NAMES[day]}</Label>
                      </div>
                      <Switch
                        checked={hours.active}
                        onCheckedChange={(checked) => updateDay(day, 'active', checked)}
                      />
                      {hours.active ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <Label className="text-sm text-muted-foreground">Das</Label>
                          <Input
                            type="time"
                            value={hours.start}
                            onChange={(e) => updateDay(day, 'start', e.target.value)}
                            className="w-32"
                          />
                          <Label className="text-sm text-muted-foreground">às</Label>
                          <Input
                            type="time"
                            value={hours.end}
                            onChange={(e) => updateDay(day, 'end', e.target.value)}
                            className="w-32"
                          />
                        </div>
                      ) : (
                        <Badge variant="secondary">Fechado</Badge>
                      )}
                    </div>
                  );
                })}
                <Button onClick={handleSaveWorkingHours} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Salvar Horários
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Políticas ── */}
          <TabsContent value="rules">
            <Card>
              <CardHeader>
                <CardTitle>Políticas e Regras de Negócio</CardTitle>
                <CardDescription>Configure as regras de cancelamento e políticas da empresa</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="minDays">Período mínimo de aluguel (dias)</Label>
                    <Input
                      id="minDays"
                      type="number"
                      min={1}
                      value={businessRules.minimumRentalDays}
                      onChange={(e) => setBusinessRules(prev => ({ ...prev, minimumRentalDays: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxDays">Período máximo de aluguel (dias)</Label>
                    <Input
                      id="maxDays"
                      type="number"
                      min={1}
                      value={businessRules.maximumRentalDays}
                      onChange={(e) => setBusinessRules(prev => ({ ...prev, maximumRentalDays: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="advanceDays">Antecedência máxima para reserva (dias)</Label>
                    <Input
                      id="advanceDays"
                      type="number"
                      min={0}
                      value={businessRules.advanceBookingDays}
                      onChange={(e) => setBusinessRules(prev => ({ ...prev, advanceBookingDays: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deposit">Caução / Sinal (%)</Label>
                    <Input
                      id="deposit"
                      type="number"
                      min={0}
                      max={100}
                      value={businessRules.securityDeposit}
                      onChange={(e) => setBusinessRules(prev => ({ ...prev, securityDeposit: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cancellation">Política de Cancelamento</Label>
                  <Textarea
                    id="cancellation"
                    value={businessRules.cancellationPolicy}
                    onChange={(e) => setBusinessRules(prev => ({ ...prev, cancellationPolicy: e.target.value }))}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="terms">Termos e Condições</Label>
                  <Textarea
                    id="terms"
                    value={businessRules.termsAndConditions}
                    onChange={(e) => setBusinessRules(prev => ({ ...prev, termsAndConditions: e.target.value }))}
                    rows={5}
                  />
                </div>
                <Button onClick={handleSaveBusinessRules} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Salvar Políticas
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Taxas ── */}
          <TabsContent value="fees">
            <Card>
              <CardHeader>
                <CardTitle>Configuração de Taxas</CardTitle>
                <CardDescription>Configure as taxas de entrega, montagem e multas por atraso</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="deliveryFee">Taxa de Entrega (R$)</Label>
                    <Input
                      id="deliveryFee"
                      type="number"
                      step="0.01"
                      min={0}
                      value={fees.deliveryFee}
                      onChange={(e) => setFees(prev => ({ ...prev, deliveryFee: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assemblyFee">Taxa de Montagem (R$)</Label>
                    <Input
                      id="assemblyFee"
                      type="number"
                      step="0.01"
                      min={0}
                      value={fees.assemblyFee}
                      onChange={(e) => setFees(prev => ({ ...prev, assemblyFee: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lateFeeDay">Multa por atraso (R$/dia)</Label>
                    <Input
                      id="lateFeeDay"
                      type="number"
                      step="0.01"
                      min={0}
                      value={fees.lateFeePerDay}
                      onChange={(e) => setFees(prev => ({ ...prev, lateFeePerDay: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lateFeePercent">Multa por atraso (%)</Label>
                    <Input
                      id="lateFeePercent"
                      type="number"
                      step="0.01"
                      min={0}
                      value={fees.lateFeePercentage}
                      onChange={(e) => setFees(prev => ({ ...prev, lateFeePercentage: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="minLateFee">Multa mínima por atraso (R$)</Label>
                    <Input
                      id="minLateFee"
                      type="number"
                      step="0.01"
                      min={0}
                      value={fees.minimumLateFee}
                      onChange={(e) => setFees(prev => ({ ...prev, minimumLateFee: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-1">Raio de Entrega</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Entregas dentro do raio gratuito não cobram frete. Acima do raio máximo, entrega não disponível.
                    A localização de origem é definida na aba <strong>Empresa</strong>.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="freeRadius">Raio gratuito (km)</Label>
                      <Input
                        id="freeRadius"
                        type="number"
                        step="0.5"
                        min={0}
                        value={fees.deliveryFreeRadiusKm}
                        onChange={(e) => setFees(prev => ({ ...prev, deliveryFreeRadiusKm: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxRadius">Raio máximo de entrega (km)</Label>
                      <Input
                        id="maxRadius"
                        type="number"
                        step="0.5"
                        min={0}
                        value={fees.deliveryMaxRadiusKm}
                        onChange={(e) => setFees(prev => ({ ...prev, deliveryMaxRadiusKm: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>
                </div>

                <Button onClick={handleSaveFees} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Salvar Taxas
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
