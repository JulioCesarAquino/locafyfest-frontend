import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AdminInvoiceSection } from './invoice-section';
import { useSearchParams } from 'react-router-dom';
import { APP_NAME, APP_SUBTITLE, PRINT_SHOW_LOGO } from '@/config/app';
import { AppLayout } from '@/components/Layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CalendarIcon, Plus, Search, Package, Users, Clock, Loader2,
  MapPin, Star, PlusCircle, ChevronsUpDown, Check, Navigation,
  ExternalLink, ChevronRight, XCircle, CheckCircle2, Truck, RotateCcw,
  Receipt, Phone, Mail, Hash, Banknote, X, AlertTriangle, Printer,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { type Client, type ClientAddressEntry, type ClientAddress, getClients, getClient, createClientAddress } from '@/modules/admin/clients/services';
import { type ProductAPI, getProducts, checkProductAvailability } from '@/modules/admin/products/services';
import { type OrderAPI, type OrderStatusAction, type ApplyDiscountPayload, getOrders, getOrder, createOrder, performOrderAction, processPayment, updateOrderDeliveryFee, applyOrderDiscount, forceOrderStatus, updatePaymentMethod } from './services';
import { getFeeSettings, getStoreLocation, getBusinessRules, getCompanyInfo, haversineDistance, type FeeSettings, type StoreLocation, type BusinessRulesSettings, type CompanyInfo, DEFAULT_BUSINESS_RULES } from '@/modules/admin/settings/services';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn, formatCurrency } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

// ─── Constants ────────────────────────────────────────────────────────────────

const statusOptions = [
  { value: 'pending',   label: 'Pendente',   color: 'bg-yellow-500' },
  { value: 'confirmed', label: 'Confirmado', color: 'bg-blue-500' },
  { value: 'delivered', label: 'Entregue',   color: 'bg-indigo-500' },
  { value: 'returned',  label: 'Concluído',  color: 'bg-green-500' },
  { value: 'cancelled', label: 'Cancelado',  color: 'bg-red-500' },
];

const paymentStatusConfig: Record<string, { label: string; color: string }> = {
  pending:        { label: 'Não pago',       color: 'bg-muted-foreground/30' },
  paid:           { label: 'Pago',           color: 'bg-green-600' },
  failed:         { label: 'Falhou',         color: 'bg-red-500' },
  refunded:       { label: 'Reembolsado',    color: 'bg-slate-500' },
  partial_refund: { label: 'Reemb. Parcial', color: 'bg-slate-500' },
};

const paymentMethodOptions = [
  { value: 'pix',           label: 'PIX' },
  { value: 'cash',          label: 'Dinheiro' },
  { value: 'bank_transfer', label: 'Transferência Bancária' },
  { value: 'credit_card',   label: 'Cartão de Crédito' },
  { value: 'debit_card',    label: 'Cartão de Débito' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCep(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

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

// ─── Address Form ──────────────────────────────────────────────────────────────

interface AddressFormState {
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
  latitude?: number | null;
  longitude?: number | null;
}

const emptyAddress: AddressFormState = {
  street: '', number: '', complement: '', neighborhood: '', city: '', state: '', zip_code: '',
  latitude: null, longitude: null,
};

interface AddressFormProps {
  value: AddressFormState;
  onChange: (v: AddressFormState) => void;
}

function AddressForm({ value, onChange }: AddressFormProps) {
  const [fetchingCep, setFetchingCep] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);

  const set = (field: keyof AddressFormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    if (field === 'zip_code') {
      const formatted = formatCep(newVal);
      onChange({ ...value, zip_code: formatted });
      const digits = formatted.replace(/\D/g, '');
      if (digits.length === 8) fetchCep(digits, value, onChange, setFetchingCep);
    } else {
      onChange({ ...value, [field]: newVal });
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: 'Erro', description: 'Geolocalização não suportada pelo seu navegador.', variant: 'destructive' });
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
          onChange({
            ...value,
            street: addr.road ?? addr.street ?? value.street,
            number: addr.house_number ?? value.number,
            neighborhood: addr.suburb ?? addr.neighbourhood ?? addr.quarter ?? value.neighborhood,
            city: addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? value.city,
            state: normalizeState(addr.state_code ?? addr.state ?? value.state),
            zip_code: formatCep(addr.postcode?.replace('-', '') ?? value.zip_code),
            latitude,
            longitude,
          });
          toast({ title: 'Localização obtida', description: 'Endereço preenchido com sua localização atual.' });
        } catch {
          toast({ title: 'Erro', description: 'Não foi possível converter a localização em endereço.', variant: 'destructive' });
        } finally {
          setFetchingLocation(false);
        }
      },
      () => {
        toast({ title: 'Erro', description: 'Permissão de localização negada ou indisponível.', variant: 'destructive' });
        setFetchingLocation(false);
      },
      { timeout: 10000 }
    );
  };

  return (
    <div className="space-y-3 border rounded-md p-3 bg-muted/30">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full flex items-center gap-2 text-xs h-8"
        onClick={handleGetLocation}
        disabled={fetchingLocation}
      >
        {fetchingLocation ? <Loader2 className="h-3 w-3 animate-spin" /> : <Navigation className="h-3 w-3" />}
        {fetchingLocation ? 'Obtendo localização...' : 'Usar localização atual'}
      </Button>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1 col-span-2 sm:col-span-1">
          <Label className="text-xs">CEP *</Label>
          <div className="relative">
            <Input placeholder="00000-000" value={value.zip_code} onChange={set('zip_code')} className="h-8 text-sm pr-7" />
            {fetchingCep && <Loader2 className="h-3 w-3 animate-spin absolute right-2 top-2.5 text-muted-foreground" />}
          </div>
        </div>
        <div className="space-y-1 col-span-2 sm:col-span-1">
          <Label className="text-xs">Estado *</Label>
          <Input placeholder="SP" maxLength={2} value={value.state} onChange={set('state')} className="h-8 text-sm uppercase" />
        </div>
        <div className="space-y-1 col-span-2">
          <Label className="text-xs">Rua *</Label>
          <Input placeholder="Nome da rua" value={value.street} onChange={set('street')} className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Número *</Label>
          <Input placeholder="123" value={value.number} onChange={set('number')} className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Complemento</Label>
          <Input placeholder="Apto 1" value={value.complement} onChange={set('complement')} className="h-8 text-sm" />
        </div>
        <div className="space-y-1 col-span-2 sm:col-span-1">
          <Label className="text-xs">Bairro *</Label>
          <Input placeholder="Bairro" value={value.neighborhood} onChange={set('neighborhood')} className="h-8 text-sm" />
        </div>
        <div className="space-y-1 col-span-2 sm:col-span-1">
          <Label className="text-xs">Cidade *</Label>
          <Input placeholder="Cidade" value={value.city} onChange={set('city')} className="h-8 text-sm" />
        </div>
      </div>
    </div>
  );
}

async function fetchCep(
  digits: string,
  currentValue: AddressFormState,
  onChange: (v: AddressFormState) => void,
  setLoading: (v: boolean) => void,
) {
  setLoading(true);
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    const data = await res.json();
    if (data.erro) return;
    onChange({
      ...currentValue,
      zip_code: formatCep(digits),
      // street is intentionally omitted: one CEP can cover multiple streets
      // (e.g. Brasília quadras), so the user must confirm/fill it manually
      neighborhood: data.bairro || currentValue.neighborhood,
      city: data.localidade || currentValue.city,
      state: data.uf || currentValue.state,
    });
  } catch {
    // silently fail
  } finally {
    setLoading(false);
  }
}

// ─── OrderItem state type ──────────────────────────────────────────────────────

interface OrderItem {
  productId: number;
  variationId: number | null;
  quantity: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Orders() {
  const { userType } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'list' | 'new'>('list');
  const [searchTerm, setSearchTerm] = useState('');

  // ── Orders list ─────────────────────────────────────────────────────────────
  const [orders, setOrders] = useState<OrderAPI[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // ── Order detail sheet ───────────────────────────────────────────────────────
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState<OrderAPI | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentMethodLoading, setPaymentMethodLoading] = useState(false);

  const openDetail = async (id: number) => {
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const data = await getOrder(id);
      setDetailOrder(data);
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível carregar o pedido', variant: 'destructive' });
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDeliveryFeeUpdate = async (fee: number) => {
    if (!detailOrder) return;
    try {
      await updateOrderDeliveryFee(detailOrder.id, fee);
      const full = await getOrder(detailOrder.id);
      setDetailOrder(full);
      setOrders((prev) => prev.map((o) => o.id === full.id ? { ...o, total_amount: full.total_amount, delivery_fee: full.delivery_fee } : o));
      toast({ title: 'Frete atualizado', description: fee > 0 ? `Taxa de entrega: ${formatCurrency(fee)}` : 'Frete removido do pedido.' });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível atualizar o frete.', variant: 'destructive' });
    }
  };

  const handlePayment = async (method: string) => {
    if (!detailOrder) return;
    setPaymentLoading(true);
    try {
      const partial = await processPayment(detailOrder.id, method);
      const full = await getOrder(detailOrder.id);
      setDetailOrder(full);
      setOrders((prev) => prev.map((o) => o.id === partial.id ? { ...o, payment_status: partial.payment_status, payment_method: partial.payment_method } : o));
      toast({ title: 'Pagamento registrado', description: `Pedido ${partial.order_number} marcado como pago.` });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ title: 'Erro', description: msg ?? 'Não foi possível registrar o pagamento', variant: 'destructive' });
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleDiscount = async (payload: ApplyDiscountPayload) => {
    if (!detailOrder) return;
    try {
      const updated = await applyOrderDiscount(detailOrder.id, payload);
      const full = await getOrder(detailOrder.id);
      setDetailOrder(full);
      setOrders((prev) => prev.map((o) => o.id === updated.id ? { ...o, total_amount: full.total_amount, discount_amount: full.discount_amount } : o));
      toast({ title: 'Desconto aplicado', description: `Desconto registrado com sucesso.` });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ title: 'Erro', description: msg ?? 'Não foi possível aplicar o desconto', variant: 'destructive' });
    }
  };

  const handleAction = async (action: OrderStatusAction) => {
    if (!detailOrder) return;
    setActionLoading(true);
    const previousStatus = detailOrder.status;
    try {
      const partial = await performOrderAction(detailOrder.id, action);
      const full = await getOrder(detailOrder.id);
      setDetailOrder(full);
      setOrders((prev) => prev.map((o) => o.id === partial.id ? { ...o, status: partial.status } : o));
      toast({ title: 'Status atualizado', description: `Pedido ${partial.order_number} atualizado com sucesso.` });
    } catch (err: unknown) {
      // O backend pode retornar erro por falha em notificações externas (ex: WhatsApp),
      // mas o status do pedido já pode ter sido alterado com sucesso.
      try {
        const full = await getOrder(detailOrder.id);
        if (full.status !== previousStatus) {
          setDetailOrder(full);
          setOrders((prev) => prev.map((o) => o.id === full.id ? { ...o, status: full.status } : o));
          toast({ title: 'Status atualizado', description: `Pedido ${full.order_number} atualizado com sucesso.` });
          return;
        }
      } catch {
        // ignora erro ao buscar pedido, exibe erro original abaixo
      }
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ title: 'Erro', description: msg ?? 'Não foi possível atualizar o status', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdatePaymentMethod = async (method: string) => {
    if (!detailOrder) return;
    setPaymentMethodLoading(true);
    try {
      const full = await updatePaymentMethod(detailOrder.id, method);
      setDetailOrder(full);
      setOrders((prev) => prev.map((o) => o.id === full.id ? { ...o, payment_method: full.payment_method } : o));
      toast({ title: 'Forma de pagamento atualizada', description: `Pedido ${full.order_number} atualizado com sucesso.` });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ title: 'Erro', description: msg ?? 'Não foi possível atualizar a forma de pagamento', variant: 'destructive' });
    } finally {
      setPaymentMethodLoading(false);
    }
  };

  const handleForceStatus = async (status: string) => {
    if (!detailOrder) return;
    setActionLoading(true);
    try {
      const full = await forceOrderStatus(detailOrder.id, status);
      setDetailOrder(full);
      setOrders((prev) => prev.map((o) => o.id === full.id ? { ...o, status: full.status } : o));
      toast({ title: 'Status corrigido', description: `Pedido ${full.order_number} atualizado para "${status}".` });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ title: 'Erro', description: msg ?? 'Não foi possível corrigir o status', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'list') return;
    setOrdersLoading(true);
    getOrders()
      .then(setOrders)
      .catch(() => toast({ title: 'Erro', description: 'Não foi possível carregar os pedidos', variant: 'destructive' }))
      .finally(() => setOrdersLoading(false));
  }, [activeTab]);

  // Abre detalhe do pedido via ?id= (ex: clique em notificação)
  useEffect(() => {
    const orderId = searchParams.get('id');
    if (orderId) openDetail(Number(orderId));
  }, [searchParams]);

  // ── Clients ──────────────────────────────────────────────────────────────────
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);

  useEffect(() => {
    setClientsLoading(true);
    getClients()
      .then(setClients)
      .catch(() => {})
      .finally(() => setClientsLoading(false));
  }, []);

  // ── Products ─────────────────────────────────────────────────────────────────
  const [products, setProducts] = useState<ProductAPI[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productAvailableQty, setProductAvailableQty] = useState<number | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  useEffect(() => {
    setProductsLoading(true);
    getProducts({ include_unavailable: false })
      .then((res) => {
        const list: ProductAPI[] = res.data?.data ?? res.data ?? [];
        setProducts(Array.isArray(list) ? list : []);
      })
      .catch(() => {})
      .finally(() => setProductsLoading(false));
  }, []);

  // ── Client combobox ──────────────────────────────────────────────────────────
  const [clientComboOpen, setClientComboOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState('');

  const filteredClients = clients.filter((c) => {
    const term = clientSearch.toLowerCase();
    if (!term) return true;
    const digits = term.replace(/\D/g, '');
    return (
      (c.name ?? '').toLowerCase().includes(term) ||
      (c.email ?? '').toLowerCase().includes(term) ||
      (digits && (c.phone ?? '').replace(/\D/g, '').includes(digits)) ||
      (digits && (c.cpf ?? '').replace(/\D/g, '').includes(digits)) ||
      (digits && (c.cnpj ?? '').replace(/\D/g, '').includes(digits))
    );
  });

  // ── Client addresses ─────────────────────────────────────────────────────────
  const [clientAddresses, setClientAddresses] = useState<ClientAddressEntry[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState<AddressFormState>(emptyAddress);
  const [savingAddress, setSavingAddress] = useState(false);

  async function loadClientAddresses(clientId: number) {
    setAddressesLoading(true);
    setClientAddresses([]);
    setSelectedAddressId(null);
    setShowAddressForm(false);
    try {
      const data = await getClient(clientId);
      const addrs = data.addresses ?? [];
      setClientAddresses(addrs);
      if (addrs.length > 0) {
        const def = addrs.find((a) => a.is_default) ?? addrs[0];
        setSelectedAddressId(def.id);
      } else {
        setShowAddressForm(true);
      }
    } catch {
      setShowAddressForm(true);
    } finally {
      setAddressesLoading(false);
    }
  }

  // ── Fees & store location ────────────────────────────────────────────────────
  const [fees, setFees] = useState<FeeSettings>({ deliveryFee: 0, assemblyFee: 0, lateFeePerDay: 0, lateFeePercentage: 0, minimumLateFee: 0, deliveryFreeRadiusKm: 0, deliveryMaxRadiusKm: 0 });
  const [storeLocation, setStoreLocation] = useState<StoreLocation>({ latitude: null, longitude: null });
  const [businessRules, setBusinessRules] = useState<BusinessRulesSettings>({ ...DEFAULT_BUSINESS_RULES });
  useEffect(() => {
    getFeeSettings().then(setFees);
    getStoreLocation().then(setStoreLocation);
    getBusinessRules().then(setBusinessRules);
  }, []);
  const [deliveryFeeManual, setDeliveryFeeManual] = useState<number | null>(null);
  const [showNoFreightConfirm, setShowNoFreightConfirm] = useState(false);

  // ── Form state ───────────────────────────────────────────────────────────────
  const [selectedClient, setSelectedClient] = useState('');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedVariation, setSelectedVariation] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [status, setStatus] = useState('pending');
  const [submitting, setSubmitting] = useState(false);

  // ── Discount (create form) ────────────────────────────────────────────────
  const [newDiscountType, setNewDiscountType] = useState<'percentage' | 'fixed'>('fixed');
  const [newDiscountValue, setNewDiscountValue] = useState<string>('');

  // Busca disponibilidade real do produto selecionado para o período do pedido
  useEffect(() => {
    setProductAvailableQty(null);
    if (!selectedProduct || !startDate || !endDate) return;
    setAvailabilityLoading(true);
    const variationId = selectedVariation ? Number(selectedVariation) : null;
    checkProductAvailability(
      Number(selectedProduct),
      format(startDate, 'yyyy-MM-dd'),
      format(endDate, 'yyyy-MM-dd'),
      1,
      variationId,
    )
      .then((data: { available: boolean; available_quantity: number }) => setProductAvailableQty(data.available_quantity))
      .catch(() => setProductAvailableQty(null))
      .finally(() => setAvailabilityLoading(false));
  }, [selectedProduct, selectedVariation, startDate, endDate]);

  // Pre-select client from ?client_id=
  useEffect(() => {
    const clientId = searchParams.get('client_id');
    if (clientId) {
      setSelectedClient(clientId);
      loadClientAddresses(Number(clientId));
      setActiveTab('new');
    }
  }, [searchParams]);

  const handleClientChange = (value: string) => {
    setSelectedClient(value);
    if (value) loadClientAddresses(Number(value));
    else {
      setClientAddresses([]);
      setSelectedAddressId(null);
      setShowAddressForm(false);
    }
  };

  const selectedClientData = clients.find((c) => String(c.id) === selectedClient);

  // ── Products helpers ─────────────────────────────────────────────────────────
  const selectedProductData = products.find((p) => String(p.id) === selectedProduct);
  const selectedVariationData = selectedProductData?.variations.find((v) => String(v.id) === selectedVariation);

  const getProductVariationLabel = (item: OrderItem) => {
    const product = products.find((p) => p.id === item.productId);
    const variation = product?.variations.find((v) => v.id === item.variationId);
    return { product, variation };
  };

  const getItemPrice = (item: OrderItem) => {
    const { product, variation } = getProductVariationLabel(item);
    if (!product) return 0;
    const base = parseFloat(product.price) || 0;
    const modifier = variation ? parseFloat(variation.price_modifier) || 0 : 0;
    return (base + modifier) * item.quantity;
  };

  const calculateTotal = () => orderItems.reduce((sum, item) => sum + getItemPrice(item), 0);

  // ── Fee calculations ──────────────────────────────────────────────────────────
  const selectedAddress = clientAddresses.find((a) => a.id === selectedAddressId) ?? null;
  const storeHasCoords = !!(storeLocation.latitude && storeLocation.longitude);
  const addressHasCoords = !!(selectedAddress?.latitude && selectedAddress?.longitude);

  const distanceKm = useMemo<number | null>(() => {
    if (!storeHasCoords || !addressHasCoords) return null;
    return haversineDistance(
      storeLocation.latitude!,
      storeLocation.longitude!,
      selectedAddress!.latitude!,
      selectedAddress!.longitude!,
    );
  }, [storeLocation, selectedAddress, storeHasCoords, addressHasCoords]);

  // Reset do override ao trocar endereço
  useEffect(() => { setDeliveryFeeManual(null); }, [selectedAddressId]);

  // Sem endereço → sem frete ainda
  // Distância calculada e dentro do raio gratuito → grátis
  // Qualquer outro caso (sem coords ou além do raio) → cobra o frete
  const appliedDeliveryFee = useMemo(() => {
    if (!selectedAddress) return 0;
    if (distanceKm !== null && distanceKm <= fees.deliveryFreeRadiusKm) return 0;
    return fees.deliveryFee;
  }, [selectedAddress, distanceKm, fees]);

  // Valor final: override manual se definido, senão automático
  const finalDeliveryFee = deliveryFeeManual !== null ? deliveryFeeManual : appliedDeliveryFee;

  // Precisa avisar? → frete zerado mas não confirmamos que está dentro do raio gratuito
  const shouldWarnNoFreight =
    finalDeliveryFee === 0 &&
    !!selectedAddress &&
    (distanceKm === null || distanceKm > fees.deliveryFreeRadiusKm);

  const isOutsideDeliveryRange = useMemo(() => {
    if (distanceKm === null) return false;
    return distanceKm > fees.deliveryMaxRadiusKm;
  }, [distanceKm, fees]);

  const needsAssembly = useMemo(
    () => orderItems.some((item) => products.find((p) => p.id === item.productId)?.requires_assembly),
    [orderItems, products],
  );

  const appliedAssemblyFee = needsAssembly ? fees.assemblyFee : 0;

  // ── Add item ─────────────────────────────────────────────────────────────────
  const addItemToOrder = () => {
    if (!selectedProduct) {
      toast({ title: 'Erro', description: 'Selecione um produto', variant: 'destructive' });
      return;
    }
    if (selectedProductData && selectedProductData.variations.length > 0 && !selectedVariation) {
      toast({ title: 'Erro', description: 'Selecione uma variação', variant: 'destructive' });
      return;
    }
    if (quantity < 1) {
      toast({ title: 'Erro', description: 'Quantidade inválida', variant: 'destructive' });
      return;
    }
    if (productAvailableQty !== null && productAvailableQty <= 0) {
      toast({ title: 'Sem estoque', description: 'Produto indisponível para o período selecionado', variant: 'destructive' });
      return;
    }
    if (productAvailableQty !== null && quantity > productAvailableQty) {
      toast({ title: 'Estoque insuficiente', description: `Disponível: ${productAvailableQty} un. para o período selecionado`, variant: 'destructive' });
      return;
    }
    setOrderItems([...orderItems, {
      productId: Number(selectedProduct),
      variationId: selectedVariation ? Number(selectedVariation) : null,
      quantity,
    }]);
    setSelectedProduct('');
    setSelectedVariation('');
    setQuantity(1);
    toast({ title: 'Item adicionado', description: 'Produto adicionado ao pedido' });
  };

  const removeItemFromOrder = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  // ── Save new address ─────────────────────────────────────────────────────────
  const handleSaveNewAddress = async () => {
    const { street, number, neighborhood, city, state, zip_code } = newAddress;
    if (!street || !number || !neighborhood || !city || !state || !zip_code) {
      toast({ title: 'Erro', description: 'Preencha todos os campos obrigatórios do endereço', variant: 'destructive' });
      return;
    }
    if (!selectedClient) {
      toast({ title: 'Erro', description: 'Selecione um cliente primeiro', variant: 'destructive' });
      return;
    }
    setSavingAddress(true);
    try {
      const payload: ClientAddress = {
        street, number,
        complement: newAddress.complement || undefined,
        neighborhood, city,
        state: normalizeState(state),
        zip_code: zip_code.replace(/\D/g, ''),
        latitude: newAddress.latitude ?? undefined,
        longitude: newAddress.longitude ?? undefined,
      };
      const saved = await createClientAddress(Number(selectedClient), payload);
      const entry = saved as ClientAddressEntry;
      setClientAddresses((prev) => [...prev, entry]);
      setSelectedAddressId(entry.id);
      setShowAddressForm(false);
      setNewAddress(emptyAddress);
      toast({ title: 'Endereço salvo', description: 'Endereço adicionado com sucesso' });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível salvar o endereço', variant: 'destructive' });
    } finally {
      setSavingAddress(false);
    }
  };

  // ── Submit order ─────────────────────────────────────────────────────────────
  const handleSubmitOrder = async () => {
    if (!selectedClient) {
      toast({ title: 'Erro', description: 'Selecione um cliente', variant: 'destructive' });
      return;
    }
    if (!selectedAddressId) {
      toast({ title: 'Erro', description: 'Selecione ou cadastre um endereço de entrega', variant: 'destructive' });
      return;
    }
    if (orderItems.length === 0) {
      toast({ title: 'Erro', description: 'Adicione pelo menos um produto', variant: 'destructive' });
      return;
    }
    if (!startDate || !endDate) {
      toast({ title: 'Erro', description: 'Selecione as datas do período', variant: 'destructive' });
      return;
    }
    const orderTotal = calculateTotal() + finalDeliveryFee + appliedAssemblyFee;
    if (businessRules.minimumOrderValue > 0 && orderTotal < businessRules.minimumOrderValue) {
      toast({
        title: 'Valor mínimo não atingido',
        description: `O total do pedido (${formatCurrency(orderTotal)}) é inferior ao mínimo de ${formatCurrency(businessRules.minimumOrderValue)}.`,
        variant: 'destructive',
      });
      return;
    }
    if (isOutsideDeliveryRange) {
      toast({ title: 'Fora do raio de entrega', description: `O endereço está a ${distanceKm?.toFixed(1)} km, além do limite de ${fees.deliveryMaxRadiusKm} km.`, variant: 'destructive' });
      return;
    }
    if (shouldWarnNoFreight) {
      setShowNoFreightConfirm(true);
      return;
    }
    await doSubmitOrder();
  };

  const doSubmitOrder = async () => {
    if (!selectedClient || !selectedAddressId || orderItems.length === 0 || !startDate || !endDate) return;
    setSubmitting(true);
    try {
      const parsedDiscountValue = parseFloat(newDiscountValue.replace(',', '.')) || 0;
      await createOrder({
        client_id: Number(selectedClient),
        delivery_address_id: selectedAddressId,
        items: orderItems.map((i) => ({
          product_id: i.productId,
          product_variation_id: i.variationId,
          quantity: i.quantity,
        })),
        rental_start_date: format(startDate, 'yyyy-MM-dd'),
        rental_end_date: format(endDate, 'yyyy-MM-dd'),
        status,
        delivery_fee: finalDeliveryFee > 0 ? finalDeliveryFee : undefined,
        assembly_fee: appliedAssemblyFee > 0 ? appliedAssemblyFee : undefined,
        discount_type: parsedDiscountValue > 0 ? newDiscountType : undefined,
        discount_value: parsedDiscountValue > 0 ? parsedDiscountValue : undefined,
      });
      toast({ title: 'Pedido criado', description: 'Pedido criado com sucesso!' });
      setSelectedClient('');
      setOrderItems([]);
      setStartDate(undefined);
      setEndDate(undefined);
      setStatus('pending');
      setClientAddresses([]);
      setSelectedAddressId(null);
      setShowAddressForm(false);
      setDeliveryFeeManual(null);
      setNewDiscountValue('');
      setNewDiscountType('fixed');
      setActiveTab('list');
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível criar o pedido', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Status badge ─────────────────────────────────────────────────────────────
  const getStatusBadge = (s: string) => {
    const cfg = statusOptions.find((o) => o.value === s);
    return (
      <Badge variant="secondary" className={cn('text-white text-xs', cfg?.color ?? 'bg-gray-500')}>
        {cfg?.label ?? s}
      </Badge>
    );
  };

// ── Status filter ─────────────────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<string>(
    searchParams.get('status') ?? 'all'
  );

  // ── Filtered orders ──────────────────────────────────────────────────────────
  const filteredOrders = orders.filter((order) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      order.client?.name?.toLowerCase().includes(term) ||
      order.order_number?.toLowerCase().includes(term) ||
      String(order.id).includes(term);
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // ── Orders count per status ───────────────────────────────────────────────────
  const statusCounts = statusOptions.reduce<Record<string, number>>((acc, opt) => {
    acc[opt.value] = orders.filter((o) => o.status === opt.value).length;
    return acc;
  }, {});

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <AppLayout userType="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Pedidos</h1>
            <p className="text-muted-foreground">Gerencie os pedidos de aluguel</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              variant={activeTab === 'list' ? 'default' : 'outline'}
              onClick={() => setActiveTab('list')}
              className="flex items-center gap-2 justify-center"
              size="sm"
            >
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Listar Pedidos</span>
              <span className="sm:hidden">Lista</span>
            </Button>
            <Button
              variant={activeTab === 'new' ? 'default' : 'outline'}
              onClick={() => setActiveTab('new')}
              className="flex items-center gap-2 justify-center"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Novo Pedido</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          </div>
        </div>

        {/* ── LIST TAB ─────────────────────────────────────────────────────── */}
        {activeTab === 'list' && (
          <Card>
            <CardHeader className="space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <CardTitle className="text-lg sm:text-xl">
                  Pedidos
                  {filteredOrders.length !== orders.length && (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      ({filteredOrders.length} de {orders.length})
                    </span>
                  )}
                </CardTitle>
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por cliente ou nº..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-full sm:w-64"
                  />
                </div>
              </div>

              {/* Status filter tabs */}
              <Tabs value={statusFilter} onValueChange={setStatusFilter}>
                <TabsList className="flex-wrap h-auto gap-1">
                  <TabsTrigger value="all">
                    Todos <span className="ml-1.5 text-xs opacity-70">({orders.length})</span>
                  </TabsTrigger>
                  {statusOptions.map((opt) => (
                    <TabsTrigger key={opt.value} value={opt.value}>
                      {opt.label}
                      {statusCounts[opt.value] > 0 && (
                        <span className="ml-1.5 text-xs opacity-70">({statusCounts[opt.value]})</span>
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {ordersLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="min-w-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Nº</TableHead>
                        <TableHead className="min-w-32">Cliente</TableHead>
                        <TableHead className="hidden md:table-cell min-w-48">Itens</TableHead>
                        <TableHead className="hidden xl:table-cell min-w-56">Endereço</TableHead>
                        <TableHead className="hidden lg:table-cell min-w-32">Período</TableHead>
                        <TableHead className="min-w-24">Status</TableHead>
                        <TableHead className="hidden md:table-cell min-w-24">Pagamento</TableHead>
                        <TableHead className="min-w-20 text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                            Nenhum pedido encontrado
                          </TableCell>
                        </TableRow>
                      )}
                      {filteredOrders.map((order) => (
                        <TableRow
                          key={order.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => openDetail(order.id)}
                        >
                          <TableCell className="font-medium text-xs sm:text-sm">
                            #{order.order_number ?? order.id}
                          </TableCell>
                          <TableCell>
                            <div className="text-xs sm:text-sm font-medium">{order.client?.name ?? '—'}</div>
                            {order.client?.phone && (
                              <div className="text-xs text-muted-foreground">{order.client.phone}</div>
                            )}
                            {/* Address summary on small screens */}
                            {(order.delivery_address ?? order.address) && (
                              <div className="xl:hidden flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3 shrink-0" />
                                <span>
                                  {(order.delivery_address ?? order.address)!.city}/
                                  {(order.delivery_address ?? order.address)!.state}
                                </span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {order.items && order.items.length > 0 ? (
                              <div className="space-y-0.5">
                                {order.items.map((item, idx) => (
                                  <div key={idx} className="text-xs sm:text-sm">
                                    {item.quantity}x {item.product?.name ?? item.product_snapshot?.name ?? `Produto #${item.product_id}`}
                                    {item.variation && <span className="text-muted-foreground"> ({item.variation.name})</span>}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden xl:table-cell">
                            {(() => {
                              const addr = order.delivery_address ?? order.address;
                              if (!addr) return <span className="text-muted-foreground text-xs">—</span>;
                              return (
                                <div className="flex items-start gap-1">
                                  <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                                  <div className="text-xs leading-relaxed">
                                    <div className="font-medium">
                                      {addr.street}, {addr.number}
                                      {addr.complement && ` - ${addr.complement}`}
                                    </div>
                                    <div className="text-muted-foreground">{addr.neighborhood}</div>
                                    <div className="text-muted-foreground">
                                      {addr.city}/{addr.state}
                                      {addr.zip_code && ` · CEP ${addr.zip_code}`}
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {order.rental_start_date && (
                              <div className="text-sm">
                                <div>{formatDate(order.rental_start_date)}</div>
                                {order.rental_end_date && (
                                  <div className="text-muted-foreground text-xs">
                                    até {formatDate(order.rental_end_date)}
                                  </div>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(order.status)}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            {order.payment_status === 'paid' ? (
                              <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Pago
                              </span>
                            ) : order.payment_status === 'failed' ? (
                              <span className="flex items-center gap-1 text-xs text-red-500">
                                <XCircle className="h-3.5 w-3.5" /> Falhou
                              </span>
                            ) : (
                              <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-400 px-2 py-0.5 rounded-full">Não pago</span>
                            )}
                          </TableCell>
                          <TableCell className="font-medium text-right text-sm">
                            {formatCurrency(order.total_amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── NEW ORDER TAB ─────────────────────────────────────────────────── */}
        {activeTab === 'new' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {/* Left card: order info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5" />
                  Informações do Pedido
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Client combobox */}
                <div className="space-y-2">
                  <Label>Cliente *</Label>
                  <Popover open={clientComboOpen} onOpenChange={setClientComboOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={clientComboOpen}
                        className="w-full justify-between font-normal"
                      >
                        {clientsLoading ? (
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
                          </span>
                        ) : selectedClientData ? (
                          <span className="truncate">{selectedClientData.name}{selectedClientData.phone ? ` — ${selectedClientData.phone}` : ''}</span>
                        ) : (
                          <span className="text-muted-foreground">Buscar cliente...</span>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-background border-border z-50" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Nome, CPF, CNPJ, e-mail ou telefone..."
                          value={clientSearch}
                          onValueChange={setClientSearch}
                        />
                        <CommandList>
                          {filteredClients.length === 0 && (
                            <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                          )}
                          <CommandGroup>
                            {filteredClients.map((client) => (
                              <CommandItem
                                key={client.id}
                                value={String(client.id)}
                                onSelect={() => {
                                  handleClientChange(String(client.id));
                                  setClientSearch('');
                                  setClientComboOpen(false);
                                }}
                              >
                                <Check className={cn('mr-2 h-4 w-4 shrink-0', selectedClient === String(client.id) ? 'opacity-100' : 'opacity-0')} />
                                <div className="flex flex-col min-w-0">
                                  <span className="font-medium truncate">{client.name}</span>
                                  <span className="text-xs text-muted-foreground truncate">
                                    {[client.phone, client.email, client.cpf ?? client.cnpj].filter(Boolean).join(' · ')}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Address section */}
                {selectedClient && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      Endereço de Entrega *
                    </Label>

                    {addressesLoading && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Carregando endereços...
                      </div>
                    )}

                    {!addressesLoading && clientAddresses.length > 0 && (
                      <div className="space-y-2">
                        <RadioGroup
                          value={selectedAddressId ? String(selectedAddressId) : ''}
                          onValueChange={(v) => {
                            if (v === 'new') {
                              setSelectedAddressId(null);
                              setShowAddressForm(true);
                            } else {
                              setSelectedAddressId(Number(v));
                              setShowAddressForm(false);
                            }
                          }}
                          className="space-y-2"
                        >
                          {clientAddresses.map((addr) => (
                            <div
                              key={addr.id}
                              className={cn(
                                'flex items-start gap-3 border rounded-md p-3 cursor-pointer transition-colors',
                                selectedAddressId === addr.id
                                  ? 'border-primary bg-primary/5'
                                  : 'hover:bg-muted/50'
                              )}
                              onClick={() => {
                                setSelectedAddressId(addr.id);
                                setShowAddressForm(false);
                              }}
                            >
                              <RadioGroupItem value={String(addr.id)} id={`addr-${addr.id}`} className="mt-0.5" />
                              <label htmlFor={`addr-${addr.id}`} className="cursor-pointer flex-1">
                                <div className="text-sm font-medium flex items-center gap-1">
                                  {addr.is_default && (
                                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                  )}
                                  {addr.street}, {addr.number}
                                  {addr.complement && ` - ${addr.complement}`}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {addr.neighborhood} · {addr.city}/{addr.state}
                                  {addr.zip_code && ` · CEP ${addr.zip_code}`}
                                </div>
                              </label>
                            </div>
                          ))}

                          {/* Option to add new address */}
                          <div
                            className={cn(
                              'flex items-center gap-3 border rounded-md p-3 cursor-pointer transition-colors border-dashed',
                              showAddressForm && !selectedAddressId
                                ? 'border-primary bg-primary/5'
                                : 'hover:bg-muted/50'
                            )}
                            onClick={() => {
                              setSelectedAddressId(null);
                              setShowAddressForm(true);
                            }}
                          >
                            <RadioGroupItem value="new" id="addr-new" />
                            <label htmlFor="addr-new" className="cursor-pointer flex items-center gap-1 text-sm">
                              <PlusCircle className="h-4 w-4" />
                              Adicionar novo endereço
                            </label>
                          </div>
                        </RadioGroup>
                      </div>
                    )}

                    {!addressesLoading && clientAddresses.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        Este cliente não possui endereços cadastrados. Cadastre um abaixo.
                      </p>
                    )}

                    {/* Inline address form */}
                    {showAddressForm && (
                      <div className="space-y-3">
                        <AddressForm value={newAddress} onChange={setNewAddress} />
                        <Button
                          size="sm"
                          onClick={handleSaveNewAddress}
                          disabled={savingAddress}
                          className="w-full"
                        >
                          {savingAddress ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Plus className="h-4 w-4 mr-2" />
                          )}
                          Salvar Endereço
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data de Entrega *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn('w-full justify-start text-left font-normal text-sm', !startDate && 'text-muted-foreground')}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-background border-border z-50" align="start">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={(date) => {
                            setStartDate(date);
                            if (date && endDate && endDate < date) setEndDate(undefined);
                          }}
                          locale={ptBR}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>Data de Retirada *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn('w-full justify-start text-left font-normal text-sm', !endDate && 'text-muted-foreground')}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? format(endDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-background border-border z-50" align="start">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          disabled={(date) => !!startDate && date < startDate}
                          locale={ptBR}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border z-50">
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Right card: products */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Package className="h-5 w-5" />
                  Adicionar Produtos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Product select */}
                <div className="space-y-2">
                  <Label>Produto</Label>
                  <Select value={selectedProduct} onValueChange={(v) => { setSelectedProduct(v); setSelectedVariation(''); }}>
                    <SelectTrigger>
                      <SelectValue placeholder={productsLoading ? 'Carregando...' : 'Selecione um produto'} />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border z-50">
                      {productsLoading && (
                        <div className="flex items-center justify-center py-2">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      )}
                      {products.map((product) => (
                        <SelectItem key={product.id} value={String(product.id)}>
                          {product.name} — {formatCurrency(product.price)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Variation select */}
                {selectedProductData && selectedProductData.variations.length > 0 && (
                  <div className="space-y-2">
                    <Label>Variação</Label>
                    <Select value={selectedVariation} onValueChange={setSelectedVariation}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma variação" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border-border z-50">
                        {selectedProductData.variations.map((variation) => (
                          <SelectItem key={variation.id} value={String(variation.id)}>
                            {variation.name}
                            {variation.price_modifier !== '0.00' && variation.price_modifier !== '0' && (
                              <span className="text-muted-foreground">
                                {' '}({parseFloat(variation.price_modifier) > 0 ? '+' : ''}{formatCurrency(variation.price_modifier)})
                              </span>
                            )}
                            {' '}— Disponível: {variation.quantity_available}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Quantity */}
                <div className="space-y-2">
                  <Label>Quantidade</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="1"
                      max={productAvailableQty ?? 999}
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      className="flex-1"
                    />
                    <Button onClick={addItemToOrder} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {(selectedVariationData || selectedProductData) && (
                    <p className="text-xs text-muted-foreground">
                      {availabilityLoading
                        ? 'Verificando disponibilidade...'
                        : `Disponível: ${productAvailableQty !== null ? productAvailableQty : (!startDate || !endDate ? 'selecione as datas' : '—')}`}
                    </p>
                  )}
                </div>

                {/* Items list */}
                {orderItems.length > 0 && (
                  <div className="space-y-2">
                    <Label>Itens do Pedido</Label>
                    <div className="border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto">
                      {orderItems.map((item, index) => {
                        const { product, variation } = getProductVariationLabel(item);
                        const total = getItemPrice(item);
                        return (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <span className="text-xs sm:text-sm flex-1">
                              {item.quantity}x {product?.name ?? `Produto #${item.productId}`}
                              {variation && <span className="text-muted-foreground"> ({variation.name})</span>}
                            </span>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-medium text-xs sm:text-sm">{formatCurrency(total)}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItemFromOrder(index)}
                                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                              >
                                ×
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                      <div className="border-t pt-2 space-y-1">
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Subtotal</span>
                          <span>{formatCurrency(calculateTotal())}</span>
                        </div>
                        {selectedAddress && (
                          <div className="space-y-0.5">
                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                              <span className="flex items-center gap-1 flex-wrap">
                                Entrega
                                {distanceKm !== null ? (
                                  <span className="text-xs">({distanceKm.toFixed(1)} km)</span>
                                ) : !storeHasCoords ? (
                                  <span className="text-xs text-amber-600">(loja sem coords)</span>
                                ) : !addressHasCoords ? (
                                  <span className="text-xs text-amber-600">(endereço sem coords)</span>
                                ) : null}
                              </span>
                              <div className="flex items-center gap-1">
                                <span className={finalDeliveryFee === 0 ? 'text-green-600' : ''}>
                                  {finalDeliveryFee === 0 ? 'Grátis' : formatCurrency(finalDeliveryFee)}
                                </span>
                                {finalDeliveryFee > 0 ? (
                                  <button
                                    type="button"
                                    title="Remover frete"
                                    onClick={() => setDeliveryFeeManual(0)}
                                    className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    title={`Adicionar frete (${formatCurrency(fees.deliveryFee)})`}
                                    onClick={() => setDeliveryFeeManual(fees.deliveryFee)}
                                    className="ml-1 text-muted-foreground hover:text-primary transition-colors"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                            {isOutsideDeliveryRange && (
                              <p className="text-xs text-destructive">
                                Fora do raio de entrega ({fees.deliveryMaxRadiusKm} km)
                              </p>
                            )}
                          </div>
                        )}
                        {needsAssembly && (
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Montagem</span>
                            <span>{formatCurrency(appliedAssemblyFee)}</span>
                          </div>
                        )}
                        {/* Desconto na criação */}
                        <div className="space-y-1 pt-1 border-t">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground flex-1">Desconto</span>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => setNewDiscountType('fixed')}
                                className={cn('text-xs px-2 py-0.5 rounded border transition-colors', newDiscountType === 'fixed' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary')}
                              >R$</button>
                              <button
                                type="button"
                                onClick={() => setNewDiscountType('percentage')}
                                className={cn('text-xs px-2 py-0.5 rounded border transition-colors', newDiscountType === 'percentage' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary')}
                              >%</button>
                            </div>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0"
                              value={newDiscountValue}
                              onChange={(e) => setNewDiscountValue(e.target.value)}
                              className="h-7 w-24 text-sm text-right"
                            />
                          </div>
                          {parseFloat(newDiscountValue.replace(',', '.')) > 0 && (
                            <div className="flex justify-between text-sm text-green-600">
                              <span>Valor do desconto</span>
                              <span>
                                {newDiscountType === 'percentage'
                                  ? `- ${formatCurrency((calculateTotal() + finalDeliveryFee + appliedAssemblyFee) * (parseFloat(newDiscountValue.replace(',', '.')) / 100))}`
                                  : `- ${formatCurrency(parseFloat(newDiscountValue.replace(',', '.')))}`
                                }
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex justify-between font-semibold text-sm border-t pt-1">
                          <span>Total</span>
                          <span>{(() => {
                            const base = calculateTotal() + finalDeliveryFee + appliedAssemblyFee;
                            const dv = parseFloat(newDiscountValue.replace(',', '.')) || 0;
                            const disc = newDiscountType === 'percentage' ? base * (dv / 100) : dv;
                            return formatCurrency(Math.max(0, base - disc));
                          })()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <Button onClick={handleSubmitOrder} className="w-full" size="lg" disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Clock className="mr-2 h-4 w-4" />
                  )}
                  Criar Pedido
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* ── ORDER DETAIL SHEET ──────────────────────────────────────────── */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {detailLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : detailOrder ? (
            <OrderDetailPanel
              order={detailOrder}
              actionLoading={actionLoading}
              onAction={handleAction}
              paymentLoading={paymentLoading}
              paymentMethodLoading={paymentMethodLoading}
              defaultDeliveryFee={fees.deliveryFee}
              onDeliveryFeeUpdate={handleDeliveryFeeUpdate}
              onPayment={handlePayment}
              onDiscount={handleDiscount}
              userType={userType}
              onForceStatus={handleForceStatus}
              onUpdatePaymentMethod={handleUpdatePaymentMethod}
            />
          ) : null}
        </SheetContent>
      </Sheet>

      {/* ── CONFIRMAÇÃO SEM FRETE ─────────────────────────────────────── */}
      <AlertDialog open={showNoFreightConfirm} onOpenChange={setShowNoFreightConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Pedido sem taxa de entrega
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-1">
              <span className="block">
                {distanceKm === null
                  ? 'Não foi possível calcular a distância até o endereço de entrega, pois as coordenadas não estão disponíveis.'
                  : `O endereço está a ${distanceKm.toFixed(1)} km da loja, além do raio gratuito de ${fees.deliveryFreeRadiusKm} km.`}
              </span>
              <span className="block font-medium text-foreground">
                Deseja criar o pedido sem cobrar o frete ({formatCurrency(fees.deliveryFee)})?
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowNoFreightConfirm(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-500 hover:bg-amber-600 text-white"
              onClick={() => {
                setShowNoFreightConfirm(false);
                doSubmitOrder();
              }}
            >
              Sim, criar sem frete
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => {
                setDeliveryFeeManual(fees.deliveryFee);
                setShowNoFreightConfirm(false);
              }}
            >
              Adicionar frete ({formatCurrency(fees.deliveryFee)})
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}

// ─── Order Detail Panel ───────────────────────────────────────────────────────

interface OrderDetailPanelProps {
  order: OrderAPI;
  actionLoading: boolean;
  onAction: (action: OrderStatusAction) => void;
  paymentLoading: boolean;
  paymentMethodLoading: boolean;
  onPayment: (method: string) => void;
  defaultDeliveryFee: number;
  onDeliveryFeeUpdate: (fee: number) => Promise<void>;
  onDiscount: (payload: ApplyDiscountPayload) => Promise<void>;
  userType: string | null;
  onForceStatus: (status: string) => Promise<void>;
  onUpdatePaymentMethod: (method: string) => Promise<void>;
}

const FORCE_STATUS_OPTIONS: Record<string, { value: string; label: string }[]> = {
  pending:   [{ value: 'confirmed', label: 'Confirmado' }, { value: 'cancelled', label: 'Cancelado' }],
  confirmed: [{ value: 'delivered', label: 'Entregue' }, { value: 'cancelled', label: 'Cancelado' }],
  delivered: [{ value: 'confirmed', label: 'Confirmado' }, { value: 'returned', label: 'Concluído' }, { value: 'cancelled', label: 'Cancelado' }],
  returned:  [{ value: 'delivered', label: 'Entregue' }, { value: 'cancelled', label: 'Cancelado' }],
  cancelled: [{ value: 'confirmed', label: 'Confirmado' }, { value: 'delivered', label: 'Entregue' }, { value: 'returned', label: 'Concluído' }],
};

const STATUS_ACTIONS: Record<string, { action: OrderStatusAction; label: string; icon: React.ReactNode; variant: 'default' | 'destructive' | 'outline' | 'secondary' }[]> = {
  pending: [
    { action: 'confirm', label: 'Confirmar', icon: <CheckCircle2 className="h-4 w-4" />, variant: 'default' },
    { action: 'cancel',  label: 'Cancelar',  icon: <XCircle className="h-4 w-4" />,      variant: 'destructive' },
  ],
  confirmed: [
    { action: 'deliver', label: 'Marcar Entregue', icon: <Truck className="h-4 w-4" />, variant: 'default' },
    { action: 'cancel',  label: 'Cancelar',        icon: <XCircle className="h-4 w-4" />, variant: 'destructive' },
  ],
  delivered: [
    { action: 'return', label: 'Registrar Retirada', icon: <RotateCcw className="h-4 w-4" />, variant: 'default' },
  ],
};

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '—';
  try {
    // Extrai apenas a parte YYYY-MM-DD e constrói como data local,
    // evitando que qualquer interpretação UTC retroceda 1 dia no UTC-3
    const datePart = dateStr.substring(0, 10);
    const [y, m, d] = datePart.split('-').map(Number);
    if (y && m && d) return format(new Date(y, m - 1, d), 'dd/MM/yyyy', { locale: ptBR });
    return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ptBR });
  } catch { return dateStr; }
}

function MapLinks({ addr }: { addr: NonNullable<OrderAPI['delivery_address'] | OrderAPI['address']> }) {
  const fullAddress = [addr.street, addr.number, addr.complement, addr.neighborhood, addr.city, addr.state]
    .filter(Boolean).join(', ');
  const encodedAddress = encodeURIComponent(fullAddress);
  const lat = addr.latitude;
  const lng = addr.longitude;

  const googleUrl = lat && lng
    ? `https://www.google.com/maps?q=${lat},${lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;

  const wazeUrl = lat && lng
    ? `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
    : `https://waze.com/ul?q=${encodedAddress}&navigate=yes`;

  return (
    <div className="flex gap-2 mt-2">
      <a href={googleUrl} target="_blank" rel="noopener noreferrer">
        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
          <ExternalLink className="h-3 w-3" />
          Google Maps
        </Button>
      </a>
      <a href={wazeUrl} target="_blank" rel="noopener noreferrer">
        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
          <Navigation className="h-3 w-3" />
          Waze
        </Button>
      </a>
    </div>
  );
}

function printOrder(order: OrderAPI, company?: CompanyInfo) {
  const addr = order.delivery_address ?? order.address;
  const statusLabel = statusOptions.find((o) => o.value === order.status)?.label ?? order.status;
  const paymentLabel = paymentStatusConfig[order.payment_status]?.label ?? order.payment_status;
  const paymentMethodLabel = order.payment_method
    ? (paymentMethodOptions.find((m) => m.value === order.payment_method)?.label ?? order.payment_method)
    : null;

  const addrLine = addr
    ? [
        `${addr.street}, ${addr.number}${addr.complement ? ` — ${addr.complement}` : ''}`,
        addr.neighborhood,
        `${addr.city} / ${addr.state}${addr.zip_code ? ` · CEP ${addr.zip_code}` : ''}`,
      ].join('<br/>')
    : 'Não informado';

  const itemsHtml = (order.items ?? [])
    .map((item) => {
      const name = item.product?.name ?? item.product_snapshot?.name ?? `Produto #${item.product_id}`;
      const variation = item.variation ? ` (${item.variation.name})` : '';
      const price = formatCurrency(item.total_price ?? item.unit_price ?? '0');
      return `<tr><td>${item.quantity}x ${name}${variation}</td><td style="text-align:right">${price}</td></tr>`;
    })
    .join('');

  const subtotal = formatCurrency(order.subtotal ?? '0');
  const deliveryFee = parseFloat(order.delivery_fee ?? '0');
  const discount = parseFloat(order.discount_amount ?? '0');
  const total = formatCurrency(order.total_amount ?? '0');
  const deposit = parseFloat(order.deposit_amount ?? '0');

  const timestamps = [
    order.confirmed_at && `Confirmado em: ${format(parseISO(order.confirmed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
    order.delivered_at && `Entregue em: ${format(parseISO(order.delivered_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
    order.returned_at && `Concluído em: ${format(parseISO(order.returned_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
    order.cancelled_at && `Cancelado em: ${format(parseISO(order.cancelled_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
  ].filter(Boolean).join('<br/>');

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Pedido #${order.order_number ?? order.id}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #111; padding: 32px; max-width: 600px; margin: 0 auto; }
    .company-logo { display: inline-block; margin-bottom: 20px; line-height: 1; border: 2px solid #111; border-radius: 50%; padding: 16px 28px; text-align: center; }
    .company-logo .name { font-family: Georgia, 'Times New Roman', serif; font-size: 28px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; color: #111; }
    .company-logo .tagline { font-family: Arial, sans-serif; font-size: 12px; font-weight: 400; color: #555; letter-spacing: 0.03em; margin-top: 2px; }
    h1 { font-size: 18px; margin-bottom: 4px; }
    .subtitle { color: #555; font-size: 12px; margin-bottom: 24px; }
    .section { margin-bottom: 18px; }
    .section-title { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #888; margin-bottom: 6px; font-weight: 600; }
    .divider { border: none; border-top: 1px solid #ddd; margin: 16px 0; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 4px 0; vertical-align: top; }
    .totals td { padding: 3px 0; }
    .total-row td { font-weight: 700; font-size: 14px; border-top: 1px solid #ccc; padding-top: 6px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; margin-right: 6px; }
    .muted { color: #666; }
    .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 11px; color: #bbb; line-height: 1.6; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  ${PRINT_SHOW_LOGO ? `<div class="company-logo">
    <div class="name">${APP_NAME}</div>
    <div class="tagline">${APP_SUBTITLE}</div>
  </div>
  <hr class="divider"/>` : ''}

  <h1>Pedido #${order.order_number ?? order.id}</h1>
  <div class="subtitle">
    <span class="badge" style="background:#e5e7eb">${statusLabel}</span>
    <span class="badge" style="background:#e5e7eb">${paymentLabel}</span>
    Criado em ${formatDate(order.created_at)}
  </div>

  <hr class="divider"/>

  <div class="section">
    <div class="section-title">Cliente</div>
    <strong>${order.client?.name ?? '—'}</strong><br/>
    ${order.client?.phone ? `<span class="muted">${order.client.phone}</span><br/>` : ''}
    ${order.client?.email ? `<span class="muted">${order.client.email}</span>` : ''}
  </div>

  <hr class="divider"/>

  <div class="section">
    <div class="section-title">Período de Aluguel</div>
    Entrega: <strong>${formatDate(order.rental_start_date)}</strong> &nbsp;→&nbsp;
    Retirada: <strong>${formatDate(order.rental_end_date)}</strong>
  </div>

  <hr class="divider"/>

  <div class="section">
    <div class="section-title">Endereço de Entrega</div>
    ${addrLine}
  </div>

  <hr class="divider"/>

  <div class="section">
    <div class="section-title">Itens</div>
    <table>${itemsHtml}</table>
  </div>

  <hr class="divider"/>

  <div class="section">
    <div class="section-title">Valores</div>
    <table class="totals">
      <tr><td class="muted">Subtotal</td><td style="text-align:right">${subtotal}</td></tr>
      <tr><td class="muted">Taxa de entrega</td><td style="text-align:right">${deliveryFee > 0 ? formatCurrency(deliveryFee) : 'Grátis'}</td></tr>
      ${discount > 0 ? `<tr><td class="muted" style="color:#16a34a">Desconto</td><td style="text-align:right;color:#16a34a">- ${formatCurrency(discount)}</td></tr>` : ''}
      <tr class="total-row"><td>Total</td><td style="text-align:right">${total}</td></tr>
      ${deposit > 0 ? `<tr><td class="muted" style="font-size:11px">Caução</td><td style="text-align:right;font-size:11px">${formatCurrency(deposit)}</td></tr>` : ''}
    </table>
  </div>

  <hr class="divider"/>

  <div class="section">
    <div class="section-title">Pagamento</div>
    ${paymentLabel}${paymentMethodLabel ? ` · ${paymentMethodLabel}` : ''}
  </div>

  ${order.notes ? `<hr class="divider"/><div class="section"><div class="section-title">Observações</div>${order.notes}</div>` : ''}
  ${order.cancellation_reason ? `<hr class="divider"/><div class="section"><div class="section-title" style="color:#dc2626">Motivo do Cancelamento</div>${order.cancellation_reason}</div>` : ''}
  ${timestamps ? `<hr class="divider"/><div class="section muted" style="font-size:11px">${timestamps}</div>` : ''}

  ${company ? `<div class="footer">
    ${company.name ? `<div>${company.name}${company.cnpj ? ` · CNPJ ${company.cnpj}` : ''}</div>` : ''}
    ${company.address?.street ? `<div>${company.address.street}, ${company.address.number}${company.address.complement ? ` — ${company.address.complement}` : ''} · ${company.address.neighborhood} · ${company.address.city}/${company.address.state}</div>` : ''}
    ${(company.phone || company.email || company.website) ? `<div>${[company.phone, company.email, company.website].filter(Boolean).join(' · ')}</div>` : ''}
  </div>` : ''}
</body>
</html>`;

  const win = window.open('', '_blank', 'width=700,height=900');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}

function OrderDetailPanel({ order, actionLoading, onAction, paymentLoading, paymentMethodLoading, onPayment, defaultDeliveryFee, onDeliveryFeeUpdate, onDiscount, userType, onForceStatus, onUpdatePaymentMethod }: OrderDetailPanelProps) {
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [deliveryFeeLoading, setDeliveryFeeLoading] = useState(false);
  const [showDiscountForm, setShowDiscountForm] = useState(false);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('fixed');
  const [discountValue, setDiscountValue] = useState('');
  const [discountLoading, setDiscountLoading] = useState(false);
  const [forceStatusValue, setForceStatusValue] = useState('');
  const [editingPaymentMethod, setEditingPaymentMethod] = useState(false);
  const [newPaymentMethod, setNewPaymentMethod] = useState(order.payment_method ?? 'pix');

  const canApplyDiscount = !['returned', 'cancelled'].includes(order.status);

  const handleApplyDiscount = async () => {
    const val = parseFloat(discountValue.replace(',', '.'));
    if (!val || val <= 0) {
      return;
    }
    setDiscountLoading(true);
    try {
      await onDiscount({ discount_type: discountType, discount_value: val });
      setShowDiscountForm(false);
      setDiscountValue('');
    } finally {
      setDiscountLoading(false);
    }
  };

  const handleDeliveryFeeToggle = async () => {
    const current = parseFloat(order.delivery_fee ?? '0');
    const next = current > 0 ? 0 : defaultDeliveryFee;
    setDeliveryFeeLoading(true);
    try {
      await onDeliveryFeeUpdate(next);
    } finally {
      setDeliveryFeeLoading(false);
    }
  };

  const statusCfg = statusOptions.find((o) => o.value === order.status);
  const paymentCfg = paymentStatusConfig[order.payment_status];
  const actions = STATUS_ACTIONS[order.status] ?? [];
  const addr = order.delivery_address ?? order.address;
  const isPaid = order.payment_status === 'paid';

  return (
    <div className="space-y-5 pt-2">
      {/* Header */}
      <SheetHeader>
        <SheetTitle className="flex items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Pedido #{order.order_number ?? order.id}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-7 text-xs"
            onClick={async () => { const company = await getCompanyInfo(); printOrder(order, company); }}
          >
            <Printer className="h-3.5 w-3.5" />
            Imprimir
          </Button>
        </SheetTitle>
        <div className="flex items-center gap-2 pt-1 flex-wrap">
          <Badge variant="secondary" className={cn('text-white text-xs', statusCfg?.color ?? 'bg-gray-500')}>
            {statusCfg?.label ?? order.status}
          </Badge>
          <Badge variant="outline" className={cn('text-xs', isPaid ? 'bg-green-600 text-white border-green-600' : order.payment_status === 'failed' ? 'bg-red-500 text-white border-red-500' : 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700')}>
            {paymentCfg?.label ?? order.payment_status}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Criado em {formatDate(order.created_at)}
          </span>
        </div>
      </SheetHeader>

      {/* Status actions */}
      {actions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Alterar Status</p>
          <div className="flex flex-wrap gap-2">
            {actions.map(({ action, label, icon, variant }) => (
              <Button
                key={action}
                variant={variant}
                size="sm"
                disabled={actionLoading}
                onClick={() => onAction(action)}
                className="gap-1.5"
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
                {label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Correção manual de status — admin/super_admin */}
      {(userType === 'admin' || userType === 'super_admin') && (() => {
        const options = FORCE_STATUS_OPTIONS[order.status] ?? [];
        if (options.length === 0) return null;
        return (
          <div className="space-y-2 rounded-md border border-dashed border-amber-400 bg-amber-50 dark:bg-amber-950/20 p-3">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              Correção de Status
            </p>
            <p className="text-xs text-muted-foreground">Ajuste manual sem envio de notificações. Use apenas para corrigir erros.</p>
            <div className="flex gap-2">
              <Select value={forceStatusValue} onValueChange={setForceStatusValue}>
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue placeholder="Selecionar status..." />
                </SelectTrigger>
                <SelectContent>
                  {options.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                disabled={!forceStatusValue || actionLoading}
                onClick={() => { onForceStatus(forceStatusValue); setForceStatusValue(''); }}
              >
                {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Aplicar'}
              </Button>
            </div>
          </div>
        );
      })()}

      <div className="h-px bg-border" />

      {/* Client */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cliente</p>
        <p className="font-medium text-sm">{order.client?.name ?? '—'}</p>
        {order.client?.phone && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Phone className="h-3.5 w-3.5" />
            {order.client.phone}
          </div>
        )}
        {order.client?.email && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Mail className="h-3.5 w-3.5" />
            {order.client.email}
          </div>
        )}
      </div>

      <div className="h-px bg-border" />

      {/* Rental period */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Período de Aluguel</p>
        <div className="flex items-center gap-3 text-sm">
          <div>
            <span className="text-muted-foreground text-xs">Entrega</span>
            <p className="font-medium">{formatDate(order.rental_start_date)}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          <div>
            <span className="text-muted-foreground text-xs">Retirada</span>
            <p className="font-medium">{formatDate(order.rental_end_date)}</p>
          </div>
        </div>
      </div>

      <div className="h-px bg-border" />

      {/* Address */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Endereço de Entrega</p>
        {addr ? (
          <>
            <div className="text-sm space-y-0.5">
              <p className="font-medium">
                {addr.street}, {addr.number}
                {addr.complement && ` — ${addr.complement}`}
              </p>
              <p className="text-muted-foreground">{addr.neighborhood}</p>
              <p className="text-muted-foreground">
                {addr.city} / {addr.state}
                {addr.zip_code && ` · CEP ${addr.zip_code}`}
              </p>
            </div>
            <MapLinks addr={addr} />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Endereço não informado</p>
        )}
      </div>

      <div className="h-px bg-border" />

      {/* Items */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Itens</p>
        <div className="space-y-2">
          {(order.items ?? []).map((item) => {
            const name = item.product?.name ?? item.product_snapshot?.name ?? `Produto #${item.product_id}`;
            return (
              <div key={item.id} className="flex justify-between items-start text-sm">
                <div>
                  <span className="font-medium">{item.quantity}x</span> {name}
                  {item.variation && <span className="text-muted-foreground text-xs"> ({item.variation.name})</span>}
                </div>
                <span className="text-muted-foreground shrink-0 ml-2">
                  {formatCurrency(item.total_price ?? item.unit_price ?? '0')}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="h-px bg-border" />

      {/* Totals */}
      <div className="space-y-1.5 text-sm">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Valores</p>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatCurrency(order.subtotal ?? '0')}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Taxa de entrega</span>
          <div className="flex items-center gap-1.5">
            {parseFloat(order.delivery_fee ?? '0') > 0 ? (
              <span>{formatCurrency(order.delivery_fee!)}</span>
            ) : (
              <span className="text-green-600">Grátis</span>
            )}
            {order.status !== 'cancelled' && (
              <button
                type="button"
                onClick={handleDeliveryFeeToggle}
                disabled={deliveryFeeLoading}
                title={parseFloat(order.delivery_fee ?? '0') > 0 ? 'Remover frete' : `Adicionar frete (${formatCurrency(defaultDeliveryFee)})`}
                className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
              >
                {deliveryFeeLoading
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : parseFloat(order.delivery_fee ?? '0') > 0
                    ? <X className="h-3 w-3 hover:text-destructive" />
                    : <Plus className="h-3 w-3" />
                }
              </button>
            )}
          </div>
        </div>
        {/* Linha de desconto + botão */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-green-600">
            <span className="text-sm">Desconto</span>
            {order.coupon_code && (
              <Badge variant="outline" className="text-xs h-4 px-1 text-green-600 border-green-600">
                {order.coupon_code}
              </Badge>
            )}
            {order.discount_type && (
              <span className="text-xs text-muted-foreground">
                ({order.discount_type === 'percentage' ? `${order.discount_value}%` : `R$ ${parseFloat(order.discount_value ?? '0').toFixed(2)}`})
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-green-600">
              {parseFloat(order.discount_amount ?? '0') > 0 ? `- ${formatCurrency(order.discount_amount ?? '0')}` : '—'}
            </span>
            {canApplyDiscount && (
              <button
                type="button"
                title="Aplicar desconto"
                onClick={() => setShowDiscountForm((v) => !v)}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <Plus className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Formulário inline de desconto */}
        {showDiscountForm && canApplyDiscount && (
          <div className="space-y-2 p-3 rounded-md border bg-muted/30">
            <p className="text-xs font-medium">Aplicar desconto</p>
            <div className="flex gap-2 items-center">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setDiscountType('fixed')}
                  className={cn('text-xs px-2 py-0.5 rounded border transition-colors', discountType === 'fixed' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary')}
                >R$</button>
                <button
                  type="button"
                  onClick={() => setDiscountType('percentage')}
                  className={cn('text-xs px-2 py-0.5 rounded border transition-colors', discountType === 'percentage' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary')}
                >%</button>
              </div>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder={discountType === 'percentage' ? 'Ex: 10' : 'Ex: 50,00'}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="h-7 text-sm flex-1"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 gap-1.5" disabled={discountLoading || !discountValue} onClick={handleApplyDiscount}>
                {discountLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Aplicar
              </Button>
              <Button size="sm" variant="outline" disabled={discountLoading} onClick={() => { setShowDiscountForm(false); setDiscountValue(''); }}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        <div className="flex justify-between font-semibold text-base pt-1 border-t">
          <span>Total</span>
          <span>{formatCurrency(order.total_amount ?? '0')}</span>
        </div>
        {parseFloat(order.deposit_amount ?? '0') > 0 && (
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Caução</span>
            <span>{formatCurrency(order.deposit_amount ?? '0')}</span>
          </div>
        )}
      </div>

      {/* Payment */}
      <div className="h-px bg-border" />
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pagamento</p>
          <Badge variant="outline" className={cn('text-xs', isPaid ? 'bg-green-600 text-white border-green-600' : order.payment_status === 'failed' ? 'bg-red-500 text-white border-red-500' : 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700')}>
            {paymentCfg?.label ?? order.payment_status}
          </Badge>
        </div>
        {!editingPaymentMethod && (
          <div className="flex items-center justify-between gap-2 min-h-[1.5rem]">
            {order.payment_method ? (
              <p className="text-sm text-muted-foreground">
                Método: {paymentMethodOptions.find(m => m.value === order.payment_method)?.label ?? order.payment_method}
              </p>
            ) : <span />}
            {userType === 'super_admin' && (
              <button
                onClick={() => { setNewPaymentMethod(order.payment_method ?? 'pix'); setEditingPaymentMethod(true); }}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 shrink-0"
              >
                {order.payment_method ? 'Editar' : 'Definir método'}
              </button>
            )}
          </div>
        )}
        {editingPaymentMethod && (
          <div className="space-y-2 p-3 rounded-md border bg-muted/30">
            <p className="text-xs font-medium">Alterar forma de pagamento</p>
            <Select value={newPaymentMethod} onValueChange={setNewPaymentMethod}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border-border z-50">
                {paymentMethodOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 h-7 text-xs"
                disabled={paymentMethodLoading}
                onClick={async () => { await onUpdatePaymentMethod(newPaymentMethod); setEditingPaymentMethod(false); }}
              >
                {paymentMethodLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Salvar'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                disabled={paymentMethodLoading}
                onClick={() => setEditingPaymentMethod(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
        {!isPaid && order.status !== 'cancelled' && (
          <>
            {!showPaymentForm ? (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 w-full"
                onClick={() => setShowPaymentForm(true)}
              >
                <Banknote className="h-4 w-4" />
                Registrar Pagamento
              </Button>
            ) : (
              <div className="space-y-2 p-3 rounded-md border bg-muted/30">
                <p className="text-xs font-medium">Método de pagamento</p>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border z-50">
                    {paymentMethodOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 gap-1.5"
                    disabled={paymentLoading}
                    onClick={() => { onPayment(paymentMethod); setShowPaymentForm(false); }}
                  >
                    {paymentLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
                    Confirmar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={paymentLoading}
                    onClick={() => setShowPaymentForm(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Notes */}
      {order.notes && (
        <>
          <div className="h-px bg-border" />
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Observações</p>
            <p className="text-sm">{order.notes}</p>
          </div>
        </>
      )}

      {/* Cancellation */}
      {order.cancellation_reason && (
        <>
          <div className="h-px bg-border" />
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-red-500 uppercase tracking-wide">Motivo do Cancelamento</p>
            <p className="text-sm text-muted-foreground">{order.cancellation_reason}</p>
          </div>
        </>
      )}

      {/* Nota Fiscal */}
      <AdminInvoiceSection order={order} />

      {/* Timestamps */}
      <div className="h-px bg-border" />
      <div className="space-y-1 text-xs text-muted-foreground">
        {order.confirmed_at && <p>Confirmado em {format(parseISO(order.confirmed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>}
        {order.delivered_at && <p>Entregue em {format(parseISO(order.delivered_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>}
        {order.returned_at && <p>Concluído em {format(parseISO(order.returned_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>}
        {order.cancelled_at && <p>Cancelado em {format(parseISO(order.cancelled_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>}
      </div>
    </div>
  );
}
