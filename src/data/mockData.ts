// Mock data for client-side functionality

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  description: string;
  available: boolean;
  variations?: string[];
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  address: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    cep: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  birthDate: string;
  emergencyContact?: {
    name: string;
    phone: string;
  };
}

export interface OrderItem {
  productId: string;
  productName: string;
  variation?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Order {
  id: string;
  clientId: string;
  items: OrderItem[];
  deliveryDate: string;
  returnDate: string;
  status: 'pending' | 'confirmed' | 'delivered' | 'returned' | 'cancelled';
  totalAmount: number;
  notes?: string;
  createdAt: string;
}

// Mock Products
export const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Mesa Redonda 1,20m',
    category: 'Mesas',
    price: 25.00,
    image: '/placeholder.svg',
    description: 'Mesa redonda de 1,20m para 6 pessoas',
    available: true,
    variations: ['Branca', 'Madeira']
  },
  {
    id: '2',
    name: 'Cadeira Tiffany',
    category: 'Cadeiras',
    price: 8.00,
    image: '/placeholder.svg',
    description: 'Cadeira Tiffany transparente',
    available: true,
    variations: ['Transparente', 'Dourada', 'Prata']
  },
  {
    id: '3',
    name: 'Toalha de Mesa',
    category: 'Toalhas',
    price: 15.00,
    image: '/placeholder.svg',
    description: 'Toalha de mesa redonda 1,20m',
    available: true,
    variations: ['Branca', 'Preta', 'Azul', 'Rosa']
  },
  {
    id: '4',
    name: 'Prato de Sobremesa',
    category: 'Louças',
    price: 2.50,
    image: '/placeholder.svg',
    description: 'Prato de sobremesa em porcelana',
    available: true
  },
  {
    id: '5',
    name: 'Taça de Champagne',
    category: 'Copos',
    price: 3.00,
    image: '/placeholder.svg',
    description: 'Taça de champagne em cristal',
    available: false
  },
  {
    id: '6',
    name: 'Aparelho de Jantar',
    category: 'Louças',
    price: 12.00,
    image: '/placeholder.svg',
    description: 'Aparelho de jantar completo (prato, garfo, faca, colher)',
    available: true
  }
];

// Mock Client (logged user)
export const mockLoggedClient: Client = {
  id: 'client-1',
  name: 'Maria Silva Santos',
  email: 'maria.santos@email.com',
  phone: '(11) 99999-9999',
  cpf: '123.456.789-00',
  address: {
    street: 'Rua das Flores',
    number: '123',
    complement: 'Apto 45',
    neighborhood: 'Centro',
    city: 'São Paulo',
    state: 'SP',
    cep: '01234-567',
    coordinates: {
      lat: -23.5505,
      lng: -46.6333
    }
  },
  birthDate: '1985-06-15',
  emergencyContact: {
    name: 'João Santos',
    phone: '(11) 88888-8888'
  }
};

// Mock Orders
export const mockOrders: Order[] = [
  {
    id: 'order-1',
    clientId: 'client-1',
    items: [
      {
        productId: '1',
        productName: 'Mesa Redonda 1,20m',
        variation: 'Branca',
        quantity: 5,
        unitPrice: 25.00,
        totalPrice: 125.00
      },
      {
        productId: '2',
        productName: 'Cadeira Tiffany',
        variation: 'Transparente',
        quantity: 30,
        unitPrice: 8.00,
        totalPrice: 240.00
      },
      {
        productId: '3',
        productName: 'Toalha de Mesa',
        variation: 'Branca',
        quantity: 5,
        unitPrice: 15.00,
        totalPrice: 75.00
      }
    ],
    deliveryDate: '2024-08-15',
    returnDate: '2024-08-16',
    status: 'confirmed',
    totalAmount: 440.00,
    notes: 'Casamento no jardim - cuidado com as toalhas',
    createdAt: '2024-08-01T10:00:00Z'
  },
  {
    id: 'order-2',
    clientId: 'client-1',
    items: [
      {
        productId: '4',
        productName: 'Prato de Sobremesa',
        quantity: 50,
        unitPrice: 2.50,
        totalPrice: 125.00
      },
      {
        productId: '6',
        productName: 'Aparelho de Jantar',
        quantity: 50,
        unitPrice: 12.00,
        totalPrice: 600.00
      }
    ],
    deliveryDate: '2024-09-20',
    returnDate: '2024-09-21',
    status: 'pending',
    totalAmount: 725.00,
    notes: 'Aniversário de 50 anos',
    createdAt: '2024-08-02T14:30:00Z'
  },
  {
    id: 'order-3',
    clientId: 'client-1',
    items: [
      {
        productId: '1',
        productName: 'Mesa Redonda 1,20m',
        variation: 'Madeira',
        quantity: 2,
        unitPrice: 25.00,
        totalPrice: 50.00
      },
      {
        productId: '2',
        productName: 'Cadeira Tiffany',
        variation: 'Dourada',
        quantity: 12,
        unitPrice: 8.00,
        totalPrice: 96.00
      }
    ],
    deliveryDate: '2024-07-10',
    returnDate: '2024-07-11',
    status: 'returned',
    totalAmount: 146.00,
    createdAt: '2024-06-25T16:45:00Z'
  }
];

export const productCategories = [
  'Todos',
  'Mesas',
  'Cadeiras',
  'Toalhas',
  'Louças',
  'Copos'
];

export const statusLabels = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  delivered: 'Entregue',
  returned: 'Devolvido',
  cancelled: 'Cancelado'
};

export const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  delivered: 'bg-green-100 text-green-800',
  returned: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800'
};