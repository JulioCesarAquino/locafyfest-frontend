import apiClient from '@/services/apiClient';

export interface FavoriteAPI {
  id: number;
  user_id: number;
  product_id: number;
  created_at: string;
  updated_at: string;
}

export async function getMyFavorites(): Promise<FavoriteAPI[]> {
  const res = await apiClient.get('/favorites/');
  const data = res.data;
  // suporta paginado { data: [...] } ou array direto
  return Array.isArray(data) ? data : (data.data ?? []);
}

export async function addFavorite(productId: number): Promise<FavoriteAPI> {
  const res = await apiClient.post('/favorites/', { product_id: productId });
  return res.data;
}

export async function removeFavorite(favoriteId: number): Promise<void> {
  await apiClient.delete(`/favorites/${favoriteId}`);
}
