# LocaFyFest — Referência para React Native

Documento gerado para servir como base no desenvolvimento do app React Native.
Cobre: endpoints da API, tipos de dados, autenticação e gerenciamento de estado.

---

## 1. Variáveis de Ambiente

```
VITE_API_URL=https://seu-dominio.com/api/v1
VITE_STORAGE_URL=https://seu-dominio.com/storage
VITE_APP_NAME=abcê
VITE_APP_SUBTITLE=Festas e Eventos
VITE_VAPID_PUBLIC_KEY=sua_chave_vapid_publica_aqui
```

> No React Native substituir `VITE_` por variáveis de ambiente do `react-native-dotenv` ou `@env`.

---

## 2. Autenticação

### Fluxo de Token

- Token armazenado em `localStorage` com chave `access_token`
- Enviado em todas as requisições via header: `Authorization: Bearer <token>`
- **Refresh automático**: ao receber 401 (exceto em `/auth/login`), dispara `POST /auth/refresh`, salva novo token e retenta a requisição original
- **Logout**: limpa todas as chaves do storage e redireciona para `/login`

### Chaves do Storage

| Chave | Valor |
|---|---|
| `access_token` | JWT token |
| `user_type` | `'admin'` \| `'client'` \| `'super_admin'` |
| `user_name` | Nome do usuário |
| `user_avatar` | Path do avatar |
| `user_permissions` | JSON array de permissões |
| `client_id` | ID do usuário |

> No React Native usar `AsyncStorage` ou `expo-secure-store` no lugar de `localStorage`.

---

## 3. Endpoints — Autenticação

**Base:** `POST /auth/login`

| Método | Endpoint | Request | Response |
|---|---|---|---|
| POST | `/auth/login` | `{ email, password }` | `{ access_token }` |
| POST | `/auth/refresh` | — | `{ access_token }` |
| GET | `/auth/me` | — | `SignInPayload` |
| POST | `/auth/register` | `RegisterPayload` | `{ pending_link? }` |
| POST | `/auth/activate-manual-client` | `{ manual_client_id, password, password_confirmation }` | — |
| POST | `/auth/verify-email` | `{ email, code }` | — |
| POST | `/auth/resend-verification` | `{ email }` | — |
| POST | `/auth/forgot-password` | `{ email }` | — |
| POST | `/auth/reset-password` | `{ email, code, password, password_confirmation }` | — |

```typescript
interface SignInPayload {
  token: string;
  type: 'admin' | 'client' | 'super_admin';
  name: string;
  avatarPath: string;
}

interface RegisterPayload {
  name: string;
  email: string;
  phone?: string;
  password: string;
  password_confirmation: string;
  person_type: 'pf' | 'pj';
  user_type: 'client';
  cpf?: string;
  cnpj?: string;
  company_name?: string;
}
```

---

## 4. Endpoints — Produtos

| Método | Endpoint | Request | Response |
|---|---|---|---|
| GET | `/products` | `{ search?, include_unavailable?, per_page? }` | `ProductAPI[]` |
| GET | `/products/{id}` | — | `ProductAPI` |
| POST | `/products/{id}/check-availability` | `{ start_date, end_date, quantity?, variation_id? }` | `{ available, available_quantity }` |
| POST | `/products` | FormData | `ProductAPI` |
| PUT | `/products/{id}` | campos do produto | `ProductAPI` |
| POST | `/products/{id}/upload-images` | FormData | — |
| POST | `/products/{id}/upload-variation-images` | FormData | — |
| DELETE | `/products/{id}` | — | `{ deleted: boolean }` |

```typescript
interface ProductAPI {
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

interface ProductImageAPI {
  id: number;
  image_path: string;
  is_primary: boolean;
  alt_text: string;
  sort_order: number;
}

interface ProductVariationAPI {
  id: number;
  name: string;
  value: string;
  image_path: string | null;
  price_modifier: string;
  quantity_available: number;
  is_available: boolean;
}

interface ProductComponentAPI {
  id: number;
  component_product_id: number;
  quantity: number;
  is_selectable_by_customer: boolean;
  component_product?: {
    id: number;
    name: string;
    price: string;
    quantity_available: number;
    images?: ProductImageAPI[];
    variations?: ProductVariationAPI[];
  };
}
```

---

## 5. Endpoints — Pedidos

| Método | Endpoint | Request | Response |
|---|---|---|---|
| GET | `/orders/my-orders` | — | `OrderAPI[]` |
| GET | `/orders` | `{ client_id?, status?, per_page? }` | `OrderAPI[]` |
| GET | `/orders/{id}` | — | `OrderAPI` |
| POST | `/orders` | `CreateOrderPayload` | `OrderAPI` |
| POST | `/orders/{id}/confirm` | — | `OrderAPI` |
| POST | `/orders/{id}/cancel` | `{ reason? }` | `OrderAPI` |
| POST | `/orders/{id}/deliver` | — | `OrderAPI` |
| POST | `/orders/{id}/return` | — | `OrderAPI` |
| PUT | `/orders/{id}` | `{ status?, delivery_fee? }` | `OrderAPI` |
| POST | `/orders/{id}/mark-paid` | `{ method }` | `OrderAPI` |
| POST | `/orders/{id}/apply-discount` | `{ discount_type, discount_value }` | `OrderAPI` |
| GET | `/orders/sales-report` | `{ start_date, end_date }` | `SalesReport` |

```typescript
interface OrderAPI {
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

interface OrderItemAPI {
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

interface OrderAddressAPI {
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

interface SalesReport {
  period: { start_date: string; end_date: string };
  summary: {
    total_orders: number;
    total_revenue: number | string;
    average_order_value: number | string;
  };
  daily_sales: Array<{ date: string; orders: number; revenue: number | string }>;
  top_products: Array<{ name: string; total_quantity: number; total_revenue: number | string }>;
  top_clients: Array<{ name: string; email: string; total_orders: number; total_spent: number | string }>;
}
```

---

## 6. Endpoints — Notas Fiscais

| Método | Endpoint | Request | Response |
|---|---|---|---|
| GET | `/orders/{id}/invoice` | — | `InvoiceAPI` |
| POST | `/orders/{id}/invoice/request` | `RequestInvoicePayload` | `InvoiceAPI` |
| PATCH | `/orders/{id}/invoice` | `UpdateInvoicePayload` | `InvoiceAPI` |
| POST | `/orders/{id}/invoice/upload-pdf` | FormData | `InvoiceAPI` |
| GET | `/orders/{id}/invoice/download?token={token}` | — | arquivo PDF |

```typescript
interface InvoiceAPI {
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
```

---

## 7. Endpoints — Cupons

| Método | Endpoint | Request | Response |
|---|---|---|---|
| GET | `/coupons` | `{ search?, active?, per_page? }` | `CouponAPI[]` |
| GET | `/coupons/{id}` | — | `CouponAPI` |
| POST | `/coupons` | `CreateCouponPayload` | `CouponAPI` |
| PUT | `/coupons/{id}` | `UpdateCouponPayload` | `CouponAPI` |
| DELETE | `/coupons/{id}` | — | — |
| POST | `/coupons/{id}/toggle` | — | `CouponAPI` |
| POST | `/coupons/validate` | `{ code }` | `ValidateCouponResponse` |
| GET | `/coupons/has-active` | — | `{ has_active: boolean }` |

```typescript
interface CouponAPI {
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

interface ValidateCouponResponse {
  id: number;
  code: string;
  type: 'percentage' | 'fixed';
  value: string;
  description: string | null;
}
```

---

## 8. Endpoints — Favoritos

| Método | Endpoint | Request | Response |
|---|---|---|---|
| GET | `/favorites/` | — | `FavoriteAPI[]` |
| POST | `/favorites/` | `{ product_id }` | `FavoriteAPI` |
| DELETE | `/favorites/{id}` | — | — |

```typescript
interface FavoriteAPI {
  id: number;
  user_id: number;
  product_id: number;
  created_at: string;
  updated_at: string;
}
```

---

## 9. Endpoints — Clientes

| Método | Endpoint | Request | Response |
|---|---|---|---|
| GET | `/users/clients` | — | `Client[]` |
| GET | `/users/{id}` | — | `Client` |
| POST | `/users` | `CreateManualClientData` | `Client` |
| PUT | `/users/{id}` | `UpdateManualClientData` | `Client` |
| DELETE | `/users/{id}` | — | `DeleteClientResult` |
| GET | `/user` | — | objeto User atual |
| GET | `/addresses` | — | `ClientAddressEntry[]` |
| PUT | `/me` | `{ name?, phone?, terms_accepted? }` | objeto User |
| POST | `/users/{id}/change-password` | `{ current_password, new_password, new_password_confirmation }` | — |
| POST | `/users/{id}/upload-profile-picture` | FormData | `{ profile_picture_path }` |
| POST | `/users/{id}/addresses` | `ClientAddress` | `ClientAddressEntry` |
| PUT | `/addresses/{id}` | `Partial<ClientAddress>` | `ClientAddressEntry` |
| DELETE | `/addresses/{id}` | — | — |
| POST | `/addresses/{id}/set-default` | — | — |
| POST | `/users/{id}/link` | `{ app_user_id }` | — |
| POST | `/users/{id}/reject-link` | — | — |

```typescript
interface Client {
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
  source: 'app' | 'manual' | 'pending_link';
  pending_link_user_id?: number;
  pending_link_user_name?: string;
  addresses?: ClientAddressEntry[];
}

interface ClientAddress {
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

interface ClientAddressEntry extends ClientAddress {
  id: number;
  is_default?: boolean;
}
```

---

## 10. Endpoints — Administradores

| Método | Endpoint | Request | Response |
|---|---|---|---|
| GET | `/admin/admins` | `{ search?, status? }` | `Admin[]` |
| GET | `/admin/admins/{id}` | — | `Admin` |
| POST | `/admin/admins` | `CreateAdminData` | `Admin` |
| PUT | `/admin/admins/{id}` | `UpdateAdminData` | `Admin` |
| DELETE | `/admin/admins/{id}` | — | — |
| POST | `/admin/admins/{id}/toggle-status` | — | `Admin` |
| POST | `/admin/admins/{id}/permissions` | `{ permissions: string[] }` | `Admin` |
| POST | `/admin/admins/{id}/upload-photo` | FormData | `Admin` |
| POST | `/admin/admins/{id}/reset-password` | `ResetPasswordData` | — |
| PUT | `/admin/profile` | `UpdateProfileData` | `Admin` |
| POST | `/admin/profile/change-password` | `ChangePasswordData` | — |
| POST | `/admin/profile/upload-photo` | FormData | `Admin` |
| DELETE | `/admin/profile/remove-photo` | — | `Admin` |

```typescript
interface Admin {
  id: number;
  name: string;
  email: string;
  phone?: string;
  user_type: 'admin' | 'client';
  permissions: string[];
  is_active: boolean;
  profile_picture_path?: string;
  last_login?: string;
  created_at: string;
  updated_at: string;
}
```

---

## 11. Endpoints — Notificações

| Método | Endpoint | Request | Response |
|---|---|---|---|
| GET | `/notifications/my-notifications` | — | `NotificationAPI[]` |
| GET | `/notifications/unread-count` | — | `{ count: number }` |
| POST | `/notifications/{id}/mark-read` | — | — |
| POST | `/notifications/mark-all-read` | — | — |
| DELETE | `/notifications/{id}` | — | — |
| POST | `/push-subscriptions` | `PushSubscription.toJSON()` | — |
| DELETE | `/push-subscriptions` | `{ endpoint }` | — |

```typescript
interface NotificationAPI {
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
```

---

## 12. Endpoints — Configurações (Admin)

| Método | Endpoint | Request | Response |
|---|---|---|---|
| GET | `/settings` | — | mapa de configurações |
| POST | `/settings/bulk-upsert` | `{ settings: Record<string, SettingValue> }` | — |

```typescript
interface CompanyInfo {
  name: string;
  logo: string;
  email: string;
  phone: string;
  cnpj: string;
  website: string;
  address: CompanyAddress;
}

interface WorkingHoursSettings {
  monday: WorkingHoursDay;
  tuesday: WorkingHoursDay;
  wednesday: WorkingHoursDay;
  thursday: WorkingHoursDay;
  friday: WorkingHoursDay;
  saturday: WorkingHoursDay;
  sunday: WorkingHoursDay;
}

interface WorkingHoursDay {
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
  active: boolean;
}

interface BusinessRulesSettings {
  cancellationPolicy: string;
  minimumRentalDays: number;
  maximumRentalDays: number;
  advanceBookingDays: number;
  securityDeposit: number;
  minimumOrderValue: number;
  termsAndConditions: string;
}

interface FeeSettings {
  deliveryFee: number;
  assemblyFee: number;
  lateFeePerDay: number;
  lateFeePercentage: number;
  minimumLateFee: number;
  deliveryFreeRadiusKm: number;
  deliveryMaxRadiusKm: number;
}

interface OrderBlockingSettings {
  enabled: boolean;
  type: 'indefinite' | 'today' | 'date_range';
  startDate: string;
  endDate: string;
  message: string;
}

interface StoreLocation {
  latitude: number | null;
  longitude: number | null;
}
```

---

## 13. Estado Global (Contextos)

### AuthContext

```typescript
type UserType = 'admin' | 'client' | 'super_admin';

interface AuthContextData {
  isAuthenticated: boolean;
  userType: UserType | null;
  userName: string;
  userAvatarPath: string;
  clientId: number | null;
  permissions: string[];
  permissionsLoaded: boolean;
  signIn: (payload: SignInPayload) => void;
  signOut: () => void;
  updateUserName: (name: string) => void;
  updateUserAvatarPath: (path: string) => void;
  updatePermissions: (permissions: string[]) => void;
}
```

### CartContext

```typescript
interface ComponentSelection {
  component_product_id: number;
  variation_id: number;
}

interface CartItem {
  product: ProductAPI;
  variation?: ProductVariationAPI;
  componentSelections?: ComponentSelection[];
  quantity: number;
}

interface CartContextData {
  items: CartItem[];
  totalItems: number;
  addItem: (product: ProductAPI, variation?: ProductVariationAPI, qty?: number, componentSelections?: ComponentSelection[]) => void;
  updateQuantity: (index: number, qty: number) => void;
  removeItem: (index: number) => void;
  clearCart: () => void;
}
```

> Storage key do carrinho: `locafyfest_cart`

### ThemeContext

```typescript
type Theme = 'light' | 'dark' | 'system';

interface ThemeContextData {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}
```

> Storage key do tema: `theme`

---

## 14. Localização dos Tipos no Código-Fonte

| Domínio | Arquivo |
|---|---|
| Auth | `src/services/authService.ts` |
| Notificações | `src/services/notifications.ts` |
| Produtos | `src/modules/admin/products/services.ts` |
| Pedidos / NF | `src/modules/admin/orders/services.ts` |
| Cupons | `src/modules/admin/coupons/services.ts` |
| Favoritos | `src/modules/client/favorites/services.ts` |
| Clientes | `src/modules/admin/clients/services.ts` |
| Admins | `src/modules/admin/admins/services.ts` |
| Configurações | `src/modules/admin/settings/services.ts` |
| AuthContext | `src/contexts/AuthContext.tsx` |
| CartContext | `src/contexts/CartContext.tsx` |
| ThemeContext | `src/contexts/ThemeContext.tsx` |
