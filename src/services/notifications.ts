import apiClient from './apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NotificationAPI {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  data?: Record<string, unknown> | null;
  action_url?: string | null;
  read_at?: string | null;
  expires_at?: string | null;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractList(responseData: unknown): NotificationAPI[] {
  const d = (responseData as Record<string, unknown>)?.data;
  if (Array.isArray(d)) return d as NotificationAPI[];
  if (d && Array.isArray((d as Record<string, unknown>).data))
    return (d as Record<string, unknown>).data as NotificationAPI[];
  if (Array.isArray(responseData)) return responseData as NotificationAPI[];
  return [];
}

// ─── API functions ─────────────────────────────────────────────────────────────

export const getMyNotifications = async (): Promise<NotificationAPI[]> => {
  const response = await apiClient.get('/notifications/my-notifications');
  return extractList(response.data);
};

export const getUnreadCount = async (): Promise<number> => {
  const response = await apiClient.get('/notifications/unread-count');
  const d = (response.data as Record<string, unknown>)?.data ?? response.data;
  return (d as Record<string, unknown>)?.count as number ?? 0;
};

export const markAsRead = async (id: number): Promise<void> => {
  await apiClient.post(`/notifications/${id}/mark-read`);
};

export const markAllAsRead = async (): Promise<void> => {
  await apiClient.post('/notifications/mark-all-read');
};

export const deleteNotification = async (id: number): Promise<void> => {
  await apiClient.delete(`/notifications/${id}`);
};

export const deleteAllNotifications = async (ids: number[]): Promise<void> => {
  await Promise.all(ids.map((id) => apiClient.delete(`/notifications/${id}`)));
};
