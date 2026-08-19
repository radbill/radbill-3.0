import { createContext } from 'react';
import type {
  CustomerMeResponse,
  Invoice,
  NotificationPreferenceFormState,
  PublicCheckoutResult,
  PublicPaymentContext,
  ProfileFormState,
} from './types';

export interface PortalContextValue {
  me: CustomerMeResponse | null;
  invoices: Invoice[];
  selectedInvoice: Invoice | null;
  profileForm: ProfileFormState;
  loading: boolean;
  invoiceLoading: boolean;
  invoiceListLoadingMore: boolean;
  invoiceHasMore: boolean;
  invoiceTotalCount: number;
  profileSaving: boolean;
  logoutLoading: boolean;
  payingInvoiceID: string;
  paymentContextLoading: boolean;
  paymentCheckoutLoading: boolean;
  paymentContext: PublicPaymentContext | null;
  paymentCheckout: PublicCheckoutResult | null;
  paymentError: string;
  paymentChannelCode: string;
  publicPaymentBaseUrl: string;
  screenError: string;
  profileError: string;
  profileSuccess: string;
  notificationPreferences: NotificationPreferenceFormState;
  notificationPreferenceLoading: boolean;
  notificationPreferenceSaving: boolean;
  notificationPreferenceError: string;
  notificationPreferenceSuccess: string;
  pushPromptVisible: boolean;
  pushPromptLoading: boolean;
  pushPromptError: string;
  outstandingInvoices: Invoice[];
  outstandingTotal: number;
  nearestDueInvoice: Invoice | null;
  setProfileField: (field: keyof ProfileFormState, value: string) => void;
  clearProfileMessages: () => void;
  setNotificationPreferenceField: (field: keyof NotificationPreferenceFormState, value: boolean) => void;
  clearNotificationPreferenceMessages: () => void;
  setPaymentChannelCode: (value: string) => void;
  backToPaymentChannelSelection: () => void;
  openExternalPaymentCheckout: () => void;
  loadPortalData: () => Promise<void>;
  refreshInvoices: () => Promise<void>;
  loadMoreInvoices: () => Promise<void>;
  handleLogout: () => Promise<void>;
  handleInvoiceSelect: (invoiceID: string) => Promise<void>;
  closeInvoiceDetail: () => void;
  closePaymentModal: () => void;
  handleProfileSubmit: () => Promise<void>;
  handleNotificationPreferenceSubmit: () => Promise<void>;
  handlePayInvoice: (invoiceID: string) => Promise<void>;
  handlePaymentCheckout: () => Promise<void>;
  handlePushPromptEnable: () => Promise<void>;
  dismissPushPrompt: () => void;
}

export const PortalContext = createContext<PortalContextValue | null>(null);
