import apiClient from '@/services/apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CouponAPI {
  id: number;
  code: string;
  type: 'percentage' | 'fixed';
  value: string;
  usage_limit: number | null;
  used_count: number;
  active: boolean;
  expires_at: string | null;
  description: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCouponPayload {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  usage_limit?: number | null;
  active?: boolean;
  expires_at?: string | null;
  description?: string | null;
}

export interface UpdateCouponPayload {
  code?: string;
  type?: 'percentage' | 'fixed';
  value?: number;
  usage_limit?: number | null;
  active?: boolean;
  expires_at?: string | null;
  description?: string | null;
}

export interface ValidateCouponResponse {
  id: number;
  code: string;
  type: 'percentage' | 'fixed';
  value: string;
  description: string | null;
}

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
  if (d && typeof d === 'object') return d;
  return responseData;
}

// ─── API functions ─────────────────────────────────────────────────────────────

export const getCoupons = async (params?: { search?: string; active?: boolean }): Promise<CouponAPI[]> => {
  const response = await apiClient.get('/coupons', { params: { per_page: 100, ...params } });
  return extractList(response.data) as CouponAPI[];
};

export const getCoupon = async (id: number): Promise<CouponAPI> => {
  const response = await apiClient.get(`/coupons/${id}`);
  return extractOne(response.data) as CouponAPI;
};

export const createCoupon = async (data: CreateCouponPayload): Promise<CouponAPI> => {
  const response = await apiClient.post('/coupons', data);
  return extractOne(response.data) as CouponAPI;
};

export const updateCoupon = async (id: number, data: UpdateCouponPayload): Promise<CouponAPI> => {
  const response = await apiClient.put(`/coupons/${id}`, data);
  return extractOne(response.data) as CouponAPI;
};

export const deleteCoupon = async (id: number): Promise<void> => {
  await apiClient.delete(`/coupons/${id}`);
};

export const toggleCoupon = async (id: number): Promise<CouponAPI> => {
  const response = await apiClient.post(`/coupons/${id}/toggle`);
  return extractOne(response.data) as CouponAPI;
};

export const validateCoupon = async (code: string): Promise<ValidateCouponResponse> => {
  const response = await apiClient.post('/coupons/validate', { code });
  return extractOne(response.data) as ValidateCouponResponse;
};
