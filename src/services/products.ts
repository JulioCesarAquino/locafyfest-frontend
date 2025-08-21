import apiClient from './apiClient';

export interface ProductFormData {
  nome: string;
  descricao: string;
  foto: string;
  variacoes: Array<{
    nome: string;
    preco: number;
    quantidade: number;
  }>;
}

export interface CreateProductPayload {
  name: string;
  slug?: string;
  description: string;
  short_description?: string;
  category_id: number;
  price: string;
  quantity_available: number;
  is_available: boolean;
  is_featured: boolean;
  minimum_rental_days: number;
  maximum_rental_days: number;
  deposit_amount: string;
  specifications: Record<string, any>;
}

export interface ProductResponse {
  success: boolean;
  data: {
    id: number;
    name: string;
    slug: string;
    description: string;
    short_description: string;
    category_id: number;
    price: string;
    quantity_available: number;
    is_available: boolean;
    is_featured: boolean;
    minimum_rental_days: number;
    maximum_rental_days: number;
    deposit_amount: string;
    specifications: Record<string, any>;
    created_at: string;
    updated_at: string;
    category: any;
    variations: any[];
    images: any[];
  };
  message: string;
}

// Função para gerar slug a partir do nome
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^\w\s-]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, '-') // Substitui espaços por hífens
    .replace(/-+/g, '-') // Remove hífens duplicados
    .trim();
}

// Função para criar descrição curta
function generateShortDescription(description: string, maxLength: number = 100): string {
  if (description.length <= maxLength) {
    return description;
  }
  return description.substring(0, maxLength).trim() + '...';
}

export const createProduct = async (
  formData: ProductFormData,
  selectedImage?: File
): Promise<ProductResponse> => {
  try {
    // Calcular preço base (primeira variação ou média)
    const basePrice = formData.variacoes.length > 0 
      ? formData.variacoes[0].preco 
      : 0;

    // Calcular quantidade total disponível
    const totalQuantity = formData.variacoes.reduce(
      (sum, variacao) => sum + variacao.quantidade, 
      0
    );

    // Montar payload para o backend
    const payload: CreateProductPayload = {
      name: formData.nome,
      slug: generateSlug(formData.nome),
      description: formData.descricao,
      short_description: generateShortDescription(formData.descricao),
      category_id: 1, // Valor padrão - pode ser configurável futuramente
      price: basePrice.toFixed(2),
      quantity_available: totalQuantity || 1,
      is_available: true,
      is_featured: false,
      minimum_rental_days: 1,
      maximum_rental_days: 7,
      deposit_amount: (basePrice * 0.3).toFixed(2), // 30% do preço como depósito
      specifications: {
        material: "Não especificado",
        cor: "Não especificado"
      }
    };

    // Se precisar enviar com FormData (para imagem)
    if (selectedImage) {
      const formDataToSend = new FormData();
      
      // Adicionar todos os campos do payload
      Object.entries(payload).forEach(([key, value]) => {
        if (typeof value === 'object') {
          formDataToSend.append(key, JSON.stringify(value));
        } else {
          formDataToSend.append(key, value.toString());
        }
      });

      // Adicionar variações se existirem
      if (formData.variacoes.length > 0) {
        formDataToSend.append('variations', JSON.stringify(formData.variacoes));
      }

      // Adicionar imagem
      formDataToSend.append('image', selectedImage);

      const response = await apiClient.post<ProductResponse>('/products', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } else {
      // Enviar JSON simples se não houver imagem
      const dataToSend = {
        ...payload,
        variations: formData.variacoes.length > 0 ? formData.variacoes : []
      };

      const response = await apiClient.post<ProductResponse>('/products', dataToSend);
      return response.data;
    }
  } catch (error: any) {
    console.error('Erro ao criar produto:', error);
    
    // Tratar diferentes tipos de erro
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    } else if (error.message) {
      throw new Error(error.message);
    } else {
      throw new Error('Erro inesperado ao criar produto');
    }
  }
};

// Função para listar produtos
export const getProducts = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  category_id?: number;
}) => {
  try {
    const response = await apiClient.get('/products', { params });
    return response.data;
  } catch (error: any) {
    console.error('Erro ao buscar produtos:', error);
    throw new Error(error.response?.data?.message || 'Erro ao buscar produtos');
  }
};

// Função para buscar produto por ID
export const getProductById = async (id: string | number) => {
  try {
    const response = await apiClient.get(`/products/${id}`);
    return response.data;
  } catch (error: any) {
    console.error('Erro ao buscar produto:', error);
    throw new Error(error.response?.data?.message || 'Erro ao buscar produto');
  }
};

// Função para atualizar produto
export const updateProduct = async (
  id: string | number,
  formData: ProductFormData,
  selectedImage?: File
) => {
  try {
    const basePrice = formData.variacoes.length > 0 
      ? formData.variacoes[0].preco 
      : 0;

    const totalQuantity = formData.variacoes.reduce(
      (sum, variacao) => sum + variacao.quantidade, 
      0
    );

    const payload: CreateProductPayload = {
      name: formData.nome,
      slug: generateSlug(formData.nome),
      description: formData.descricao,
      short_description: generateShortDescription(formData.descricao),
      category_id: 1,
      price: basePrice.toFixed(2),
      quantity_available: totalQuantity || 1,
      is_available: true,
      is_featured: false,
      minimum_rental_days: 1,
      maximum_rental_days: 7,
      deposit_amount: (basePrice * 0.3).toFixed(2),
      specifications: {
        material: "Não especificado",
        cor: "Não especificado"
      }
    };

    if (selectedImage) {
      const formDataToSend = new FormData();
      
      Object.entries(payload).forEach(([key, value]) => {
        if (typeof value === 'object') {
          formDataToSend.append(key, JSON.stringify(value));
        } else {
          formDataToSend.append(key, value.toString());
        }
      });

      if (formData.variacoes.length > 0) {
        formDataToSend.append('variations', JSON.stringify(formData.variacoes));
      }

      formDataToSend.append('image', selectedImage);

      const response = await apiClient.put(`/products/${id}`, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } else {
      const dataToSend = {
        ...payload,
        variations: formData.variacoes.length > 0 ? formData.variacoes : []
      };

      const response = await apiClient.put(`/products/${id}`, dataToSend);
      return response.data;
    }
  } catch (error: any) {
    console.error('Erro ao atualizar produto:', error);
    throw new Error(error.response?.data?.message || 'Erro ao atualizar produto');
  }
};

// Função para deletar produto
export const deleteProduct = async (id: string | number) => {
  try {
    const response = await apiClient.delete(`/products/${id}`);
    return response.data;
  } catch (error: any) {
    console.error('Erro ao deletar produto:', error);
    throw new Error(error.response?.data?.message || 'Erro ao deletar produto');
  }
};