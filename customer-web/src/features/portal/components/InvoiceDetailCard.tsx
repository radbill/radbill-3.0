import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Invoice } from '../types';
import { formatCurrency, formatDate, humanizeStatus } from '../utils';

interface InvoiceDetailCardProps {
  invoice: Invoice | null;
  onClose: () => void;
}

function DetailLabelIcon({ type }: { type: 'issue-date' | 'due-date' | 'status' }) {
  if (type === 'status') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="m9.5 12 1.75 1.75L14.75 10" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <path d="M3 10h18" />
      <rect x="3" y="4" width="18" height="17" rx="2" ry="2" />
    </svg>
  );
}

export function InvoiceDetailCard({ invoice, onClose }: InvoiceDetailCardProps) {
  useEffect(() => {
    if (!invoice) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
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
  }, [invoice, onClose]);

  if (!invoice) {
    return null;
  }

  const modalContent = (
    <div className="invoice-modal" role="dialog" aria-modal="true" aria-labelledby="invoice-detail-title" onClick={onClose}>
      <div className="invoice-modal__sheet" onClick={(event) => event.stopPropagation()}>
        <div className="invoice-modal__header">
          <div>
            <p className="invoice-modal__eyebrow">Detail Invoice</p>
            <h3 id="invoice-detail-title">{invoice.invoice_no}</h3>
          </div>
          <button type="button" className="invoice-modal__close" onClick={onClose} aria-label="Tutup detail invoice">
            &times;
          </button>
        </div>

        <div className="invoice-detail">
          <div className="invoice-detail__summary-list">
            <div className="invoice-detail__summary-row">
              <div className="invoice-detail__summary-label">
                <DetailLabelIcon type="issue-date" />
                Tanggal Terbit
              </div>
              <div className="invoice-detail__summary-value">{formatDate(invoice.issue_date)}</div>
            </div>

            <div className="invoice-detail__summary-row">
              <div className="invoice-detail__summary-label">
                <DetailLabelIcon type="due-date" />
                Jatuh Tempo
              </div>
              <div className="invoice-detail__summary-value">{formatDate(invoice.due_date)}</div>
            </div>

            <div className="invoice-detail__summary-row invoice-detail__summary-row--accent">
              <div className="invoice-detail__summary-label">
                <DetailLabelIcon type="status" />
                Status
              </div>
              <div className="invoice-detail__summary-value">{humanizeStatus(invoice.status)}</div>
            </div>
          </div>

          <div className="invoice-detail__table">
            {(invoice.items ?? []).length > 0 ? (
              invoice.items?.map((item) => (
                <div key={item.id} className="invoice-line">
                  <div>
                    <strong>{item.description}</strong>
                    <p className="text-muted">
                      {item.qty} x {formatCurrency(item.unit_price_rp)}
                    </p>
                  </div>
                  <strong>{formatCurrency(item.amount_rp)}</strong>
                </div>
              ))
            ) : (
              <p className="text-muted">Belum ada rincian item pada invoice ini.</p>
            )}
          </div>

          {invoice.notes && (
            <div className="invoice-notes">
              <span>Catatan</span>
              <p>{invoice.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
