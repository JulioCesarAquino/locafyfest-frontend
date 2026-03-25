import apiClient from '@/services/apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OrderItemAPI {
  id: number;
  product_id: number;
  variation_id: number | null;
  quantity: number;
  unit_price: string;
  total_price?: string;
  product?: { id: number; name: string };
  variation?: { id: number; name: string };
  product_snapshot?: { name?: string; price?: string } | null;
}

export interface OrderAddressAPI {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface OrderAPI {
  id: number;
  order_number: string;
  client_id: number;
  status: string;
  rental_start_date: string;
  rental_end_date: string;
  subtotal?: string;
  delivery_fee?: string;
  discount_amount?: string;
  discount_type?: 'percentage' | 'fixed' | null;
  discount_value?: string | null;
  coupon_code?: string | null;
  total_amount: string;
  deposit_amount?: string;
  payment_status: string;
  payment_method?: string | null;
  notes?: string | null;
  cancellation_reason?: string | null;
  confirmed_at?: string | null;
  delivered_at?: string | null;
  returned_at?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  client?: { id: number; name: string; phone?: string | null; email?: string | null };
  items?: OrderItemAPI[];
  address?: OrderAddressAPI;
  delivery_address?: OrderAddressAPI;
}

export interface CreateOrderItemPayload {
  product_id: number;
  product_variation_id?: number | null;
  quantity: number;
}

export interface CreateOrderPayload {
  client_id: number;
  delivery_address_id: number;
  items: CreateOrderItemPayload[];
  rental_start_date: string;
  rental_end_date: string;
  status?: string;
  notes?: string;
  delivery_fee?: number;
  assembly_fee?: number;
  discount_type?: 'percentage' | 'fixed';
  discount_value?: number;
  coupon_code?: string;
}

export interface ApplyDiscountPayload {
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
}

export interface InvoiceAddressAPI {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
}

export interface InvoiceAPI {
  id: number;
  order_id: number;
  status: 'requested' | 'processing' | 'issued';
  billing_address_id: number | null;
  billing_address?: InvoiceAddressAPI | null;
  cpf_override: string | null;
  cnpj_override: string | null;
  company_name_override: string | null;
  access_key: string | null;
  pdf_url: string | null;
  admin_notes: string | null;
  requested_at: string;
  issued_at: string | null;
}

export interface RequestInvoicePayload {
  billing_address_id?: number;
  cpf_override?: string;
  cnpj_override?: string;
  company_name_override?: string;
}

export interface UpdateInvoicePayload {
  status?: 'requested' | 'processing' | 'issued';
  access_key?: string;
  admin_notes?: string;
}

// Status actions available per status
export type OrderStatusAction = 'confirm' | 'cancel' | 'deliver' | 'return';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractList(responseData: unknown): unknown[] {
  const d = (responseData as Record<string, unknown>)?.data;
  if (Array.isArray(d)) return d;
  if (d && Array.isArray((d as Record<string, unknown>).data))
    return (d as Record<string, unknown>).data as unknown[];
  if (Array.isArray(responseData)) return responseData as unknown[];
  return [];
}

function extractOne(responseData: unknown): unknown {
  const d = (responseData as Record<string, unknown>)?.data;
  if (d && typeof d === 'object') {
    // handle { data: { order: {...} } }
    const inner = d as Record<string, unknown>;
    if (inner.order && typeof inner.order === 'object') return inner.order;
    return d;
  }
  return responseData;
}

// ─── API functions ─────────────────────────────────────────────────────────────

export const getMyOrders = async (): Promise<OrderAPI[]> => {
  const response = await apiClient.get('/orders/my-orders');
  return extractList(response.data) as OrderAPI[];
};

export const getOrders = async (params?: {
  client_id?: number;
  status?: string;
  per_page?: number;
}): Promise<OrderAPI[]> => {
  const response = await apiClient.get('/orders', { params: { per_page: 100, ...params } });
  return extractList(response.data) as OrderAPI[];
};

export const getOrder = async (id: number): Promise<OrderAPI> => {
  const response = await apiClient.get(`/orders/${id}`);
  return extractOne(response.data) as OrderAPI;
};

export const createOrder = async (data: CreateOrderPayload): Promise<OrderAPI> => {
  const response = await apiClient.post('/orders', data);
  return extractOne(response.data) as OrderAPI;
};

export const performOrderAction = async (id: number, action: OrderStatusAction, reason?: string): Promise<OrderAPI> => {
  const body = action === 'cancel' && reason ? { reason } : {};
  const response = await apiClient.post(`/orders/${id}/${action}`, body);
  return extractOne(response.data) as OrderAPI;
};

export const updateOrderStatus = async (id: number, status: string): Promise<OrderAPI> => {
  const response = await apiClient.put(`/orders/${id}`, { status });
  return extractOne(response.data) as OrderAPI;
};

export const updateOrderDeliveryFee = async (id: number, deliveryFee: number): Promise<OrderAPI> => {
  const response = await apiClient.put(`/orders/${id}`, { delivery_fee: deliveryFee });
  return extractOne(response.data) as OrderAPI;
};

export const processPayment = async (id: number, method: string): Promise<OrderAPI> => {
  const response = await apiClient.post(`/orders/${id}/mark-paid`, { method });
  return extractOne(response.data) as OrderAPI;
};

export const applyOrderDiscount = async (id: number, data: ApplyDiscountPayload): Promise<OrderAPI> => {
  const response = await apiClient.post(`/orders/${id}/apply-discount`, data);
  return extractOne(response.data) as OrderAPI;
};

// ─── Invoice functions ─────────────────────────────────────────────────────────

function extractInvoice(responseData: unknown): InvoiceAPI {
  const d = (responseData as Record<string, unknown>)?.data;
  return (d ?? responseData) as InvoiceAPI;
}

export const getOrderInvoice = async (orderId: number): Promise<InvoiceAPI> => {
  const response = await apiClient.get(`/orders/${orderId}/invoice`);
  return extractInvoice(response.data);
};

export const requestInvoice = async (orderId: number, data: RequestInvoicePayload): Promise<InvoiceAPI> => {
  const response = await apiClient.post(`/orders/${orderId}/invoice/request`, data);
  return extractInvoice(response.data);
};

export const updateInvoice = async (orderId: number, data: UpdateInvoicePayload): Promise<InvoiceAPI> => {
  const response = await apiClient.patch(`/orders/${orderId}/invoice`, data);
  return extractInvoice(response.data);
};

export const uploadInvoicePdf = async (orderId: number, file: File, extra?: { access_key?: string; admin_notes?: string }): Promise<InvoiceAPI> => {
  const form = new FormData();
  form.append('pdf', file);
  if (extra?.access_key) form.append('access_key', extra.access_key);
  if (extra?.admin_notes) form.append('admin_notes', extra.admin_notes);
  const response = await apiClient.post(`/orders/${orderId}/invoice/upload-pdf`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return extractInvoice(response.data);
};

export const downloadInvoicePdf = (orderId: number): string => {
  const base = apiClient.defaults.baseURL ?? '';
  const token = localStorage.getItem('access_token') ?? '';
  return `${base}/orders/${orderId}/invoice/download?token=${token}`;
};
