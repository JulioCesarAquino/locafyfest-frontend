import apiClient from '@/services/apiClient';
import { resizeImage } from '@/lib/utils';

// ─── Types returned by the API ───────────────────────────────────────────────

export interface ProductImageAPI {
  id: number;
  image_path: string;
  is_primary: boolean;
  alt_text: string;
  sort_order: number;
}

export interface ProductVariationAPI {
  id: number;
  name: string;
  value: string;
  price_modifier: string;
  quantity_available: number;
  is_available: boolean;
}

export interface ProductComponentAPI {
  id: number;
  component_product_id: number;
  quantity: number;
  component_product?: {
    id: number;
    name: string;
    price: string;
    quantity_available: number;
    images?: ProductImageAPI[];
  };
}

export interface ProductAPI {
  id: number;
  name: string;
  description: string;
  price: string;
  quantity_available: number;
  is_available: boolean;
  is_featured: boolean;
  is_combo: boolean;
  requires_assembly?: boolean;
  minimum_rental_days: number;
  maximum_rental_days: number;
  deposit_amount: string;
  variations: ProductVariationAPI[];
  images: ProductImageAPI[];
  components: ProductComponentAPI[];
}

// ─── Form types ───────────────────────────────────────────────────────────────

export interface FormVariation {
  id?: number;
  nome: string;
  preco: number;
  quantidade: number;
}

export interface FormComponent {
  product_id: number;
  quantity: number;
}

export interface ProductForm {
  name: string;
  description: string;
  price: number;
  quantity_available: number;
  is_combo: boolean;
  is_available: boolean;
  requires_assembly: boolean;
  variations: FormVariation[];
  components: FormComponent[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function buildFormData(form: ProductForm, image?: File | null): Promise<FormData> {
  const fd = new FormData();
  fd.append('name', form.name);
  fd.append('description', form.description);
  fd.append('price', form.price.toFixed(2));
  fd.append('quantity_available', String(form.quantity_available));
  fd.append('is_combo', form.is_combo ? '1' : '0');
  fd.append('is_available', form.is_available ? '1' : '0');
  fd.append('requires_assembly', form.requires_assembly ? '1' : '0');

  if (form.variations.length > 0) {
    fd.append('variations', JSON.stringify(form.variations));
  }

  if (form.is_combo && form.components.length > 0) {
    fd.append('components', JSON.stringify(form.components));
  } else if (!form.is_combo) {
    fd.append('components', JSON.stringify([]));
  }

  if (image) {
    const resized = await resizeImage(image);
    fd.append('images[]', resized, 'product.jpg');
  }

  return fd;
}

// ─── API functions ────────────────────────────────────────────────────────────

export const checkProductAvailability = async (
  productId: number,
  startDate: string,
  endDate: string,
  quantity?: number,
  variationId?: number | null,
): Promise<{ available: boolean; available_quantity: number }> => {
  const response = await apiClient.post(`/products/${productId}/check-availability`, {
    start_date: startDate,
    end_date: endDate,
    quantity: quantity ?? 1,
    variation_id: variationId ?? null,
  });
  return response.data.data;
};

export const getProductById = async (id: number) => {
  const response = await apiClient.get(`/products/${id}`);
  return response.data;
};

export const getProducts = async (params?: {
  search?: string;
  include_unavailable?: boolean;
  per_page?: number;
}) => {
  const response = await apiClient.get('/products', {
    params: {
      ...params,
      include_unavailable: params?.include_unavailable ? 1 : undefined,
      per_page: params?.per_page ?? 100,
    },
  });
  return response.data;
};

export const createProduct = async (form: ProductForm, image?: File | null) => {
  const fd = await buildFormData(form, image);
  const response = await apiClient.post('/products', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const updateProduct = async (id: number, form: ProductForm, image?: File | null) => {
  // Send product data as JSON via PUT (no file upload issue)
  const payload: Record<string, unknown> = {
    name: form.name,
    description: form.description,
    price: form.price.toFixed(2),
    quantity_available: form.quantity_available,
    is_combo: form.is_combo,
    is_available: form.is_available,
    requires_assembly: form.requires_assembly,
    variations: form.variations,
    components: form.is_combo ? form.components : [],
  };
  await apiClient.put(`/products/${id}`, payload);

  // Upload new image separately if provided
  if (image) {
    const resized = await resizeImage(image);
    const fd = new FormData();
    fd.append('images[]', resized, 'product.jpg');
    await apiClient.post(`/products/${id}/upload-images`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }
};

export const deleteProduct = async (id: number) => {
  const response = await apiClient.delete(`/products/${id}`);
  return response.data;
};
