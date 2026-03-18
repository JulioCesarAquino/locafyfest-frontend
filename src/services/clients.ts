import apiClient from './apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * source: campo que precisa ser adicionado ao backend (tabela users).
 * - 'app'          → cliente se cadastrou pelo portal
 * - 'manual'       → cadastrado pelo admin, sem acesso ao portal
 * - 'pending_link' → cliente app com dado coincidente com um cliente manual;
 *                    admin deve decidir se vincula os dois registros
 */
export type ClientSource = 'app' | 'manual' | 'pending_link';

export interface Client {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  cpf: string | null;
  cnpj: string | null;
  company_name: string | null;
  birth_date: string | null;
  person_type: 'pf' | 'pj' | null;
  user_type: 'client';
  is_active: boolean;
  email_verified_at: string | null;
  created_at: string;
  source: ClientSource;
  pending_link_user_id?: number;
  pending_link_user_name?: string;
  addresses?: ClientAddressEntry[];
}

export interface ClientOrder {
  id: number;
  order_number: string;
  status: string;
  rental_start_date: string;
  rental_end_date: string;
  total_amount: string;
  payment_status: string;
  created_at: string;
}

export interface ClientAddress {
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

export interface ClientAddressEntry extends ClientAddress {
  id: number;
  is_default?: boolean;
}

export interface CreateManualClientData {
  name: string;
  person_type: 'pf' | 'pj';
  phone?: string;
  email?: string;
  cpf?: string;
  cnpj?: string;
  company_name?: string;
  birth_date?: string;
  address?: ClientAddress;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeClient(raw: Record<string, unknown>): Client {
  const rel = raw.pending_link_user as { id?: number; name?: string } | null | undefined;
  return {
    ...(raw as unknown as Client),
    source: (raw.source as ClientSource) ?? 'app',
    // pending_link_user_name vem do relacionamento eager-loaded pelo backend
    pending_link_user_name: rel?.name ?? (raw.pending_link_user_name as string | undefined),
  };
}

// ─── Helpers de resposta ──────────────────────────────────────────────────────

/**
 * Extrai array de uma resposta que pode ser:
 *   - paginada:    { data: { data: [...] } }
 *   - não paginada: { data: [...] }
 *   - direto:       [...]
 */
function extractList(responseData: unknown): Record<string, unknown>[] {
  const d = (responseData as Record<string, unknown>)?.data;
  if (Array.isArray(d)) return d;                      // { data: [...] }
  if (d && Array.isArray((d as Record<string, unknown>).data))
    return (d as Record<string, unknown>).data as Record<string, unknown>[]; // paginado
  if (Array.isArray(responseData)) return responseData as Record<string, unknown>[];
  return [];
}

/**
 * Extrai objeto único de uma resposta que pode ser:
 *   - { data: { user: {...} } }  (show com stats)
 *   - { data: {...} }
 *   - {...}
 */
function extractOne(responseData: unknown): Record<string, unknown> {
  const d = (responseData as Record<string, unknown>)?.data;
  if (d && typeof d === 'object' && 'user' in (d as object))
    return (d as Record<string, unknown>).user as Record<string, unknown>;
  if (d && typeof d === 'object') return d as Record<string, unknown>;
  return responseData as Record<string, unknown>;
}

// ─── API functions ────────────────────────────────────────────────────────────

export const getClients = async (): Promise<Client[]> => {
  const response = await apiClient.get('/users/clients');
  return extractList(response.data).map(normalizeClient);
};

export const getClient = async (id: number): Promise<Client> => {
  const response = await apiClient.get(`/users/${id}`);
  return normalizeClient(extractOne(response.data));
};

export const createManualClient = async (data: CreateManualClientData): Promise<Client> => {
  const response = await apiClient.post('/users', {
    ...data,
    user_type: 'client',
    source: 'manual',
  });
  return normalizeClient(extractOne(response.data));
};

export interface UpdateManualClientData {
  name?: string;
  person_type?: 'pf' | 'pj';
  phone?: string | null;
  email?: string | null;
  cpf?: string | null;
  cnpj?: string | null;
  company_name?: string | null;
  birth_date?: string | null;
}

export const updateClient = async (id: number, data: UpdateManualClientData): Promise<Client> => {
  const response = await apiClient.put(`/users/${id}`, data);
  return normalizeClient(extractOne(response.data));
};

export const getClientOrders = async (clientId: number): Promise<ClientOrder[]> => {
  const response = await apiClient.get('/orders', {
    params: { client_id: clientId, per_page: 50 },
  });
  return extractList(response.data) as unknown as ClientOrder[];
};

export const createClientAddress = async (clientId: number, data: ClientAddress): Promise<ClientAddressEntry> => {
  const response = await apiClient.post(`/users/${clientId}/addresses`, data);
  const d = (response.data as Record<string, unknown>)?.data ?? response.data;
  return d as ClientAddressEntry;
};

export const updateClientAddress = async (addressId: number, data: Partial<ClientAddress>): Promise<ClientAddressEntry> => {
  const response = await apiClient.put(`/addresses/${addressId}`, data);
  return response.data as ClientAddressEntry;
};

export const deleteClientAddress = async (addressId: number): Promise<void> => {
  await apiClient.delete(`/addresses/${addressId}`);
};

export const setDefaultClientAddress = async (addressId: number): Promise<void> => {
  await apiClient.post(`/addresses/${addressId}/set-default`);
};

/**
 * Vincula um cliente manual a um cliente app.
 * Migra pedidos do manual para o app e remove o registro manual.
 */
export const linkClients = async (appClientId: number, manualClientId: number): Promise<void> => {
  await apiClient.post(`/users/${appClientId}/link`, {
    app_user_id: manualClientId,
  });
};

/**
 * Rejeita a vinculação pendente, confirmando que os dois registros
 * são cadastros de pessoas distintas (não uma duplicata).
 */
export const rejectClientLink = async (appClientId: number): Promise<void> => {
  await apiClient.post(`/users/${appClientId}/reject-link`);
};

export interface DeleteClientResult {
  deleted: boolean; // true = hard delete | false = soft delete (desativado)
  message: string;
}

/**
 * Exclui um cliente manual.
 * - Sem registros vinculados: hard delete permanente.
 * - Com registros (pedidos/endereços): soft delete — desativa e remove das listagens.
 */
export const deleteManualClient = async (clientId: number): Promise<DeleteClientResult> => {
  const res = await apiClient.delete(`/users/${clientId}`);
  return res.data as DeleteClientResult;
};
