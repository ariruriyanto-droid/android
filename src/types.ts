export interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: string;
  token: string;
}

export interface UserItem {
  id: number;
  full_name: string;
  phone_number: string;
  email: string | null;
  role: string;
  is_active: boolean;
  balance: number;
  created_at: string;
  updated_at?: string;
}

export interface TransactionItem {
  id: number;
  invoice_number: string;
  user_id?: number;
  user_name: string;
  user_phone: string;
  user_email?: string | null;
  product_id?: number;
  product_name: string;
  product_sku?: string;
  product_category?: string;
  product_brand?: string;
  target_number: string;
  price: number;
  price_cost?: number;
  margin?: number;
  supplier?: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
  sn_token: string | null;
  supplier_ref_id?: string | null;
  failure_reason?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface ProductItem {
  id: number;
  sku_code: string;
  name: string;
  category: string;
  brand: string;
  price_cost: number;
  price_sell: number;
  margin?: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ProductSummary {
  total_products: number;
  active_products: number;
  inactive_products: number;
  average_margin: number;
}

export interface ProductFilterParams {
  category?: string;
  brand?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ProductMutationPayload {
  sku_code?: string;
  name: string;
  category: string;
  brand: string;
  price_cost: number;
  price_sell: number;
  is_active?: boolean;
}

export interface FetchProductsResponse {
  success: boolean;
  summary: ProductSummary;
  pagination: {
    current_page: number;
    per_page: number;
    total_records: number;
    total_pages: number;
  };
  count: number;
  data: ProductItem[];
  message?: string;
}

export interface WithdrawalItem {
  id: number;
  withdrawal_number: string;
  user_id?: number;
  user_name: string;
  user_phone: string;
  user_email?: string | null;
  user_balance?: number;
  bank_name: string;
  account_number: string;
  account_holder_name: string;
  amount: number;
  fee: number;
  net_amount?: number;
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'REJECTED';
  rejection_reason?: string | null;
  approved_by?: number | null;
  approved_by_name?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface BalanceSummary {
  total_user_balance: number;
  total_system_balance: number;
  total_in_process: number;
  total_pending_count: number;
  total_pending_amount: number;
  total_success_count: number;
  total_success_amount: number;
  total_rejected_count: number;
  total_rejected_amount: number;
}

export interface WithdrawalFilterParams {
  search?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

export interface FetchWithdrawalsResponse {
  success: boolean;
  summary: BalanceSummary;
  pagination: {
    current_page: number;
    per_page: number;
    total_records: number;
    total_pages: number;
  };
  count: number;
  data: WithdrawalItem[];
  message?: string;
}

export interface ChartDataPoint {
  date: string;
  label: string;
  count: number;
  volume: number;
  profit?: number;
}

export interface FinancialReportSummary {
  gross_revenue: number;
  total_cogs: number;
  gross_profit: number;
  withdrawal_disbursed: number;
  withdrawal_fee_revenue: number;
  net_profit: number;
  total_transactions_count: number;
  successful_transactions_count: number;
  failed_transactions_count: number;
  pending_transactions_count: number;
  successful_withdrawals_count: number;
}

export interface CategoryReportItem {
  category_id: number;
  category_name: string;
  total_count: number;
  total_volume: number;
  estimated_cogs: number;
  gross_profit: number;
  percentage: number;
}

export interface DailyReportPoint {
  date: string;
  label: string;
  revenue: number;
  profit: number;
  transactions_count: number;
}

export interface FinancialReportData {
  period: {
    start_date: string;
    end_date: string;
    preset?: string;
  };
  summary: FinancialReportSummary;
  categories: CategoryReportItem[];
  daily_trend: DailyReportPoint[];
}

export interface FinancialReportFilterParams {
  preset?: 'today' | 'last_7_days' | 'last_30_days' | 'this_month' | 'last_month' | 'custom';
  start_date?: string;
  end_date?: string;
  category?: string;
}

export interface AdminProfile {
  id: number;
  username: string;
  email: string;
  role: string;
  created_at?: string;
  last_login?: string;
}

export interface SystemParameters {
  withdrawal_fee: number;
  min_withdrawal: number;
  max_withdrawal: number;
  min_deposit: number;
  maintenance_mode: boolean;
  gateway_timeout_seconds: number;
}

export interface GatewayHealth {
  name: string;
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  latency_ms: number;
  endpoint: string;
  webhook_status: 'ACTIVE' | 'INACTIVE';
  last_checked: string;
}

export interface DatabaseHealth {
  status: 'CONNECTED' | 'DISCONNECTED';
  latency_ms: number;
  server_version: string;
  total_users: number;
  total_transactions: number;
  total_withdrawals: number;
  last_checked: string;
}

export interface SystemSettingsData {
  profile: AdminProfile;
  parameters: SystemParameters;
  gateway: GatewayHealth;
  database: DatabaseHealth;
}

export interface ChangePasswordParams {
  old_password: string;
  new_password: string;
  confirm_password?: string;
}

export interface UpdateParametersParams {
  withdrawal_fee: number;
  min_withdrawal: number;
  max_withdrawal?: number;
  min_deposit: number;
  maintenance_mode: boolean;
  gateway_timeout_seconds?: number;
}

export interface DepositItem {
  id: number;
  deposit_number: string;
  user_id: number;
  user_name: string;
  user_phone: string;
  user_email?: string | null;
  user_balance?: number;
  amount: number;
  unique_code: number;
  total_payment: number;
  payment_method: string;
  status: 'PENDING' | 'SUCCESS' | 'EXPIRED' | 'REJECTED';
  approved_by?: number | null;
  approved_by_name?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface DepositSummary {
  total_success_amount: number;
  total_success_count: number;
  total_pending_amount: number;
  total_pending_count: number;
  total_rejected_amount: number;
  total_rejected_count: number;
  total_expired_count: number;
  verification_rate: number;
}

export interface DepositFilterParams {
  status?: string;
  payment_method?: string;
  search?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

export interface BalanceMutationItem {
  id: number;
  user_id: number;
  user_name?: string;
  user_phone?: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  balance_before: number;
  balance_after: number;
  reference_type: string;
  reference_id: string;
  description: string;
  created_at: string;
}

export interface BalanceMutationFilterParams {
  type?: string;
  user_id?: number;
  reference_type?: string;
  search?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

export type AdminTab =
  | 'dashboard'
  | 'transactions'
  | 'users'
  | 'products'
  | 'deposits'
  | 'withdrawals'
  | 'reports'
  | 'settings'
  | 'workflow'
  | 'architecture';

