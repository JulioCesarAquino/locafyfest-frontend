import apiClient from '@/services/apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CompanyAddress {
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
  latitude: number | null;
  longitude: number | null;
}

export interface CompanyInfo {
  name: string;
  logo: string;
  email: string;
  phone: string;
  cnpj: string;
  website: string;
  address: CompanyAddress;
}

export interface WorkingHoursDay {
  start: string;
  end: string;
  active: boolean;
}

export interface WorkingHoursSettings {
  monday: WorkingHoursDay;
  tuesday: WorkingHoursDay;
  wednesday: WorkingHoursDay;
  thursday: WorkingHoursDay;
  friday: WorkingHoursDay;
  saturday: WorkingHoursDay;
  sunday: WorkingHoursDay;
}

export interface BusinessRulesSettings {
  cancellationPolicy: string;
  minimumRentalDays: number;
  maximumRentalDays: number;
  advanceBookingDays: number;
  securityDeposit: number;
  minimumOrderValue: number;
  termsAndConditions: string;
}

export interface FeeSettings {
  deliveryFee: number;
  assemblyFee: number;
  lateFeePerDay: number;
  lateFeePercentage: number;
  minimumLateFee: number;
  deliveryFreeRadiusKm: number;
  deliveryMaxRadiusKm: number;
}

export interface OrderBlockingSettings {
  enabled: boolean;
  type: 'indefinite' | 'today' | 'date_range';
  startDate: string;
  endDate: string;
  message: string;
}

export interface StoreLocation {
  latitude: number | null;
  longitude: number | null;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_COMPANY: CompanyInfo = {
  name: '', logo: '', email: '', phone: '', cnpj: '', website: '',
  address: { street: '', number: '', complement: '', neighborhood: '', city: '', state: '', zip_code: '', latitude: null, longitude: null },
};

export const DEFAULT_WORKING_HOURS: WorkingHoursSettings = {
  monday:    { start: '08:00', end: '18:00', active: true },
  tuesday:   { start: '08:00', end: '18:00', active: true },
  wednesday: { start: '08:00', end: '18:00', active: true },
  thursday:  { start: '08:00', end: '18:00', active: true },
  friday:    { start: '08:00', end: '18:00', active: true },
  saturday:  { start: '08:00', end: '16:00', active: true },
  sunday:    { start: '10:00', end: '14:00', active: false },
};

export const DEFAULT_BUSINESS_RULES: BusinessRulesSettings = {
  cancellationPolicy: '', minimumRentalDays: 1, maximumRentalDays: 30,
  advanceBookingDays: 60, securityDeposit: 20, minimumOrderValue: 0, termsAndConditions: '',
};

export const DEFAULT_FEES: FeeSettings = {
  deliveryFee: 50, assemblyFee: 100, lateFeePerDay: 15,
  lateFeePercentage: 2, minimumLateFee: 25, deliveryFreeRadiusKm: 10, deliveryMaxRadiusKm: 50,
};

export const DEFAULT_STORE_LOCATION: StoreLocation = { latitude: null, longitude: null };

export const DEFAULT_ORDER_BLOCKING: OrderBlockingSettings = {
  enabled: false,
  type: 'indefinite',
  startDate: '',
  endDate: '',
  message: 'Pedidos temporariamente suspensos. Em breve voltaremos ao normal.',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractSettingsMap(responseData: unknown): Record<string, unknown> {
  const d = (responseData as Record<string, unknown>)?.data;
  if (d && typeof d === 'object' && !Array.isArray(d)) return d as Record<string, unknown>;
  if (Array.isArray(responseData)) {
    return (responseData as Array<{ key: string; value: unknown; typed_value?: unknown }>).reduce<Record<string, unknown>>((acc, s) => {
      acc[s.key] = s.typed_value ?? s.value;
      return acc;
    }, {});
  }
  if (Array.isArray(d)) {
    return (d as Array<{ key: string; value: unknown; typed_value?: unknown }>).reduce<Record<string, unknown>>((acc, s) => {
      acc[s.key] = s.typed_value ?? s.value;
      return acc;
    }, {});
  }
  return {};
}

function parseJson<T>(val: unknown, fallback: T): T {
  if (!val) return fallback;
  if (typeof val === 'object') return { ...fallback, ...(val as T) };
  try { return { ...fallback, ...JSON.parse(val as string) }; } catch { return fallback; }
}

// ─── API ──────────────────────────────────────────────────────────────────────

async function fetchAllSettings(): Promise<Record<string, unknown>> {
  const res = await apiClient.get('/settings');
  return extractSettingsMap(res.data);
}

async function bulkUpsert(settings: Record<string, { value: unknown; data_type: string; group: string }>): Promise<void> {
  await apiClient.post('/settings/bulk-upsert', { settings });
}

// ─── Company ──────────────────────────────────────────────────────────────────

export async function getCompanyInfo(): Promise<CompanyInfo> {
  const map = await fetchAllSettings();
  return parseJson<CompanyInfo>(map['company_info'], DEFAULT_COMPANY);
}

export async function saveCompanyInfo(company: CompanyInfo): Promise<void> {
  await bulkUpsert({
    company_info: { value: company, data_type: 'json', group: 'company' },
    store_location: {
      value: { latitude: company.address.latitude, longitude: company.address.longitude },
      data_type: 'json', group: 'company',
    },
  });
}

// ─── Working Hours ────────────────────────────────────────────────────────────

export async function getWorkingHours(): Promise<WorkingHoursSettings> {
  const map = await fetchAllSettings();
  return parseJson<WorkingHoursSettings>(map['working_hours'], DEFAULT_WORKING_HOURS);
}

export async function saveWorkingHours(hours: WorkingHoursSettings): Promise<void> {
  await bulkUpsert({
    working_hours: { value: hours, data_type: 'json', group: 'company' },
  });
}

// ─── Business Rules ───────────────────────────────────────────────────────────

export async function getBusinessRules(): Promise<BusinessRulesSettings> {
  const map = await fetchAllSettings();
  return parseJson<BusinessRulesSettings>(map['business_rules'], DEFAULT_BUSINESS_RULES);
}

export async function saveBusinessRules(rules: BusinessRulesSettings): Promise<void> {
  await bulkUpsert({
    business_rules: { value: rules, data_type: 'json', group: 'orders' },
  });
}

// ─── Fee Settings ─────────────────────────────────────────────────────────────

export async function getFeeSettings(): Promise<FeeSettings> {
  const map = await fetchAllSettings();
  return parseJson<FeeSettings>(map['fee_settings'], DEFAULT_FEES);
}

export async function saveFeeSettings(fees: FeeSettings): Promise<void> {
  await bulkUpsert({
    fee_settings: { value: fees, data_type: 'json', group: 'orders' },
  });
}

// ─── Store Location ───────────────────────────────────────────────────────────

export async function getStoreLocation(): Promise<StoreLocation> {
  const map = await fetchAllSettings();
  return parseJson<StoreLocation>(map['store_location'], DEFAULT_STORE_LOCATION);
}

export async function saveStoreLocation(location: StoreLocation): Promise<void> {
  await bulkUpsert({
    store_location: { value: location, data_type: 'json', group: 'company' },
  });
}

// ─── Order Blocking ───────────────────────────────────────────────────────────

export async function getOrderBlockingSettings(): Promise<OrderBlockingSettings> {
  const map = await fetchAllSettings();
  return parseJson<OrderBlockingSettings>(map['order_blocking'], DEFAULT_ORDER_BLOCKING);
}

export async function saveOrderBlockingSettings(blocking: OrderBlockingSettings): Promise<void> {
  await bulkUpsert({
    order_blocking: { value: blocking, data_type: 'json', group: 'orders' },
  });
}

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function isOrdersCurrentlyBlocked(settings: OrderBlockingSettings): boolean {
  if (!settings.enabled) return false;
  if (settings.type === 'indefinite' || settings.type === 'today') return true;
  if (settings.type === 'date_range') {
    const today = localToday();
    return !!settings.startDate && !!settings.endDate
      && today >= settings.startDate && today <= settings.endDate;
  }
  return false;
}

// ─── Haversine ────────────────────────────────────────────────────────────────

export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
