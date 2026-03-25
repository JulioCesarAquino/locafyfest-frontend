import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  FileText, Download, Loader2, Plus, Star, AlertCircle, CheckCircle2, Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import apiClient from '@/services/apiClient';
import {
  getOrderInvoice, requestInvoice, downloadInvoicePdf,
  type InvoiceAPI, type OrderAPI,
} from '@/modules/admin/orders/services';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface AddressEntry {
  id: number;
  type?: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
  is_default?: boolean;
}

interface ClientProfile {
  cpf: string | null;
  cnpj: string | null;
  company_name: string | null;
  person_type: 'pf' | 'pj' | null;
}

interface Props {
  order: OrderAPI;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const INVOICE_DEADLINE_DAYS = 30;

function isEligible(order: OrderAPI): boolean {
  if (!['confirmed', 'delivered', 'returned'].includes(order.status)) return false;
  const created = new Date(order.created_at);
  const deadline = new Date(created);
  deadline.setDate(deadline.getDate() + INVOICE_DEADLINE_DAYS);
  return new Date() <= deadline;
}

function formatAddress(a: AddressEntry): string {
  return `${a.street}, ${a.number}${a.complement ? ` - ${a.complement}` : ''}, ${a.neighborhood}, ${a.city}/${a.state}`;
}

const STATUS_CONFIG = {
  requested: { label: 'Solicitada — Aguardando emissão', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  processing: { label: 'Em emissão', color: 'bg-blue-100 text-blue-800', icon: Loader2 },
  issued: { label: 'Disponível para download', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
};

// ─── Component ─────────────────────────────────────────────────────────────────

export function InvoiceSection({ order }: Props) {
  const [invoice, setInvoice] = useState<InvoiceAPI | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Modal fiscal data (step 1)
  const [showFiscalModal, setShowFiscalModal] = useState(false);
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [cpfInput, setCpfInput] = useState('');
  const [cnpjInput, setCnpjInput] = useState('');
  const [companyInput, setCompanyInput] = useState('');

  // Modal address (step 2)
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addresses, setAddresses] = useState<AddressEntry[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [loadingAddresses, setLoadingAddresses] = useState(false);

  // New address inline
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [newAddr, setNewAddr] = useState({ street: '', number: '', complement: '', neighborhood: '', city: '', state: '', zip_code: '' });
  const [savingAddress, setSavingAddress] = useState(false);

  // ── Load invoice on mount ──────────────────────────────────────────────────
  useEffect(() => {
    getOrderInvoice(order.id)
      .then(setInvoice)
      .catch(() => {}) // 404 = no invoice yet, that's fine
      .finally(() => setLoading(false));
  }, [order.id]);

  // ── Load profile + addresses when first modal opens ───────────────────────
  async function loadProfileAndAddresses() {
    const [profileRes, addrRes] = await Promise.all([
      apiClient.get('/auth/me'),
      apiClient.get('/addresses'),
    ]);
    const p = profileRes.data?.data ?? profileRes.data;
    setProfile({ cpf: p.cpf, cnpj: p.cnpj, company_name: p.company_name, person_type: p.person_type });
    setCpfInput(p.cpf ?? '');
    setCnpjInput(p.cnpj ?? '');
    setCompanyInput(p.company_name ?? '');

    const list: AddressEntry[] = addrRes.data?.data ?? addrRes.data ?? [];
    setAddresses(list);

    // Pre-select billing address if exists, otherwise default
    const billing = list.find((a) => a.type === 'billing');
    const def = list.find((a) => a.is_default);
    const pre = billing ?? def ?? list[0];
    if (pre) setSelectedAddressId(String(pre.id));

    return p;
  }

  // ── Start flow ────────────────────────────────────────────────────────────
  async function handleStart() {
    setLoadingAddresses(true);
    try {
      const p = await loadProfileAndAddresses();
      const isPj = p.person_type === 'pj';
      const hasFiscal = isPj ? !!p.cnpj : !!p.cpf;

      if (!hasFiscal) {
        setShowFiscalModal(true);
      } else {
        setShowAddressModal(true);
      }
    } catch {
      toast.error('Erro ao carregar dados. Tente novamente.');
    } finally {
      setLoadingAddresses(false);
    }
  }

  // ── Confirm fiscal data → go to address ───────────────────────────────────
  function handleFiscalConfirm() {
    const isPj = profile?.person_type === 'pj';
    if (isPj && !cnpjInput.trim()) { toast.error('Informe o CNPJ.'); return; }
    if (!isPj && !cpfInput.trim()) { toast.error('Informe o CPF.'); return; }
    setShowFiscalModal(false);
    setShowAddressModal(true);
  }

  // ── Add new billing address ────────────────────────────────────────────────
  async function handleSaveNewAddress() {
    if (!newAddr.street || !newAddr.number || !newAddr.city || !newAddr.state || !newAddr.zip_code) {
      toast.error('Preencha os campos obrigatórios do endereço.');
      return;
    }
    setSavingAddress(true);
    try {
      const res = await apiClient.post('/addresses', { ...newAddr, type: 'billing' });
      const saved: AddressEntry = res.data?.data ?? res.data;
      setAddresses((prev) => [...prev, saved]);
      setSelectedAddressId(String(saved.id));
      setShowNewAddress(false);
      setNewAddr({ street: '', number: '', complement: '', neighborhood: '', city: '', state: '', zip_code: '' });
      toast.success('Endereço de cobrança adicionado.');
    } catch {
      toast.error('Erro ao salvar endereço.');
    } finally {
      setSavingAddress(false);
    }
  }

  // ── Submit invoice request ────────────────────────────────────────────────
  async function handleSubmitRequest() {
    if (!selectedAddressId) { toast.error('Selecione um endereço de cobrança.'); return; }
    const isPj = profile?.person_type === 'pj';

    setSubmitting(true);
    try {
      const payload: Record<string, string | number | undefined> = {
        billing_address_id: parseInt(selectedAddressId, 10),
      };

      if (isPj && cnpjInput !== (profile?.cnpj ?? '')) payload.cnpj_override = cnpjInput;
      if (isPj && companyInput !== (profile?.company_name ?? '')) payload.company_name_override = companyInput;
      if (!isPj && cpfInput !== (profile?.cpf ?? '')) payload.cpf_override = cpfInput;

      const created = await requestInvoice(order.id, payload);
      setInvoice(created);
      setShowAddressModal(false);
      toast.success('Solicitação de nota fiscal enviada com sucesso!');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erro ao solicitar nota fiscal.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return null;

  const eligible = isEligible(order);

  // Pedido não elegível e sem NF: não exibe nada
  if (!invoice && !eligible) return null;

  const statusCfg = invoice ? STATUS_CONFIG[invoice.status] : null;
  const StatusIcon = statusCfg?.icon ?? FileText;

  return (
    <>
      <div className="border-t pt-4">
        <h4 className="font-medium flex items-center gap-2 mb-3">
          <FileText size={15} />
          Nota Fiscal
        </h4>

        {!invoice && eligible && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleStart}
            disabled={loadingAddresses}
          >
            {loadingAddresses
              ? <Loader2 size={14} className="animate-spin mr-1.5" />
              : <FileText size={14} className="mr-1.5" />}
            Solicitar Nota Fiscal
          </Button>
        )}

        {invoice && (
          <div className="space-y-3">
            <Badge className={cn('text-xs', statusCfg?.color)}>
              <StatusIcon size={12} className="mr-1" />
              {statusCfg?.label}
            </Badge>

            {invoice.status === 'issued' && (
              <div className="space-y-2">
                {invoice.access_key && (
                  <p className="text-xs text-muted-foreground font-mono break-all">
                    Chave: {invoice.access_key}
                  </p>
                )}
                <Button
                  size="sm"
                  onClick={() => window.open(downloadInvoicePdf(order.id), '_blank')}
                >
                  <Download size={14} className="mr-1.5" />
                  Baixar PDF da NF
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modal Step 1: Dados Fiscais ────────────────────────────────────── */}
      <Dialog open={showFiscalModal} onOpenChange={setShowFiscalModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle size={18} className="text-yellow-500" />
              Dados para a Nota Fiscal
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            Confirme seus dados fiscais. Você pode alterá-los apenas para esta nota.
          </p>

          <div className="space-y-4">
            {profile?.person_type === 'pj' ? (
              <>
                <div className="space-y-1">
                  <Label>CNPJ *</Label>
                  <Input
                    value={cnpjInput}
                    onChange={(e) => setCnpjInput(e.target.value)}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Razão Social</Label>
                  <Input
                    value={companyInput}
                    onChange={(e) => setCompanyInput(e.target.value)}
                    placeholder="Nome da empresa"
                  />
                </div>
              </>
            ) : (
              <div className="space-y-1">
                <Label>CPF *</Label>
                <Input
                  value={cpfInput}
                  onChange={(e) => setCpfInput(e.target.value)}
                  placeholder="000.000.000-00"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFiscalModal(false)}>Cancelar</Button>
            <Button onClick={handleFiscalConfirm}>Continuar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal Step 2: Endereço de Cobrança ────────────────────────────── */}
      <Dialog open={showAddressModal} onOpenChange={setShowAddressModal}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Endereço para a Nota Fiscal</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            Selecione ou adicione o endereço de cobrança para esta nota fiscal.
          </p>

          {addresses.length > 0 && (
            <RadioGroup value={selectedAddressId} onValueChange={setSelectedAddressId} className="space-y-2">
              {[...addresses].sort((a) => (a.type === 'billing' ? -1 : 1)).map((a) => (
                <div
                  key={a.id}
                  className={cn(
                    'flex items-start gap-3 border rounded-md p-3 cursor-pointer transition-colors',
                    selectedAddressId === String(a.id) ? 'border-primary bg-primary/5' : 'hover:bg-muted/50',
                  )}
                  onClick={() => setSelectedAddressId(String(a.id))}
                >
                  <RadioGroupItem value={String(a.id)} id={`inv-addr-${a.id}`} className="mt-0.5" />
                  <label htmlFor={`inv-addr-${a.id}`} className="cursor-pointer flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {a.type === 'billing' && (
                        <Badge variant="secondary" className="text-xs">Cobrança</Badge>
                      )}
                      {a.is_default && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />}
                      <span className="text-sm font-medium">{a.street}, {a.number}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatAddress(a)}</p>
                  </label>
                </div>
              ))}
            </RadioGroup>
          )}

          {/* Add new billing address */}
          {!showNewAddress ? (
            <button
              type="button"
              className="flex items-center gap-2 text-sm text-muted-foreground border border-dashed rounded-md p-3 w-full hover:bg-muted/50 transition-colors"
              onClick={() => setShowNewAddress(true)}
            >
              <Plus size={14} />
              Adicionar endereço de cobrança
            </button>
          ) : (
            <div className="border rounded-md p-4 space-y-3">
              <p className="text-sm font-medium">Novo endereço de cobrança</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Logradouro *</Label>
                  <Input value={newAddr.street} onChange={(e) => setNewAddr((p) => ({ ...p, street: e.target.value }))} placeholder="Rua / Av." />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Número *</Label>
                  <Input value={newAddr.number} onChange={(e) => setNewAddr((p) => ({ ...p, number: e.target.value }))} placeholder="Nº" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Complemento</Label>
                  <Input value={newAddr.complement} onChange={(e) => setNewAddr((p) => ({ ...p, complement: e.target.value }))} placeholder="Apto, Bloco..." />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Bairro</Label>
                  <Input value={newAddr.neighborhood} onChange={(e) => setNewAddr((p) => ({ ...p, neighborhood: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1 space-y-1">
                  <Label className="text-xs">CEP *</Label>
                  <Input value={newAddr.zip_code} onChange={(e) => setNewAddr((p) => ({ ...p, zip_code: e.target.value }))} placeholder="00000-000" />
                </div>
                <div className="col-span-1 space-y-1">
                  <Label className="text-xs">Cidade *</Label>
                  <Input value={newAddr.city} onChange={(e) => setNewAddr((p) => ({ ...p, city: e.target.value }))} />
                </div>
                <div className="col-span-1 space-y-1">
                  <Label className="text-xs">Estado *</Label>
                  <Input value={newAddr.state} onChange={(e) => setNewAddr((p) => ({ ...p, state: e.target.value }))} placeholder="SP" maxLength={2} />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setShowNewAddress(false)}>Cancelar</Button>
                <Button size="sm" onClick={handleSaveNewAddress} disabled={savingAddress}>
                  {savingAddress ? <Loader2 size={13} className="animate-spin mr-1" /> : null}
                  Salvar
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddressModal(false)}>Cancelar</Button>
            <Button onClick={handleSubmitRequest} disabled={submitting || !selectedAddressId}>
              {submitting ? <Loader2 size={14} className="animate-spin mr-1.5" /> : null}
              Solicitar Nota Fiscal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
