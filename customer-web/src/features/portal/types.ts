export interface CustomerProfile {
  id: string;
  org_id: string;
  customer_code: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  segment?: string;
}

export interface CustomerMeResponse {
  customer: CustomerProfile;
  subscription?: CustomerSubscriptionProfile;
  branding: OrganizationBranding;
  session_id: string;
  expires_at: string;
}

export interface OrganizationBranding {
  app_title: string;
  app_description: string;
  icon_url?: string;
}

export interface CustomerSubscriptionProfile {
  id: string;
  customer_id: string;
  service_profile_id: string;
  service_profile_name?: string;
  service_type?: string;
  billing_type: string;
  payment_type: string;
  status: string;
  start_at: string;
  next_invoice_at?: string | null;
  next_suspend_at?: string | null;
}

export interface SpeedBoostOffer {
  id: string;
  code: string;
  name: string;
  description?: string;
  service_type: string;
  duration_days: number;
  price_rp: number;
  apply_mode: string;
  override_rate_limit: string;
  is_active: boolean;
}

export interface CustomerSpeedBoost {
  id: string;
  subscription_addon_id: string;
  offer_id?: string;
  invoice_id?: string;
  radius_account_username?: string;
  service_type: string;
  applied_rate_limit: string;
  addon_name_snapshot?: string;
  addon_status: string;
  payment_status: string;
  starts_at?: string | null;
  ends_at?: string | null;
  activated_at?: string | null;
  cancelled_at?: string | null;
  expired_at?: string | null;
  total_rp: number;
  created_at: string;
}

export interface CustomerSpeedBoostListResponse {
  items: CustomerSpeedBoost[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface InvoiceItem {
  id: string;
  item_type: string;
  description: string;
  qty: number;
  unit_price_rp: number;
  amount_rp: number;
}

export interface Invoice {
  id: string;
  invoice_no: string;
  customer_id: string;
  issue_date: string;
  due_date: string;
  total_rp: number;
  paid_rp: number;
  status: string;
  notes?: string;
  items?: InvoiceItem[];
}

export interface InvoiceListResponse {
  items: Invoice[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface PaymentLinkResponse {
  code: string;
  path: string;
  expires_at?: string;
}

export interface PortalConfigResponse {
  public_payment_base_url: string;
}

export interface PaymentGatewayChannel {
  code: string;
  name: string;
  is_available: boolean;
  min_amount_rp?: number;
  max_amount_rp?: number;
  fee_flat_rp?: number;
  fee_percent?: string;
  fee_merchant_rp?: number;
  fee_customer_rp?: number;
  total_amount_rp?: number;
  metadata_json?: unknown;
}

export interface PublicPaymentGateway {
  id: string;
  provider_code: string;
  display_name: string;
  environment: string;
  is_enabled: boolean;
  is_default_checkout: boolean;
  priority: number;
}

export interface PublicPaymentSessionInfo {
  code: string;
  path: string;
  source_type: string;
  source_id: string;
  title: string;
  description?: string;
  amount_rp: number;
  currency_code?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  status: string;
  last_transaction_id?: string;
  expires_at?: string | null;
  paid_at?: string | null;
}

export interface PublicPaymentInvoiceItem {
  id: string;
  item_type: string;
  description: string;
  qty: number;
  unit_price_rp: number;
  amount_rp: number;
}

export interface PublicPaymentInvoice {
  id: string;
  invoice_no: string;
  issue_date: string;
  due_date: string;
  total_rp: number;
  paid_rp: number;
  outstanding_rp: number;
  status: string;
  notes?: string;
  items?: PublicPaymentInvoiceItem[];
}

export interface PublicPaymentCustomer {
  id: string;
  customer_code: string;
  name: string;
  email?: string;
  phone?: string;
}

export interface PublicPaymentContext {
  session: PublicPaymentSessionInfo;
  invoice?: PublicPaymentInvoice | null;
  customer?: PublicPaymentCustomer | null;
  selected_gateway?: PublicPaymentGateway | null;
  provider_supported: boolean;
  provider_name?: string;
  channels?: PaymentGatewayChannel[] | null;
  manual_fallback: boolean;
  payment_allowed: boolean;
  message?: string;
}

export interface PublicCheckoutResult {
  checkout_url: string;
  transaction_id: string;
  merchant_ref: string;
  pay_code?: string;
  qr_url?: string;
  qr_string?: string;
  instructions?: unknown;
  status: string;
  channel_code?: string;
  channel_name?: string;
  provider_code?: string;
  reused_existing: boolean;
  provider_supported: boolean;
  provider_name?: string;
  expires_at?: string | null;
}

export interface PublicCheckoutRequest {
  gateway_id: string;
  channel_code: string;
  return_url: string;
  metadata_json?: unknown;
}

export interface ProfileFormState {
  name: string;
  email: string;
  phone: string;
  address: string;
}

export interface NotificationPreference {
  event_code: string;
  channel: 'push' | 'whatsapp' | 'email';
  enabled: boolean;
  priority: number;
}

export interface NotificationPreferenceFormState {
  pushEnabled: boolean;
  whatsAppEnabled: boolean;
  emailEnabled: boolean;
}
