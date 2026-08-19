import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../../../shared/ui';
import type { PaymentGatewayChannel, PublicCheckoutResult, PublicPaymentContext } from '../types';
import { formatCurrency, formatDate, humanizeStatus, normalizeStatus } from '../utils';

type PaymentInstructionGroup = {
  title: string;
  steps: string[];
};

const allowedInstructionTags = new Set(['B', 'STRONG', 'I', 'EM', 'BR']);

interface PaymentCheckoutModalProps {
  paymentContext: PublicPaymentContext | null;
  paymentCheckout: PublicCheckoutResult | null;
  paymentError: string;
  paymentChannelCode: string;
  paymentContextLoading: boolean;
  paymentCheckoutLoading: boolean;
  onClose: () => void;
  onBackToChannelSelection: () => void;
  onChannelChange: (value: string) => void;
  onCheckout: () => Promise<void> | void;
  onOpenExternalCheckout: () => void;
}

function normalizePaymentInstructions(value: unknown): PaymentInstructionGroup[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }
      const record = item as Record<string, unknown>;
      const title = typeof record.title === 'string' ? record.title.trim() : '';
      const steps = Array.isArray(record.steps)
        ? record.steps
            .filter((step): step is string => typeof step === 'string')
            .map((step) => step.trim())
            .filter(Boolean)
        : [];

      if (!title && steps.length === 0) {
        return null;
      }

      return {
        title: title || 'Instruksi pembayaran',
        steps,
      };
    })
    .filter((item): item is PaymentInstructionGroup => item !== null);
}

function channelLimitLabel(channel: PaymentGatewayChannel) {
  const limits = [];
  if (typeof channel.min_amount_rp === 'number' && channel.min_amount_rp > 0) {
    limits.push(`Min ${formatCurrency(channel.min_amount_rp)}`);
  }
  if (typeof channel.max_amount_rp === 'number' && channel.max_amount_rp > 0) {
    limits.push(`Maks ${formatCurrency(channel.max_amount_rp)}`);
  }
  return limits.join(' • ');
}

function channelFeeLabel(channel: PaymentGatewayChannel) {
  const parts = [];
  if (typeof channel.fee_customer_rp === 'number' && channel.fee_customer_rp > 0) {
    parts.push(`Biaya ${formatCurrency(channel.fee_customer_rp)}`);
  }
  if (typeof channel.total_amount_rp === 'number' && channel.total_amount_rp > 0) {
    parts.push(`Total ${formatCurrency(channel.total_amount_rp)}`);
  }
  return parts.join(' • ');
}

function channelIconUrl(channel: PaymentGatewayChannel) {
  if (!channel.metadata_json || typeof channel.metadata_json !== 'object') {
    return '';
  }

  const iconUrl = (channel.metadata_json as Record<string, unknown>).icon_url;
  return typeof iconUrl === 'string' ? iconUrl.trim() : '';
}

function escapeInstructionHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function sanitizeInstructionHtml(value: string) {
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return escapeInstructionHtml(value);
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<body>${value}</body>`, 'text/html');

  const sanitizeNode = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return escapeInstructionHtml(node.textContent || '');
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

    const element = node as HTMLElement;
    const tagName = element.tagName.toUpperCase();
    const children = Array.from(element.childNodes).map(sanitizeNode).join('');

    if (!allowedInstructionTags.has(tagName)) {
      return children;
    }

    if (tagName === 'BR') {
      return '<br />';
    }

    const normalizedTag = tagName === 'B' ? 'strong' : tagName.toLowerCase();
    return `<${normalizedTag}>${children}</${normalizedTag}>`;
  };

  return Array.from(doc.body.childNodes).map(sanitizeNode).join('');
}

function SummaryLabelIcon({ type }: { type: 'amount' | 'due-date' | 'status' }) {
  if (type === 'amount') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3v18" />
        <path d="M16.5 7.5c0-1.93-2.01-3.5-4.5-3.5S7.5 5.57 7.5 7.5 9.51 11 12 11s4.5 1.57 4.5 3.5S14.49 18 12 18s-4.5-1.57-4.5-3.5" />
      </svg>
    );
  }

  if (type === 'due-date') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 2v4" />
        <path d="M16 2v4" />
        <path d="M3 10h18" />
        <rect x="3" y="4" width="18" height="17" rx="2" ry="2" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="m9.5 12 1.75 1.75L14.75 10" />
    </svg>
  );
}

function CopyIcon({ copied }: { copied: boolean }) {
  if (copied) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m5 12 4 4L19 6" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2" ry="2" />
      <path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export function PaymentCheckoutModal({
  paymentContext,
  paymentCheckout,
  paymentError,
  paymentChannelCode,
  paymentContextLoading,
  paymentCheckoutLoading,
  onClose,
  onBackToChannelSelection,
  onChannelChange,
  onCheckout,
  onOpenExternalCheckout,
}: PaymentCheckoutModalProps) {
  const [copyFeedback, setCopyFeedback] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (!paymentContext && !paymentContextLoading) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !paymentCheckoutLoading) {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [paymentContext, paymentContextLoading, paymentCheckoutLoading, onClose]);

  const instructions = useMemo(
    () => normalizePaymentInstructions(paymentCheckout?.instructions),
    [paymentCheckout?.instructions],
  );

  useEffect(() => {
    setCopyFeedback('idle');
  }, [paymentCheckout?.pay_code]);

  if (!paymentContext && !paymentContextLoading) {
    return null;
  }

  const handleCopyPayCode = async () => {
    const payCode = paymentCheckout?.pay_code?.trim();
    if (!payCode) {
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payCode);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = payCode;
        textArea.setAttribute('readonly', 'true');
        textArea.style.position = 'absolute';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      setCopyFeedback('success');
      window.setTimeout(() => setCopyFeedback('idle'), 2000);
    } catch {
      setCopyFeedback('error');
      window.setTimeout(() => setCopyFeedback('idle'), 2500);
    }
  };

  const hasEmbeddedPaymentData = Boolean(
    paymentCheckout?.pay_code?.trim() || paymentCheckout?.qr_url?.trim() || paymentCheckout?.qr_string?.trim(),
  );
  const invoice = paymentContext?.invoice ?? null;
  const channels = paymentContext?.channels ?? [];
  const selectedChannel = channels.find((channel) => channel.code === paymentChannelCode) ?? channels[0] ?? null;
  const selectedChannelIconUrl = selectedChannel ? channelIconUrl(selectedChannel) : '';
  const checkoutStatusTone = normalizeStatus(paymentCheckout?.status ?? '');
  const isInstructionStep = paymentCheckout !== null;
  const footerActions = !paymentContextLoading ? (
    !isInstructionStep ? (
      <div className="payment-modal__actions">
        <Button
          type="button"
          onClick={() => void onCheckout()}
          isLoading={paymentCheckoutLoading}
          disabled={!paymentContext?.payment_allowed || channels.length === 0 || !selectedChannel?.is_available}
        >
          Lanjut ke pembayaran
        </Button>
      </div>
    ) : paymentCheckout ? (
      <div className="payment-modal__actions">
        <Button
          type="button"
          variant="secondary"
          onClick={onBackToChannelSelection}
          disabled={paymentCheckoutLoading}
        >
          Pilih channel lain
        </Button>
        {paymentCheckout.checkout_url && !hasEmbeddedPaymentData ? (
          <Button
            type="button"
            onClick={onOpenExternalCheckout}
            disabled={paymentCheckoutLoading}
          >
            Lanjut ke halaman pembayaran
          </Button>
        ) : null}
      </div>
    ) : null
  ) : null;

  const modalContent = (
    <div className="invoice-modal" role="dialog" aria-modal="true" aria-labelledby="payment-checkout-title" onClick={onClose}>
      <div className="invoice-modal__sheet payment-modal__sheet" onClick={(event) => event.stopPropagation()}>
        <div className="invoice-modal__header">
          <div>
            <p className="invoice-modal__eyebrow">Pembayaran Invoice</p>
            <h3 id="payment-checkout-title">
              {invoice?.invoice_no || paymentContext?.session.title || 'Pembayaran'}
            </h3>
          </div>
          <button
            type="button"
            className="invoice-modal__close"
            onClick={onClose}
            aria-label="Tutup pembayaran"
            disabled={paymentCheckoutLoading}
          >
            &times;
          </button>
        </div>

        <div className="payment-modal__body">
          {paymentContextLoading ? (
            <div className="payment-modal__loading">
              <span className="loader"></span>
              <p>Menyiapkan opsi pembayaran...</p>
            </div>
          ) : (
            <div className="payment-modal">
              {!isInstructionStep ? (
                <>
                {invoice ? (
                  <div className="payment-modal__summary">
                    <div className="payment-modal__summary-row">
                      <span className="payment-modal__summary-label">
                        <SummaryLabelIcon type="amount" />
                        Tagihan
                      </span>
                      <strong>{formatCurrency(invoice.outstanding_rp)}</strong>
                    </div>
                    <div className="payment-modal__summary-row">
                      <span className="payment-modal__summary-label">
                        <SummaryLabelIcon type="due-date" />
                        Jatuh tempo
                      </span>
                      <strong>{formatDate(invoice.due_date)}</strong>
                    </div>
                    <div className="payment-modal__summary-row">
                      <span className="payment-modal__summary-label">
                        <SummaryLabelIcon type="status" />
                        Status
                      </span>
                      <strong>{humanizeStatus(invoice.status)}</strong>
                    </div>
                  </div>
                ) : null}

                {!paymentContext?.payment_allowed && paymentContext?.message ? (
                  <div className="portal-alert portal-alert--error">{paymentContext.message}</div>
                ) : null}

                {paymentError ? <div className="portal-alert portal-alert--error">{paymentError}</div> : null}

                {channels.length > 0 ? (
                  <div className="payment-modal__channels">
                    <div className="payment-modal__section-head">
                      <strong>Pilih channel pembayaran</strong>
                      <span>Pilih metode yang paling nyaman dipakai, lalu lanjutkan ke sesi pembayaran.</span>
                    </div>
                    <label className="payment-modal__select-group">
                      <span>Channel pembayaran</span>
                      <select
                        className="payment-modal__select"
                        value={selectedChannel?.code ?? ''}
                        onChange={(event) => onChannelChange(event.target.value)}
                        disabled={paymentCheckoutLoading}
                      >
                        {channels.map((channel) => (
                          <option
                            key={channel.code}
                            value={channel.code}
                            disabled={!channel.is_available}
                          >
                            {channel.name}{channel.is_available ? '' : ' (Belum tersedia)'}
                          </option>
                        ))}
                      </select>
                    </label>

                    {selectedChannel ? (
                      <div className="payment-modal__channel-preview">
                        <div className="payment-modal__channel-main">
                          {selectedChannelIconUrl ? (
                            <span className="payment-modal__channel-icon" aria-hidden="true">
                              <img src={selectedChannelIconUrl} alt="" />
                            </span>
                          ) : null}
                          <div className="payment-modal__channel-copy">
                            <strong>{selectedChannel.name}</strong>
                            <span>{selectedChannel.is_available ? 'Tersedia untuk checkout' : 'Channel belum tersedia'}</span>
                          </div>
                        </div>
                        <div className="payment-modal__channel-meta">
                          {channelLimitLabel(selectedChannel) ? <span>{channelLimitLabel(selectedChannel)}</span> : null}
                          {channelFeeLabel(selectedChannel) ? <span>{channelFeeLabel(selectedChannel)}</span> : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="payment-modal__fallback">
                    <strong>Instruksi langsung belum tersedia di aplikasi.</strong>
                    <p>Jika channel membutuhkan halaman provider, checkout akan mengarahkan Anda otomatis saat diperlukan.</p>
                  </div>
                )}
              </>
              ) : paymentCheckout ? (
                <div className="payment-modal__checkout-result">
                <div className="payment-modal__section-head">
                  <strong>Instruksi pembayaran</strong>
                  <span>Ikuti panduan berikut untuk menyelesaikan pembayaran pada channel yang dipilih.</span>
                </div>

                {paymentError ? <div className="portal-alert portal-alert--error">{paymentError}</div> : null}

                <div className="payment-modal__summary">
                  <div className="payment-modal__summary-row">
                    <span>Referensi</span>
                    <strong>{paymentCheckout.merchant_ref}</strong>
                  </div>
                  <div className="payment-modal__summary-row">
                    <span className="payment-modal__summary-label">
                      <SummaryLabelIcon type="status" />
                      Status transaksi
                    </span>
                    <strong className={`status-chip status-chip--${checkoutStatusTone || 'issued'}`}>
                      {humanizeStatus(paymentCheckout.status)}
                    </strong>
                  </div>
                  {paymentCheckout.channel_name ? (
                    <div className="payment-modal__summary-row">
                      <span>Channel</span>
                      <strong>{paymentCheckout.channel_name}</strong>
                    </div>
                  ) : null}
                </div>

                {paymentCheckout.pay_code ? (
                  <div className="payment-modal__code-card">
                    <span>Kode bayar</span>
                    <div className="payment-modal__code-row">
                      <strong>{paymentCheckout.pay_code}</strong>
                      <Button
                        type="button"
                        variant={copyFeedback === 'success' ? 'primary' : 'secondary'}
                        className="payment-modal__copy-button"
                        onClick={() => void handleCopyPayCode()}
                        aria-label={
                          copyFeedback === 'success'
                            ? 'Kode bayar berhasil disalin'
                            : copyFeedback === 'error'
                              ? 'Salin kode bayar lagi'
                              : 'Salin kode bayar'
                        }
                        title={
                          copyFeedback === 'success'
                            ? 'Tersalin'
                            : copyFeedback === 'error'
                              ? 'Coba lagi'
                              : 'Copy kode bayar'
                        }
                      >
                        <CopyIcon copied={copyFeedback === 'success'} />
                      </Button>
                    </div>
                  </div>
                ) : null}

                {paymentCheckout.qr_url ? (
                  <div className="payment-modal__qr">
                    <span>QR Pembayaran</span>
                    <img src={paymentCheckout.qr_url} alt="QR pembayaran" />
                  </div>
                ) : null}

                {!paymentCheckout.qr_url && paymentCheckout.qr_string ? (
                  <div className="payment-modal__qr-string">
                    <span>QR String</span>
                    <textarea value={paymentCheckout.qr_string} readOnly rows={4} />
                  </div>
                ) : null}

                {instructions.length > 0 ? (
                  <div className="payment-modal__instruction-list">
                    {instructions.map((group, index) => (
                      <div key={`${group.title}-${index}`} className="payment-modal__instruction-card">
                        <strong>{group.title}</strong>
                        {group.steps.map((step, stepIndex) => (
                          <p
                            key={`${group.title}-${stepIndex}`}
                            dangerouslySetInnerHTML={{
                              __html: `${stepIndex + 1}. ${sanitizeInstructionHtml(step)}`,
                            }}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                ) : null}

                {paymentCheckout.checkout_url && !hasEmbeddedPaymentData ? (
                  <div className="payment-modal__fallback">
                    <strong>Provider meminta pembayaran dilanjutkan di halaman eksternal.</strong>
                    <p>Silakan lanjutkan pembayaran melalui halaman provider yang dibuka oleh checkout channel terkait.</p>
                  </div>
                ) : null}
                </div>
              ) : null}
            </div>
          )}
        </div>
        {footerActions}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
