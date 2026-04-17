import apiClient from './apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuditLog {
  id: number;
  user_name: string;
  user_type: string;
  action: string;
  resource: string;
  resource_id: number | null;
  description: string;
  method: string;
  endpoint: string;
  created_at: string;
}

export interface AuditFilters {
  from_date?: string;
  to_date?: string;
  user_type?: string;
  resource?: string;
  action?: string;
  search?: string;
  page?: number;
  per_page?: number;
}

export interface CreateAuditPayload {
  user_name: string;
  user_type: string;
  action: string;
  resource: string;
  resource_id: number | null;
  description: string;
  method: string;
  endpoint: string;
}

// ─── API functions ────────────────────────────────────────────────────────────

/**
 * Registra uma ação manualmente. Fire-and-forget: nunca lança exceção.
 * Use quando quiser enriquecer o log com contexto que o interceptor não tem
 * (ex.: nome do produto, número do pedido, etc.).
 */
export const logAction = async (payload: CreateAuditPayload): Promise<void> => {
  try {
    await apiClient.post('/audit-logs', payload);
  } catch {
    // Auditoria nunca pode quebrar o fluxo principal
  }
};

export const getAuditLogs = async (filters?: AuditFilters): Promise<AuditLog[]> => {
  const response = await apiClient.get('/audit-logs', { params: filters });
  const d = response.data?.data;
  if (Array.isArray(d)) return d as AuditLog[];
  if (d && Array.isArray((d as Record<string, unknown>).data))
    return (d as Record<string, unknown>).data as AuditLog[];
  if (Array.isArray(response.data)) return response.data as AuditLog[];
  return [];
};
