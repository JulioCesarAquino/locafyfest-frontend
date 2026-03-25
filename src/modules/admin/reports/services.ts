import apiClient from '@/services/apiClient';

export interface SalesReportSummary {
  total_orders: number;
  total_revenue: number | string;
  average_order_value: number | string;
}

export interface DailySale {
  date: string;
  orders: number;
  revenue: number | string;
}

export interface ReportTopProduct {
  name: string;
  total_quantity: number;
  total_revenue: number | string;
}

export interface ReportTopClient {
  name: string;
  email: string;
  total_orders: number;
  total_spent: number | string;
}

export interface SalesReport {
  period: { start_date: string; end_date: string };
  summary: SalesReportSummary;
  daily_sales: DailySale[];
  top_products: ReportTopProduct[];
  top_clients: ReportTopClient[];
}

export const getSalesReport = async (startDate: string, endDate: string): Promise<SalesReport> => {
  const response = await apiClient.get('/orders/sales-report', {
    params: { start_date: startDate, end_date: endDate },
  });
  return (response.data?.data ?? response.data) as SalesReport;
};
