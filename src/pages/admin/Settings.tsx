import React, { useState } from 'react';
import { AppLayout } from '@/components/Layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Clock, FileText, Calculator, Palette, CreditCard, Plus, X, Upload } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface CompanySettings {
  name: string;
  logo: string;
  email: string;
  phone: string;
  address: string;
  cnpj: string;
  website: string;
}

interface WorkingHours {
  monday: { start: string; end: string; active: boolean };
  tuesday: { start: string; end: string; active: boolean };
  wednesday: { start: string; end: string; active: boolean };
  thursday: { start: string; end: string; active: boolean };
  friday: { start: string; end: string; active: boolean };
  saturday: { start: string; end: string; active: boolean };
  sunday: { start: string; end: string; active: boolean };
}

interface BusinessRules {
  cancellationPolicy: string;
  minimumRentalDays: number;
  maximumRentalDays: number;
  advanceBookingDays: number;
  securityDeposit: number;
  termsAndConditions: string;
}

interface Fees {
  deliveryFee: number;
  assemblyFee: number;
  lateFeePerDay: number;
  lateFeePercentage: number;
  minimumLateFee: number;
}

interface Variation {
  id: string;
  name: string;
  type: 'color' | 'size' | 'material';
  values: string[];
}

export default function Settings() {
  const [companySettings, setCompanySettings] = useState<CompanySettings>({
    name: 'Aluguel de Festas Premium',
    logo: '',
    email: 'contato@alugueldefestas.com',
    phone: '(11) 99999-9999',
    address: 'Rua das Festas, 123 - São Paulo, SP',
    cnpj: '12.345.678/0001-90',
    website: 'www.alugueldefestas.com'
  });

  const [workingHours, setWorkingHours] = useState<WorkingHours>({
    monday: { start: '08:00', end: '18:00', active: true },
    tuesday: { start: '08:00', end: '18:00', active: true },
    wednesday: { start: '08:00', end: '18:00', active: true },
    thursday: { start: '08:00', end: '18:00', active: true },
    friday: { start: '08:00', end: '18:00', active: true },
    saturday: { start: '08:00', end: '16:00', active: true },
    sunday: { start: '10:00', end: '14:00', active: false }
  });

  const [businessRules, setBusinessRules] = useState<BusinessRules>({
    cancellationPolicy: 'Cancelamentos até 48h antes do evento têm reembolso total. Entre 24h-48h: 50% de reembolso. Menos de 24h: sem reembolso.',
    minimumRentalDays: 1,
    maximumRentalDays: 30,
    advanceBookingDays: 60,
    securityDeposit: 20,
    termsAndConditions: 'Termos e condições gerais do aluguel de produtos para festas e eventos.'
  });

  const [fees, setFees] = useState<Fees>({
    deliveryFee: 50,
    assemblyFee: 100,
    lateFeePerDay: 15,
    lateFeePercentage: 2,
    minimumLateFee: 25
  });

  const [variations, setVariations] = useState<Variation[]>([
    {
      id: '1',
      name: 'Cores',
      type: 'color',
      values: ['Branco', 'Azul', 'Rosa', 'Dourado', 'Prata']
    },
    {
      id: '2',
      name: 'Tamanhos',
      type: 'size',
      values: ['P', 'M', 'G', 'GG']
    }
  ]);

  const [pixKey, setPixKey] = useState('12345678901');
  const [newVariation, setNewVariation] = useState<{name: string; type: 'color' | 'size' | 'material'; values: string[]}>({ name: '', type: 'color', values: [''] });

  const handleSaveCompany = () => {
    toast({
      title: "Configurações da empresa salvas",
      description: "As informações da empresa foram atualizadas com sucesso."
    });
  };

  const handleSaveWorkingHours = () => {
    toast({
      title: "Horários salvos",
      description: "Os horários de funcionamento foram atualizados."
    });
  };

  const handleSaveBusinessRules = () => {
    toast({
      title: "Regras de negócio salvas",
      description: "As políticas e regras foram atualizadas."
    });
  };

  const handleSaveFees = () => {
    toast({
      title: "Taxas atualizadas",
      description: "As configurações de taxas foram salvas."
    });
  };

  const handleSaveVariations = () => {
    toast({
      title: "Variações salvas",
      description: "As configurações de variações foram atualizadas."
    });
  };

  const handleSavePixKey = () => {
    toast({
      title: "Chave PIX salva",
      description: "A chave PIX foi atualizada com sucesso."
    });
  };

  const addVariation = () => {
    if (newVariation.name && newVariation.values[0]) {
      const variation: Variation = {
        id: Date.now().toString(),
        name: newVariation.name,
        type: newVariation.type,
        values: newVariation.values.filter(v => v.trim() !== '')
      };
      setVariations([...variations, variation]);
      setNewVariation({ name: '', type: 'color', values: [''] });
    }
  };

  const removeVariation = (id: string) => {
    setVariations(variations.filter(v => v.id !== id));
  };

  const updateWorkingHour = (day: keyof WorkingHours, field: 'start' | 'end' | 'active', value: string | boolean) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  const addVariationValue = () => {
    setNewVariation(prev => ({
      ...prev,
      values: [...prev.values, '']
    }));
  };

  const updateVariationValue = (index: number, value: string) => {
    setNewVariation(prev => ({
      ...prev,
      values: prev.values.map((v, i) => i === index ? value : v)
    }));
  };

  const removeVariationValue = (index: number) => {
    setNewVariation(prev => ({
      ...prev,
      values: prev.values.filter((_, i) => i !== index)
    }));
  };

  const dayNames = {
    monday: 'Segunda-feira',
    tuesday: 'Terça-feira',
    wednesday: 'Quarta-feira',
    thursday: 'Quinta-feira',
    friday: 'Sexta-feira',
    saturday: 'Sábado',
    sunday: 'Domingo'
  };

  return (
    <AppLayout userType="admin" userName="Administrador">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie as configurações do sistema e da empresa
          </p>
        </div>

        <Tabs defaultValue="company" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
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
            <TabsTrigger value="variations" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Variações
            </TabsTrigger>
            <TabsTrigger value="payment" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Pagamento
            </TabsTrigger>
          </TabsList>

          <TabsContent value="company">
            <Card>
              <CardHeader>
                <CardTitle>Informações da Empresa</CardTitle>
                <CardDescription>
                  Configure os dados básicos da sua empresa
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Nome da Empresa</Label>
                    <Input
                      id="companyName"
                      value={companySettings.name}
                      onChange={(e) => setCompanySettings(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input
                      id="cnpj"
                      value={companySettings.cnpj}
                      onChange={(e) => setCompanySettings(prev => ({ ...prev, cnpj: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={companySettings.email}
                      onChange={(e) => setCompanySettings(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={companySettings.phone}
                      onChange={(e) => setCompanySettings(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={companySettings.website}
                      onChange={(e) => setCompanySettings(prev => ({ ...prev, website: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Textarea
                    id="address"
                    value={companySettings.address}
                    onChange={(e) => setCompanySettings(prev => ({ ...prev, address: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logo">Logo da Empresa</Label>
                  <div className="flex items-center gap-4">
                    <Button variant="outline" className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Selecionar Logo
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Formatos aceitos: PNG, JPG (máx. 2MB)
                    </span>
                  </div>
                </div>
                <Button onClick={handleSaveCompany}>Salvar Configurações da Empresa</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hours">
            <Card>
              <CardHeader>
                <CardTitle>Horários de Funcionamento</CardTitle>
                <CardDescription>
                  Configure os horários de atendimento e disponibilidade para agendamentos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(workingHours).map(([day, hours]) => (
                  <div key={day} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="w-32">
                      <Label className="font-medium">{dayNames[day as keyof typeof dayNames]}</Label>
                    </div>
                    <Switch
                      checked={hours.active}
                      onCheckedChange={(checked) => updateWorkingHour(day as keyof WorkingHours, 'active', checked)}
                    />
                    {hours.active && (
                      <>
                        <div className="flex items-center gap-2">
                          <Label className="text-sm">Das</Label>
                          <Input
                            type="time"
                            value={hours.start}
                            onChange={(e) => updateWorkingHour(day as keyof WorkingHours, 'start', e.target.value)}
                            className="w-32"
                          />
                          <Label className="text-sm">às</Label>
                          <Input
                            type="time"
                            value={hours.end}
                            onChange={(e) => updateWorkingHour(day as keyof WorkingHours, 'end', e.target.value)}
                            className="w-32"
                          />
                        </div>
                      </>
                    )}
                    {!hours.active && (
                      <Badge variant="secondary">Fechado</Badge>
                    )}
                  </div>
                ))}
                <Button onClick={handleSaveWorkingHours}>Salvar Horários</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rules">
            <Card>
              <CardHeader>
                <CardTitle>Políticas e Regras de Negócio</CardTitle>
                <CardDescription>
                  Configure as regras de cancelamento e políticas da empresa
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="minDays">Período mínimo de aluguel (dias)</Label>
                    <Input
                      id="minDays"
                      type="number"
                      value={businessRules.minimumRentalDays}
                      onChange={(e) => setBusinessRules(prev => ({ ...prev, minimumRentalDays: parseInt(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxDays">Período máximo de aluguel (dias)</Label>
                    <Input
                      id="maxDays"
                      type="number"
                      value={businessRules.maximumRentalDays}
                      onChange={(e) => setBusinessRules(prev => ({ ...prev, maximumRentalDays: parseInt(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="advanceDays">Antecedência máxima para reserva (dias)</Label>
                    <Input
                      id="advanceDays"
                      type="number"
                      value={businessRules.advanceBookingDays}
                      onChange={(e) => setBusinessRules(prev => ({ ...prev, advanceBookingDays: parseInt(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deposit">Caução/Sinal (%)</Label>
                    <Input
                      id="deposit"
                      type="number"
                      value={businessRules.securityDeposit}
                      onChange={(e) => setBusinessRules(prev => ({ ...prev, securityDeposit: parseInt(e.target.value) }))}
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
                    rows={4}
                  />
                </div>
                <Button onClick={handleSaveBusinessRules}>Salvar Políticas</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fees">
            <Card>
              <CardHeader>
                <CardTitle>Configuração de Taxas</CardTitle>
                <CardDescription>
                  Configure as taxas de entrega, montagem e multas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="deliveryFee">Taxa de Entrega (R$)</Label>
                    <Input
                      id="deliveryFee"
                      type="number"
                      step="0.01"
                      value={fees.deliveryFee}
                      onChange={(e) => setFees(prev => ({ ...prev, deliveryFee: parseFloat(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assemblyFee">Taxa de Montagem (R$)</Label>
                    <Input
                      id="assemblyFee"
                      type="number"
                      step="0.01"
                      value={fees.assemblyFee}
                      onChange={(e) => setFees(prev => ({ ...prev, assemblyFee: parseFloat(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lateFeeDay">Multa por atraso (R$/dia)</Label>
                    <Input
                      id="lateFeeDay"
                      type="number"
                      step="0.01"
                      value={fees.lateFeePerDay}
                      onChange={(e) => setFees(prev => ({ ...prev, lateFeePerDay: parseFloat(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lateFeePercent">Multa por atraso (%)</Label>
                    <Input
                      id="lateFeePercent"
                      type="number"
                      step="0.01"
                      value={fees.lateFeePercentage}
                      onChange={(e) => setFees(prev => ({ ...prev, lateFeePercentage: parseFloat(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="minLateFee">Multa mínima por atraso (R$)</Label>
                    <Input
                      id="minLateFee"
                      type="number"
                      step="0.01"
                      value={fees.minimumLateFee}
                      onChange={(e) => setFees(prev => ({ ...prev, minimumLateFee: parseFloat(e.target.value) }))}
                    />
                  </div>
                </div>
                <Button onClick={handleSaveFees}>Salvar Taxas</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="variations">
            <Card>
              <CardHeader>
                <CardTitle>Configuração de Variações</CardTitle>
                <CardDescription>
                  Configure as variações disponíveis para os produtos (cores, tamanhos, materiais)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  {variations.map((variation) => (
                    <div key={variation.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium">{variation.name}</h4>
                          <Badge variant="outline" className="capitalize">{variation.type}</Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeVariation(variation.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {variation.values.map((value, index) => (
                          <Badge key={index} variant="secondary">{value}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Adicionar Nova Variação</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="varName">Nome da Variação</Label>
                      <Input
                        id="varName"
                        value={newVariation.name}
                        onChange={(e) => setNewVariation(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Ex: Cores, Tamanhos"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="varType">Tipo</Label>
                      <Select
                        value={newVariation.type}
                        onValueChange={(value: 'color' | 'size' | 'material') => 
                          setNewVariation(prev => ({ ...prev, type: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="color">Cor</SelectItem>
                          <SelectItem value="size">Tamanho</SelectItem>
                          <SelectItem value="material">Material</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Valores</Label>
                    {newVariation.values.map((value, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          value={value}
                          onChange={(e) => updateVariationValue(index, e.target.value)}
                          placeholder="Digite um valor"
                        />
                        {newVariation.values.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeVariationValue(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={addVariationValue}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Adicionar Valor
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={addVariation}>Adicionar Variação</Button>
                    <Button variant="outline" onClick={handleSaveVariations}>Salvar Todas</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payment">
            <Card>
              <CardHeader>
                <CardTitle>Configurações de Pagamento</CardTitle>
                <CardDescription>
                  Configure a chave PIX que será exibida para os clientes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="pixKey">Chave PIX</Label>
                  <Input
                    id="pixKey"
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    placeholder="Digite sua chave PIX"
                  />
                  <p className="text-sm text-muted-foreground">
                    Esta chave será exibida para os clientes realizarem pagamentos via PIX
                  </p>
                </div>
                <Button onClick={handleSavePixKey}>Salvar Chave PIX</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}