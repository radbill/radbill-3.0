import { type PropsWithChildren, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError, fetchApi, fetchPublicApi } from '../../shared/api';
import {
  explainPushActivationError,
  getPushPermissionSnapshot,
  PushSetupError,
  revokeCustomerPushInstallation,
  syncCustomerPushInstallation,
} from '../push/pushNotifications';
import { PortalContext, type PortalContextValue } from './portalContext';
import type {
  CustomerMeResponse,
  CustomerProfile,
  Invoice,
  InvoiceListResponse,
  NotificationPreference,
  NotificationPreferenceFormState,
  PublicCheckoutRequest,
  PublicCheckoutResult,
  PublicPaymentContext,
  PortalConfigResponse,
  PaymentLinkResponse,
  ProfileFormState,
} from './types';

const PUSH_PROMPT_DISMISS_STORAGE = 'customer_push_prompt_dismissed';
const INVOICE_PAGE_LIMIT = 20;

interface PushRecipientConfigResponse {
  enabled: boolean;
  preference_enabled: boolean;
}

export function PortalProvider({ children }: PropsWithChildren) {
	const queryClient = useQueryClient();
  const navigate = useNavigate();
  const pushSyncRef = useRef<string>('');
  const [me, setMe] = useState<CustomerMeResponse | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoicePage, setInvoicePage] = useState(1);
  const [invoiceHasMore, setInvoiceHasMore] = useState(false);
  const [invoiceListLoadingMore, setInvoiceListLoadingMore] = useState(false);
  const [invoiceTotalCount, setInvoiceTotalCount] = useState(0);
  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    name: '',
    email: '',
    phone: '',
    address: '',
  });
  const [loading, setLoading] = useState(true);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [notificationPreferenceLoading, setNotificationPreferenceLoading] = useState(false);
  const [notificationPreferenceSaving, setNotificationPreferenceSaving] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [payingInvoiceID, setPayingInvoiceID] = useState('');
  const [paymentContextLoading, setPaymentContextLoading] = useState(false);
  const [paymentCheckoutLoading, setPaymentCheckoutLoading] = useState(false);
  const [paymentContext, setPaymentContext] = useState<PublicPaymentContext | null>(null);
  const [paymentCheckout, setPaymentCheckout] = useState<PublicCheckoutResult | null>(null);
  const [paymentError, setPaymentError] = useState('');
  const [paymentChannelCode, setPaymentChannelCode] = useState('');
  const [publicPaymentBaseUrl, setPublicPaymentBaseUrl] = useState('');
  const [screenError, setScreenError] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferenceFormState>({
    pushEnabled: true,
    whatsAppEnabled: true,
    emailEnabled: true,
  });
  const [notificationPreferenceSnapshot, setNotificationPreferenceSnapshot] = useState<NotificationPreferenceFormState>({
    pushEnabled: true,
    whatsAppEnabled: true,
    emailEnabled: true,
  });
  const [notificationPreferenceError, setNotificationPreferenceError] = useState('');
  const [notificationPreferenceSuccess, setNotificationPreferenceSuccess] = useState('');
  const [pushPromptVisible, setPushPromptVisible] = useState(false);
  const [pushPromptLoading, setPushPromptLoading] = useState(false);
  const [pushPromptError, setPushPromptError] = useState('');

  const handlePortalError = (error: unknown) => {
    if (error instanceof ApiError && error.status === 401) {
      localStorage.removeItem('customer_access_token');
      navigate('/login');
      return;
    }
    setScreenError(error instanceof Error ? error.message : 'Terjadi kesalahan pada portal');
  };

  const pushPromptDismissKey = (customerID: string) => `${PUSH_PROMPT_DISMISS_STORAGE}:${customerID}`;

  const dismissPushPrompt = () => {
    if (me?.customer.id) {
      window.localStorage.setItem(pushPromptDismissKey(me.customer.id), '1');
    }
    setPushPromptVisible(false);
    setPushPromptError('');
  };

  const loadPortalData = async () => {
    setLoading(true);
    setScreenError('');
    try {
      const [meResponse, invoicesResponse, configResponse] = await Promise.all([
        fetchApi<CustomerMeResponse>('/customer/me'),
        fetchApi<InvoiceListResponse>(`/customer/invoices?page=1&limit=${INVOICE_PAGE_LIMIT}`),
        fetchApi<PortalConfigResponse>('/customer/config'),
      ]);

      const customer = meResponse.data.customer;
      setMe(meResponse.data);
      setInvoices(invoicesResponse.data.items);
      setPublicPaymentBaseUrl(configResponse.data.public_payment_base_url ?? '');
      setInvoicePage(invoicesResponse.data.meta.page);
      setInvoiceTotalCount(invoicesResponse.data.meta.total);
      setInvoiceHasMore(invoicesResponse.data.meta.page*invoicesResponse.data.meta.limit < invoicesResponse.data.meta.total);
      setProfileForm({
        name: customer.name ?? '',
        email: customer.email ?? '',
        phone: customer.phone ?? '',
        address: customer.address ?? '',
      });
      void loadNotificationPreferences();
    } catch (error) {
      handlePortalError(error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreInvoices = async () => {
    if (invoiceListLoadingMore || !invoiceHasMore) {
      return;
    }

    setInvoiceListLoadingMore(true);
    setScreenError('');
    try {
      const nextPage = invoicePage + 1;
      const response = await fetchApi<InvoiceListResponse>(`/customer/invoices?page=${nextPage}&limit=${INVOICE_PAGE_LIMIT}`);
      setInvoices((current) => [...current, ...response.data.items.filter((item) => !current.some((existing) => existing.id === item.id))]);
      setInvoicePage(response.data.meta.page);
      setInvoiceTotalCount(response.data.meta.total);
      setInvoiceHasMore(response.data.meta.page*response.data.meta.limit < response.data.meta.total);
    } catch (error) {
      handlePortalError(error);
    } finally {
      setInvoiceListLoadingMore(false);
    }
  };

  const refreshInvoices = async () => {
    const response = await fetchApi<InvoiceListResponse>(`/customer/invoices?page=1&limit=${INVOICE_PAGE_LIMIT}`);
    setInvoices(response.data.items);
    setInvoicePage(response.data.meta.page);
    setInvoiceTotalCount(response.data.meta.total);
    setInvoiceHasMore(response.data.meta.page * response.data.meta.limit < response.data.meta.total);
  };

  const loadNotificationPreferences = async () => {
    setNotificationPreferenceLoading(true);
    setNotificationPreferenceError('');
    try {
      const response = await fetchApi<NotificationPreference[]>('/customer/notification-preferences');
      const nextState: NotificationPreferenceFormState = {
        pushEnabled: false,
        whatsAppEnabled: false,
        emailEnabled: false,
      };
      for (const item of response.data) {
        if (item.channel === 'push') {
          nextState.pushEnabled = item.enabled;
        } else if (item.channel === 'whatsapp') {
          nextState.whatsAppEnabled = item.enabled;
        } else if (item.channel === 'email') {
          nextState.emailEnabled = item.enabled;
        }
      }
      setNotificationPreferences(nextState);
      setNotificationPreferenceSnapshot(nextState);
    } catch (error) {
      if (error instanceof ApiError) {
        setNotificationPreferenceError(error.message);
      } else {
        setNotificationPreferenceError('Gagal memuat preferensi notifikasi.');
      }
    } finally {
      setNotificationPreferenceLoading(false);
    }
  };

  // Initial bootstrap intentionally runs once; later refreshes use the exposed action.
  /* oxlint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    void loadPortalData();
  }, []);
  /* oxlint-enable react-hooks/exhaustive-deps */

  useEffect(() => {
    if (!me?.customer.id || pushSyncRef.current === me.customer.id) {
      return;
    }
    pushSyncRef.current = me.customer.id;
    void syncCustomerPushInstallation({ requestPermission: false }).catch((error: unknown) => {
      console.warn('Failed to sync customer push installation', error);
    });
  }, [me?.customer.id]);

  useEffect(() => {
    if (!me?.customer.id) {
      setPushPromptVisible(false);
      setPushPromptError('');
      return;
    }

    let cancelled = false;

    const evaluatePushPrompt = async () => {
      try {
        const [snapshot, configResponse] = await Promise.all([
          getPushPermissionSnapshot(),
          fetchApi<PushRecipientConfigResponse>('/customer/push/config'),
        ]);
        if (cancelled) {
          return;
        }

        const dismissed = window.localStorage.getItem(pushPromptDismissKey(me.customer.id)) === '1';
        const shouldShow =
          snapshot.supported &&
          snapshot.permission === 'default' &&
          configResponse.data.enabled &&
          configResponse.data.preference_enabled &&
          !dismissed;

        setPushPromptVisible(shouldShow);
        if (!shouldShow) {
          setPushPromptError('');
        }
      } catch (error) {
        if (!cancelled) {
          console.warn('Failed to evaluate push prompt visibility', error);
          setPushPromptVisible(false);
        }
      }
    };

    void evaluatePushPrompt();

    return () => {
      cancelled = true;
    };
  }, [me?.customer.id]);

  const outstandingInvoices = useMemo(
    () => invoices.filter((invoice) => invoice.total_rp > invoice.paid_rp && invoice.status !== 'void'),
    [invoices],
  );

  const outstandingTotal = useMemo(
    () => outstandingInvoices.reduce((sum, invoice) => sum + Math.max(invoice.total_rp - invoice.paid_rp, 0), 0),
    [outstandingInvoices],
  );

  const nearestDueInvoice = useMemo(() => {
    return [...outstandingInvoices].sort((left, right) => Date.parse(left.due_date) - Date.parse(right.due_date))[0] ?? null;
  }, [outstandingInvoices]);

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await revokeCustomerPushInstallation();
      await fetchApi<{ revoked: boolean }>('/customer/auth/logout', { method: 'POST' });
    } catch {
      // Tetap hapus token lokal walau revoke session gagal.
    } finally {
      localStorage.removeItem('customer_access_token');
      queryClient.clear();
      navigate('/login');
      setLogoutLoading(false);
    }
  };

  const handleInvoiceSelect = async (invoiceID: string) => {
    setInvoiceLoading(true);
    setScreenError('');
    try {
      const response = await fetchApi<Invoice>(`/customer/invoices/${invoiceID}`);
      setSelectedInvoice(response.data);
    } catch (error) {
      handlePortalError(error);
    } finally {
      setInvoiceLoading(false);
    }
  };

  const closeInvoiceDetail = () => {
    setSelectedInvoice(null);
  };

  const handleProfileSubmit = async () => {
    setProfileSaving(true);
    setProfileError('');
    setProfileSuccess('');

    try {
      const response = await fetchApi<CustomerProfile>('/customer/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          name: profileForm.name,
          email: profileForm.email,
          phone: profileForm.phone,
          address: profileForm.address,
        }),
      });

      if (me) {
        setMe({ ...me, customer: response.data });
      }
      setProfileSuccess('Profil berhasil diperbarui.');
    } catch (error) {
      if (error instanceof ApiError) {
        setProfileError(error.message);
      } else {
        setProfileError('Gagal memperbarui profil.');
      }
    } finally {
      setProfileSaving(false);
    }
  };

  const handleNotificationPreferenceSubmit = async () => {
    setNotificationPreferenceSaving(true);
    setNotificationPreferenceError('');
    setNotificationPreferenceSuccess('');
    try {
      const enablingPush = notificationPreferences.pushEnabled && !notificationPreferenceSnapshot.pushEnabled;
      if (enablingPush) {
        await syncCustomerPushInstallation({ requestPermission: true });
      }
      await fetchApi<NotificationPreference[]>('/customer/notification-preferences', {
        method: 'PUT',
        body: JSON.stringify({
          items: [
            { channel: 'push', enabled: notificationPreferences.pushEnabled, priority: 0 },
            { channel: 'whatsapp', enabled: notificationPreferences.whatsAppEnabled, priority: 1 },
            { channel: 'email', enabled: notificationPreferences.emailEnabled, priority: 2 },
          ],
        }),
      });
      if (notificationPreferences.pushEnabled) {
        await syncCustomerPushInstallation({ requestPermission: false });
      } else {
        await revokeCustomerPushInstallation();
      }
      setNotificationPreferenceSnapshot(notificationPreferences);
      setNotificationPreferenceSuccess('Preferensi notifikasi berhasil diperbarui.');
    } catch (error) {
      console.error('Saving customer notification preferences failed', error);
      if (error instanceof PushSetupError) {
        setNotificationPreferenceError(error.message);
      } else if (error instanceof ApiError) {
        setNotificationPreferenceError(error.message);
      } else {
        setNotificationPreferenceError(explainPushActivationError(error));
      }
    } finally {
      setNotificationPreferenceSaving(false);
    }
  };

  const handlePayInvoice = async (invoiceID: string) => {
    setPayingInvoiceID(invoiceID);
    setScreenError('');
    setPaymentError('');
    setPaymentCheckout(null);
    try {
      const response = await fetchApi<PaymentLinkResponse>(`/customer/invoices/${invoiceID}/pay`, {
        method: 'POST',
      });
      setPaymentContextLoading(true);
      const paymentResponse = await fetchPublicApi<PublicPaymentContext>(`/payment/short/${encodeURIComponent(response.data.code)}`);
      const context = paymentResponse.data;
      setPaymentContext(context);
      const nextChannelCode =
        context.channels?.find((channel) => channel.is_available)?.code ??
        context.channels?.[0]?.code ??
        '';
      setPaymentChannelCode(nextChannelCode);
      if (!context.payment_allowed && context.message) {
        setPaymentError(context.message);
      }
    } catch (error) {
      handlePortalError(error);
    } finally {
      setPaymentContextLoading(false);
      setPayingInvoiceID('');
    }
  };

  const closePaymentModal = () => {
    setPaymentContext(null);
    setPaymentCheckout(null);
    setPaymentError('');
    setPaymentChannelCode('');
  };

  const backToPaymentChannelSelection = () => {
    setPaymentCheckout(null);
    setPaymentError('');
  };

  const openExternalPaymentCheckout = () => {
    const checkoutUrl = paymentCheckout?.checkout_url?.trim() ?? '';
    if (!checkoutUrl) {
      setPaymentError('Halaman pembayaran eksternal belum tersedia.');
      return;
    }

    window.location.assign(checkoutUrl);
  };

  const handlePaymentCheckout = async () => {
    if (!paymentContext) {
      return;
    }

    const gatewayID = paymentContext.selected_gateway?.id?.trim() ?? '';
    const channelCode = paymentChannelCode.trim();

    if (!paymentContext.payment_allowed) {
      setPaymentError(paymentContext.message || 'Pembayaran untuk invoice ini sedang tidak tersedia.');
      return;
    }
    if (!gatewayID) {
      setPaymentError('Gateway pembayaran belum tersedia.');
      return;
    }
    if (!channelCode) {
      setPaymentError('Pilih channel pembayaran terlebih dahulu.');
      return;
    }

    setPaymentCheckoutLoading(true);
    setPaymentError('');
    try {
      const payload: PublicCheckoutRequest = {
        gateway_id: gatewayID,
        channel_code: channelCode,
        return_url: window.location.href,
        metadata_json: {
          source: 'customer_portal_pwa',
        },
      };
      const response = await fetchPublicApi<PublicCheckoutResult>(
        `/payment/short/${encodeURIComponent(paymentContext.session.code)}/checkout`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      );
      setPaymentCheckout(response.data);
    } catch (error) {
      if (error instanceof ApiError) {
        setPaymentError(error.message);
        return;
      }
      setPaymentError('Gagal membuat instruksi pembayaran.');
    } finally {
      setPaymentCheckoutLoading(false);
    }
  };

  const setProfileField = (field: keyof ProfileFormState, value: string) => {
    setProfileForm((current) => ({ ...current, [field]: value }));
  };

  const clearProfileMessages = () => {
    setProfileError('');
    setProfileSuccess('');
  };

  const setNotificationPreferenceField = (field: keyof NotificationPreferenceFormState, value: boolean) => {
    setNotificationPreferences((current) => ({ ...current, [field]: value }));
  };

  const clearNotificationPreferenceMessages = () => {
    setNotificationPreferenceError('');
    setNotificationPreferenceSuccess('');
  };

  const handlePushPromptEnable = async () => {
    setPushPromptLoading(true);
    setPushPromptError('');
    try {
      if (!notificationPreferences.pushEnabled) {
        await fetchApi<NotificationPreference[]>('/customer/notification-preferences', {
          method: 'PUT',
          body: JSON.stringify({
            items: [
              { channel: 'push', enabled: true, priority: 0 },
              { channel: 'whatsapp', enabled: notificationPreferences.whatsAppEnabled, priority: 1 },
              { channel: 'email', enabled: notificationPreferences.emailEnabled, priority: 2 },
            ],
          }),
        });
        setNotificationPreferences((current) => ({ ...current, pushEnabled: true }));
        setNotificationPreferenceSnapshot((current) => ({ ...current, pushEnabled: true }));
      }
      await syncCustomerPushInstallation({ requestPermission: true });
      setPushPromptVisible(false);
    } catch (error) {
      console.error('Enabling customer push prompt failed', error);
      if (error instanceof PushSetupError) {
        setPushPromptError(error.message);
      } else if (error instanceof ApiError) {
        setPushPromptError(error.message);
      } else {
        setPushPromptError(explainPushActivationError(error));
      }
    } finally {
      setPushPromptLoading(false);
    }
  };

  const value: PortalContextValue = {
    me,
    invoices,
    selectedInvoice,
    profileForm,
    loading,
    invoiceLoading,
    invoiceListLoadingMore,
    invoiceHasMore,
    invoiceTotalCount,
    profileSaving,
    logoutLoading,
    payingInvoiceID,
    paymentContextLoading,
    paymentCheckoutLoading,
    paymentContext,
    paymentCheckout,
    paymentError,
    paymentChannelCode,
    publicPaymentBaseUrl,
    screenError,
    profileError,
    profileSuccess,
    notificationPreferences,
    notificationPreferenceLoading,
    notificationPreferenceSaving,
    notificationPreferenceError,
    notificationPreferenceSuccess,
    pushPromptVisible,
    pushPromptLoading,
    pushPromptError,
    outstandingInvoices,
    outstandingTotal,
    nearestDueInvoice,
    setProfileField,
    clearProfileMessages,
    setNotificationPreferenceField,
    clearNotificationPreferenceMessages,
    setPaymentChannelCode,
    backToPaymentChannelSelection,
    openExternalPaymentCheckout,
    loadPortalData,
    refreshInvoices,
    loadMoreInvoices,
    handleLogout,
    handleInvoiceSelect,
    closeInvoiceDetail,
    closePaymentModal,
    handleProfileSubmit,
    handleNotificationPreferenceSubmit,
    handlePayInvoice,
    handlePaymentCheckout,
    handlePushPromptEnable,
    dismissPushPrompt,
  };

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
}
