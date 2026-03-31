import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClientLayout } from '@/components/Layout/ClientLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn, formatCurrency } from '@/lib/utils';
import {
  Plus, Minus, Trash2, Package, Loader2, ShoppingCart, MapPin, CalendarIcon,
  Star, PlusCircle, CheckCircle2, AlertTriangle, XCircle, Truck, Wrench, Tag,
  MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import { useCart, type CartItem } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { createOrder } from '@/modules/admin/orders/services';
import { validateCoupon, type ValidateCouponResponse } from '@/modules/admin/coupons/services';
import { checkProductAvailability } from '@/modules/admin/products/services';
import {
  getFeeSettings, getStoreLocation, haversineDistance,
  getBusinessRules,
  type FeeSettings, type StoreLocation,
  DEFAULT_FEES, DEFAULT_STORE_LOCATION,
} from '@/modules/admin/settings/services';
import apiClient from '@/services/apiClient';

const DEFAULT_ADVANCE_DAYS = 3;

// ─── Types ────────────────────────────────────────────────────────────────────

interface AddressEntry {
  id: number;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
  latitude?: number | null;
  longitude?: number | null;
  is_default?: boolean;
}

type AvailStatus = 'idle' | 'loading' | 'ok' | 'partial' | 'unavailable';

interface ItemAvail {
  status: AvailStatus;
  availableQty: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function itemKey(item: CartItem): string {
  return `${item.product.id}-${item.variation?.id ?? 'none'}`;
}

function unitPrice(item: CartItem): number {
  return item.variation
    ? parseFloat(item.variation.price_modifier) || parseFloat(item.product.price)
    : parseFloat(item.product.price);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MyOrder() {
  const navigate = useNavigate();
  const { items, updateQuantity, removeItem, clearCart } = useCart();
  const { clientId } = useAuth();

  // ── Suggestion chips ─────────────────────────────────────────────────────────
  const SUGGESTION_CHIPS = [
    { label: 'Entrega entre horários', text: 'Prefiro a entrega entre __h e __h. ' },
    { label: 'Retirada entre horários', text: 'Prefiro a retirada entre __h e __h. ' },
    { label: 'Será recebido por', text: 'Será recebido por ___. ' },
    { label: 'Interfonar', text: 'Interfonar no apartamento/número ___. ' },
    { label: 'Contato no local', text: 'Contato no local: ___ · (__)_____-____. ' },
  ];

  // Advance booking days from settings (default 3)
  const [advanceDays, setAdvanceDays] = useState(DEFAULT_ADVANCE_DAYS);

  // minDate = today + advanceDays
  const minDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + advanceDays);
    return d.toISOString().split('T')[0];
  }, [advanceDays]);

  const today = new Date().toISOString().split('T')[0];

  const [startDate, setStartDate] = useState<string>(() => {
    const saved = localStorage.getItem('order_start_date') ?? '';
    return saved >= minDate ? saved : '';
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const saved = localStorage.getItem('order_end_date') ?? '';
    return saved >= today ? saved : '';
  });
  const [notes, setNotes] = useState<string>(
    () => localStorage.getItem('order_notes') ?? '',
  );

  // Has active coupons?
  const [hasActiveCoupons, setHasActiveCoupons] = useState(false);

  // Terms modal
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsText, setTermsText] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    if (startDate) localStorage.setItem('order_start_date', startDate);
    else localStorage.removeItem('order_start_date');
  }, [startDate]);

  useEffect(() => {
    if (endDate) localStorage.setItem('order_end_date', endDate);
    else localStorage.removeItem('order_end_date');
  }, [endDate]);

  useEffect(() => {
    if (notes) localStorage.setItem('order_notes', notes);
    else localStorage.removeItem('order_notes');
  }, [notes]);

  // Addresses
  const [addresses, setAddresses] = useState<AddressEntry[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [loadingAddresses, setLoadingAddresses] = useState(true);

  // Fees from settings
  const [fees, setFees] = useState<FeeSettings>(DEFAULT_FEES);
  const [storeLocation, setStoreLocation] = useState<StoreLocation>(DEFAULT_STORE_LOCATION);

  // Availability per item
  const [availability, setAvailability] = useState<Record<string, ItemAvail>>({});
  const [availChecking, setAvailChecking] = useState(false);

  // Coupon
  const [couponCode, setCouponCode] = useState('');
  const [couponData, setCouponData] = useState<ValidateCouponResponse | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  // Submission
  const [submitting, setSubmitting] = useState(false);

  // ── Load addresses & fee settings on mount ──────────────────────────────────
  useEffect(() => {
    apiClient
      .get('/addresses')
      .then(({ data }) => {
        const list: AddressEntry[] = data.data ?? data ?? [];
        setAddresses(list);
        const def = list.find((a) => a.is_default);
        if (def) setSelectedAddressId(String(def.id));
        else if (list.length > 0) setSelectedAddressId(String(list[0].id));
      })
      .catch(() => toast.error('Erro ao carregar endereços'))
      .finally(() => setLoadingAddresses(false));

    getFeeSettings().then(setFees).catch(() => {});
    getStoreLocation().then(setStoreLocation).catch(() => {});
    getBusinessRules().then((rules) => {
      const days = rules.advanceBookingDays ?? DEFAULT_ADVANCE_DAYS;
      setAdvanceDays(days);
      setTermsText(rules.termsAndConditions ?? '');
    }).catch(() => {});
    apiClient.get('/coupons/has-active')
      .then(({ data }) => setHasActiveCoupons(data?.data?.has_active === true))
      .catch(() => {});
  }, []);

  // ── Check availability for all items when dates change ───────────────────────
  useEffect(() => {
    if (!startDate || !endDate || items.length === 0) {
      setAvailability({});
      return;
    }

    setAvailChecking(true);

    Promise.all(
      items.map((item) =>
        checkProductAvailability(
          item.product.id,
          startDate,
          endDate,
          item.quantity,
          item.variation?.id ?? null,
        )
          .then((data) => ({ key: itemKey(item), qty: item.quantity, data }))
          .catch(() => ({
            key: itemKey(item),
            qty: item.quantity,
            data: { available: false, available_quantity: 0 },
          })),
      ),
    )
      .then((results) => {
        const map: Record<string, ItemAvail> = {};
        results.forEach(({ key, qty, data }) => {
          if (!data.available || data.available_quantity === 0) {
            map[key] = { status: 'unavailable', availableQty: 0 };
          } else if (data.available_quantity < qty) {
            map[key] = { status: 'partial', availableQty: data.available_quantity };
          } else {
            map[key] = { status: 'ok', availableQty: data.available_quantity };
          }
        });
        setAvailability(map);
      })
      .finally(() => setAvailChecking(false));
  }, [startDate, endDate, items]);

  // ── Fee calculations ─────────────────────────────────────────────────────────
  const selectedAddress = addresses.find((a) => String(a.id) === selectedAddressId) ?? null;
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

  const deliveryFee = useMemo(() => {
    if (!selectedAddress) return 0;
    if (distanceKm !== null && distanceKm <= fees.deliveryFreeRadiusKm) return 0;
    return fees.deliveryFee;
  }, [selectedAddress, distanceKm, fees]);

  const isOutsideRange = useMemo(() => {
    if (!fees.deliveryMaxRadiusKm || distanceKm === null) return false;
    return distanceKm > fees.deliveryMaxRadiusKm;
  }, [distanceKm, fees]);

  const isFreeDelivery = selectedAddress !== null && deliveryFee === 0;

  const needsAssembly = useMemo(
    () => items.some((i) => i.product.requires_assembly),
    [items],
  );
  const assemblyFee = needsAssembly ? fees.assemblyFee : 0;

  // ── Totals ───────────────────────────────────────────────────────────────────
  function rentalDays(): number {
    if (!startDate || !endDate) return 1;
    const diff = Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000,
    );
    return Math.max(1, diff);
  }

  const subtotalPerDay = items.reduce((s, i) => s + unitPrice(i) * i.quantity, 0);
  const subtotalTotal = subtotalPerDay * rentalDays();

  const couponDiscount = useMemo(() => {
    if (!couponData) return 0;
    const val = parseFloat(couponData.value);
    if (couponData.type === 'percentage') return Math.min(subtotalTotal * (val / 100), subtotalTotal);
    return Math.min(val, subtotalTotal);
  }, [couponData, subtotalTotal]);

  const grandTotal = subtotalTotal + deliveryFee + assemblyFee - couponDiscount;

  async function handleApplyCoupon() {
    const code = couponCode.trim().toUpperCase();
    if (!code) return;
    setCouponLoading(true);
    try {
      const data = await validateCoupon(code);
      setCouponData(data);
      toast.success(`Cupom "${data.code}" aplicado!`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Cupom inválido.';
      toast.error(msg);
      setCouponData(null);
    } finally {
      setCouponLoading(false);
    }
  }

  function handleRemoveCoupon() {
    setCouponData(null);
    setCouponCode('');
  }

  // ── Derived flags ────────────────────────────────────────────────────────────
  const hasUnavailable = Object.values(availability).some((a) => a.status === 'unavailable');
  const hasPartial = Object.values(availability).some((a) => a.status === 'partial');
  const datesSet = !!startDate && !!endDate;

  // ── Submit ───────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (items.length === 0) { toast.error('Adicione pelo menos um produto.'); return; }
    if (!datesSet) { toast.error('Informe as datas de locação.'); return; }
    if (!selectedAddressId) { toast.error('Selecione um endereço de entrega.'); return; }
    if (!clientId) { toast.error('Erro de autenticação. Faça login novamente.'); return; }
    if (hasUnavailable) { toast.error('Remova os itens indisponíveis antes de continuar.'); return; }
    if (isOutsideRange) { toast.error(`Endereço fora do raio de entrega (${fees.deliveryMaxRadiusKm} km).`); return; }

    // Verificar termos de locação no primeiro pedido
    if (termsText && !termsAccepted) {
      setShowTermsModal(true);
      return;
    }

    await submitOrder();
  }

  async function submitOrder() {
    setSubmitting(true);
    try {
      await createOrder({
        client_id: clientId!,
        delivery_address_id: parseInt(selectedAddressId, 10),
        rental_start_date: startDate,
        rental_end_date: endDate,
        notes: notes.trim() || undefined,
        delivery_fee: deliveryFee > 0 ? deliveryFee : undefined,
        assembly_fee: assemblyFee > 0 ? assemblyFee : undefined,
        coupon_code: couponData?.code || undefined,
        items: items.map((i) => ({
          product_id: i.product.id,
          product_variation_id: i.variation?.id ?? null,
          quantity: i.quantity,
          component_selections: i.componentSelections ?? [],
        })),
      });
      clearCart();
      localStorage.removeItem('order_start_date');
      localStorage.removeItem('order_end_date');
      localStorage.removeItem('order_notes');
      toast.success('Pedido enviado! Em breve entraremos em contato.');
      navigate('/history');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Erro ao enviar pedido.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Availability icon helper ─────────────────────────────────────────────────
  function AvailIcon({ status }: { status: AvailStatus }) {
    if (status === 'loading') return <Loader2 size={14} className="animate-spin text-muted-foreground" />;
    if (status === 'ok') return <CheckCircle2 size={14} className="text-green-500" />;
    if (status === 'partial') return <AlertTriangle size={14} className="text-yellow-500" />;
    if (status === 'unavailable') return <XCircle size={14} className="text-destructive" />;
    return null;
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <ClientLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gradient-primary">Meu Pedido</h1>
          <p className="text-muted-foreground">Revise os itens e informe os dados da locação</p>
        </div>

        {items.length === 0 ? (
          <Card className="bg-gradient-surface border-border/50">
            <CardContent className="flex flex-col items-center py-16 gap-4">
              <ShoppingCart size={48} className="text-muted-foreground" />
              <p className="text-muted-foreground">Seu pedido está vazio.</p>
              <Button onClick={() => navigate('/catalog')}>Ver Catálogo</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ── Left column ──────────────────────────────────────────────── */}
            <div className="lg:col-span-2 space-y-4">

              {/* Itens */}
              <Card className="bg-gradient-surface border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package size={20} />
                    Itens do Pedido
                    {availChecking && (
                      <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground ml-auto">
                        <Loader2 size={12} className="animate-spin" />
                        Verificando disponibilidade...
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Aviso de parcial */}
                  {datesSet && hasPartial && (
                    <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-3 text-sm text-yellow-700 dark:text-yellow-400 space-y-1">
                      <div className="flex items-center gap-2 font-medium">
                        <AlertTriangle size={15} className="shrink-0" />
                        Estoque insuficiente para o período selecionado:
                      </div>
                      <ul className="pl-5 space-y-0.5 list-disc">
                        {items
                          .filter((i) => availability[itemKey(i)]?.status === 'partial')
                          .map((i, idx) => {
                            const avail = availability[itemKey(i)];
                            const label = i.variation ? `${i.product.name} (${i.variation.name})` : i.product.name;
                            return (
                              <li key={idx}>
                                {label} — solicitado: <strong>{i.quantity}</strong>, disponível: <strong>{avail.availableQty}</strong>
                              </li>
                            );
                          })}
                      </ul>
                    </div>
                  )}
                  {datesSet && hasUnavailable && (
                    <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive space-y-1">
                      <div className="flex items-center gap-2 font-medium">
                        <XCircle size={15} className="shrink-0" />
                        Produtos indisponíveis neste período:
                      </div>
                      <ul className="pl-5 space-y-0.5 list-disc">
                        {items
                          .filter((i) => availability[itemKey(i)]?.status === 'unavailable')
                          .map((i, idx) => {
                            const label = i.variation ? `${i.product.name} (${i.variation.name})` : i.product.name;
                            return <li key={idx}>{label}</li>;
                          })}
                      </ul>
                    </div>
                  )}

                  {items.map((item, idx) => {
                    const price = unitPrice(item);
                    const key = itemKey(item);
                    const avail = availability[key];

                    return (
                      <div
                        key={idx}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg transition-colors',
                          avail?.status === 'unavailable'
                            ? 'bg-destructive/10 border border-destructive/20'
                            : avail?.status === 'partial'
                            ? 'bg-yellow-500/10 border border-yellow-500/20'
                            : 'bg-muted/40',
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium text-sm truncate">{item.product.name}</p>
                            {avail && <AvailIcon status={avail.status} />}
                          </div>

                          {item.variation && (
                            <Badge variant="outline" className="text-xs mt-0.5">
                              {item.variation.name}
                            </Badge>
                          )}

                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatCurrency(price)}/dia × {item.quantity} ={' '}
                            <span className="font-semibold text-foreground">
                              {formatCurrency(price * item.quantity)}
                            </span>
                          </p>

                          {/* Aviso de estoque parcial */}
                          {avail?.status === 'partial' && (
                            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-0.5">
                              Disponível: {avail.availableQty} unidade{avail.availableQty !== 1 ? 's' : ''}
                            </p>
                          )}
                          {avail?.status === 'unavailable' && (
                            <p className="text-xs text-destructive mt-0.5">
                              Indisponível neste período
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="outline" size="icon" className="h-7 w-7"
                            onClick={() => updateQuantity(idx, item.quantity - 1)}
                          >
                            <Minus size={13} />
                          </Button>
                          <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                          <Button
                            variant="outline" size="icon" className="h-7 w-7"
                            onClick={() => updateQuantity(idx, item.quantity + 1)}
                          >
                            <Plus size={13} />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => removeItem(idx)}
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </div>
                    );
                  })}

                  <Button
                    variant="outline" size="sm" className="w-full mt-2"
                    onClick={() => navigate('/catalog')}
                  >
                    <Plus size={14} className="mr-1" />
                    Adicionar mais produtos
                  </Button>
                </CardContent>
              </Card>

              {/* Datas */}
              <Card className="bg-gradient-surface border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon size={20} />
                    Período de Locação
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {advanceDays > 0 && (
                    <p className="text-xs text-muted-foreground -mt-1">
                      Pedidos com mínimo de <strong>{advanceDays} dia{advanceDays !== 1 ? 's' : ''}</strong> de antecedência.
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Data de entrega *</label>
                      <Input
                        type="date"
                        value={startDate}
                        min={minDate}
                        onChange={(e) => {
                          setStartDate(e.target.value);
                          if (endDate && e.target.value > endDate) setEndDate('');
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Data de retirada *</label>
                      <Input
                        type="date"
                        value={endDate}
                        min={startDate || minDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                  </div>

                  {datesSet && (
                    <div className="rounded-lg bg-primary/10 p-3 text-sm">
                      Período: <strong>{rentalDays()} dia{rentalDays() > 1 ? 's' : ''}</strong>
                    </div>
                  )}

                </CardContent>
              </Card>

              {/* Orientações de Entrega */}
              <Card className="bg-gradient-surface border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare size={20} />
                    Orientações de Entrega
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-muted-foreground -mt-1">
                    Informe horários e detalhes de acesso para facilitar a entrega no evento.
                  </p>

                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Sugestões rápidas:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {SUGGESTION_CHIPS.map((chip) => (
                        <button
                          key={chip.label}
                          type="button"
                          onClick={() => setNotes((prev) => prev + chip.text)}
                          className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                        >
                          <Plus size={11} />
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Observações / Acesso</label>
                      <span className={cn(
                        'text-xs',
                        notes.length >= 500 ? 'text-destructive font-medium' : 'text-muted-foreground',
                      )}>
                        {notes.length}/500
                      </span>
                    </div>
                    <Textarea
                      placeholder="Ex: Entrar pelo portão lateral, estacionar na vaga 12. Porteiro: João."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value.slice(0, 500))}
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Cupom de desconto — só aparece se existir cupom ativo */}
              {hasActiveCoupons && <Card className="bg-gradient-surface border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag size={20} />
                    Cupom de Desconto
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {couponData ? (
                    <div className="flex items-center justify-between rounded-lg bg-green-500/10 border border-green-500/30 p-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                        <div>
                          <p className="font-mono font-semibold text-sm">{couponData.code}</p>
                          <p className="text-xs text-muted-foreground">
                            {couponData.type === 'percentage'
                              ? `${parseFloat(couponData.value)}% de desconto`
                              : `${formatCurrency(parseFloat(couponData.value))} de desconto`}
                            {couponData.description ? ` · ${couponData.description}` : ''}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={handleRemoveCoupon}>
                        <XCircle size={15} />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Código do cupom"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        className="font-mono"
                        onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                      />
                      <Button
                        variant="outline"
                        onClick={handleApplyCoupon}
                        disabled={couponLoading || !couponCode.trim()}
                      >
                        {couponLoading ? <Loader2 size={15} className="animate-spin" /> : 'Aplicar'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>}

              {/* Endereço */}
              <Card className="bg-gradient-surface border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin size={20} />
                    Endereço de Entrega
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {loadingAddresses ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="animate-spin text-primary" size={24} />
                    </div>
                  ) : addresses.length === 0 ? (
                    <div className="text-center py-4 space-y-3">
                      <p className="text-sm text-muted-foreground">Nenhum endereço cadastrado.</p>
                      <Button variant="outline" size="sm" onClick={() => navigate('/profile?tab=address&new=1')}>
                        Cadastrar endereço no perfil
                      </Button>
                    </div>
                  ) : (
                    <RadioGroup
                      value={selectedAddressId}
                      onValueChange={setSelectedAddressId}
                      className="space-y-2"
                    >
                      {addresses.map((a) => {
                        const isSelected = selectedAddressId === String(a.id);
                        const addrDist = (() => {
                          if (!storeHasCoords || !a.latitude || !a.longitude) return null;
                          return haversineDistance(
                            storeLocation.latitude!, storeLocation.longitude!,
                            a.latitude, a.longitude,
                          );
                        })();
                        const addrOutside = addrDist !== null && fees.deliveryMaxRadiusKm > 0 && addrDist > fees.deliveryMaxRadiusKm;

                        return (
                          <div
                            key={a.id}
                            className={cn(
                              'flex items-start gap-3 border rounded-md p-3 cursor-pointer transition-colors',
                              isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50',
                              addrOutside && 'border-destructive/40 opacity-70',
                            )}
                            onClick={() => setSelectedAddressId(String(a.id))}
                          >
                            <RadioGroupItem value={String(a.id)} id={`addr-${a.id}`} className="mt-0.5" />
                            <label htmlFor={`addr-${a.id}`} className="cursor-pointer flex-1">
                              <div className="text-sm font-medium flex items-center gap-1 flex-wrap">
                                {a.is_default && (
                                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                )}
                                {a.street}, {a.number}
                                {a.complement && ` - ${a.complement}`}
                                {addrOutside && (
                                  <Badge variant="destructive" className="text-xs ml-1">Fora do raio</Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap mt-0.5">
                                <span>{a.neighborhood} · {a.city}/{a.state}{a.zip_code && ` · CEP ${a.zip_code}`}</span>
                                {addrDist !== null && (
                                  <span className="text-primary/70">{addrDist.toFixed(1)} km</span>
                                )}
                              </div>
                            </label>
                          </div>
                        );
                      })}

                      <div
                        className="flex items-center gap-3 border border-dashed rounded-md p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => navigate('/profile?tab=address&new=1')}
                      >
                        <PlusCircle className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Adicionar novo endereço</span>
                      </div>
                    </RadioGroup>
                  )}

                  {/* Frete info */}
                  {selectedAddress && (
                    <div className={cn(
                      'rounded-md p-3 text-sm flex items-center gap-2',
                      isOutsideRange
                        ? 'bg-destructive/10 text-destructive'
                        : isFreeDelivery
                        ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                        : 'bg-muted/60 text-muted-foreground',
                    )}>
                      <Truck size={15} className="shrink-0" />
                      {isOutsideRange
                        ? `Endereço fora do raio máximo de entrega (${fees.deliveryMaxRadiusKm} km).`
                        : isFreeDelivery
                        ? `Entrega grátis${distanceKm !== null ? ` · ${distanceKm.toFixed(1)} km da loja` : ''}`
                        : `Frete: ${formatCurrency(deliveryFee)}${distanceKm !== null ? ` · ${distanceKm.toFixed(1)} km da loja` : ' (endereço sem coordenadas)'}`}
                    </div>
                  )}

                  {needsAssembly && (
                    <div className="rounded-md p-3 text-sm flex items-center gap-2 bg-muted/60 text-muted-foreground">
                      <Wrench size={15} className="shrink-0" />
                      Taxa de montagem: {formatCurrency(assemblyFee)}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ── Resumo ───────────────────────────────────────────────────── */}
            <div>
              <Card className="bg-gradient-surface border-border/50 sticky top-6">
                <CardHeader>
                  <CardTitle>Resumo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    {items.map((item, idx) => (
                      <div key={idx} className="flex justify-between gap-2">
                        <span className="text-muted-foreground truncate">
                          {item.product.name}
                          {item.variation ? ` (${item.variation.name})` : ''} ×{item.quantity}
                        </span>
                        <span className="shrink-0">{formatCurrency(unitPrice(item) * item.quantity)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal/dia</span>
                      <span>{formatCurrency(subtotalPerDay)}</span>
                    </div>

                    {datesSet && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          × {rentalDays()} dia{rentalDays() > 1 ? 's' : ''}
                        </span>
                        <span>{formatCurrency(subtotalTotal)}</span>
                      </div>
                    )}

                    {selectedAddress && deliveryFee > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Truck size={12} /> Frete
                        </span>
                        <span>{formatCurrency(deliveryFee)}</span>
                      </div>
                    )}

                    {selectedAddress && deliveryFee === 0 && selectedAddress !== null && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Truck size={12} /> Frete
                        </span>
                        <span className="text-green-600 dark:text-green-400">Grátis</span>
                      </div>
                    )}

                    {needsAssembly && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Wrench size={12} /> Montagem
                        </span>
                        <span>{formatCurrency(assemblyFee)}</span>
                      </div>
                    )}

                    {couponData && couponDiscount > 0 && (
                      <div className="flex justify-between text-green-600 dark:text-green-400">
                        <span className="flex items-center gap-1">
                          <Tag size={12} /> Cupom {couponData.code}
                        </span>
                        <span>−{formatCurrency(couponDiscount)}</span>
                      </div>
                    )}

                    <div className="flex justify-between border-t pt-2 font-bold text-base">
                      <span>Total estimado</span>
                      <span className="text-primary">{formatCurrency(grandTotal)}</span>
                    </div>
                  </div>

                  {isOutsideRange && (
                    <div className="rounded-md bg-destructive/10 border border-destructive/30 p-2 text-xs text-destructive text-center">
                      Endereço fora do raio de entrega. Selecione outro endereço.
                    </div>
                  )}

                  <Button
                    className="w-full" size="lg"
                    disabled={submitting || items.length === 0 || hasUnavailable || isOutsideRange}
                    onClick={handleSubmit}
                  >
                    {submitting
                      ? <Loader2 size={18} className="animate-spin mr-2" />
                      : <ShoppingCart size={18} className="mr-2" />}
                    Enviar Pedido
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Termos de Locação */}
      <Dialog open={showTermsModal} onOpenChange={setShowTermsModal}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Termos de Locação</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto rounded-md border p-4 text-sm whitespace-pre-wrap text-muted-foreground">
            {termsText || 'Nenhum termo cadastrado.'}
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Checkbox
              id="terms-check"
              checked={termsAccepted}
              onCheckedChange={(v) => setTermsAccepted(v === true)}
            />
            <label htmlFor="terms-check" className="text-sm cursor-pointer">
              Li e aceito os termos de locação
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTermsModal(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!termsAccepted || submitting}
              onClick={() => { setShowTermsModal(false); submitOrder(); }}
            >
              {submitting ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
              Confirmar e Enviar Pedido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ClientLayout>
  );
}
