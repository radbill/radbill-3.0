import { Button } from '../../../shared/ui';
import { PortalEmptyState } from './PortalEmptyState';
import type { Invoice } from '../types';
import { formatCurrency, formatDate, normalizeStatus } from '../utils';

interface InvoiceListProps {
  invoices: Invoice[];
  selectedInvoiceID?: string;
  invoiceLoading: boolean;
  invoiceHasMore: boolean;
  invoiceListLoadingMore: boolean;
  invoiceTotalCount: number;
  payingInvoiceID: string;
  onSelect: (invoiceID: string) => Promise<void> | void;
  onPay: (invoiceID: string) => Promise<void> | void;
  onLoadMore: () => Promise<void> | void;
}

export function InvoiceList({
  invoices,
  selectedInvoiceID,
  invoiceLoading,
  invoiceHasMore,
  invoiceListLoadingMore,
  invoiceTotalCount,
  payingInvoiceID,
  onSelect,
  onPay,
  onLoadMore,
}: InvoiceListProps) {
  if (invoices.length === 0) {
    return <PortalEmptyState title="Belum ada invoice yang bisa ditampilkan." />;
  }

  return (
    <div className="invoice-list">
      {invoices.map((invoice) => {
        const outstanding = Math.max(invoice.total_rp - invoice.paid_rp, 0);
        const canPay = outstanding > 0 && invoice.status !== 'void';
        const isSelected = selectedInvoiceID === invoice.id;
        const isOverdue = normalizeStatus(invoice.status) === 'overdue';
        const isOpeningDetail = invoiceLoading && isSelected;

        return (
          <article
            key={invoice.id}
            className={`invoice-card ${isSelected ? 'invoice-card--selected' : ''} ${isOverdue ? 'invoice-card--overdue' : ''} ${isOpeningDetail ? 'invoice-card--loading' : ''}`}
            onClick={() => void onSelect(invoice.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                void onSelect(invoice.id);
              }
            }}
            role="button"
            tabIndex={0}
            aria-pressed={isSelected}
            aria-busy={isOpeningDetail}
          >
            <div className="invoice-row invoice-row--top">
              <div className="invoice-row__group invoice-row__group--main">
                <span className="invoice-row__label">Invoice</span>
                <strong>{invoice.invoice_no}</strong>
                <p className="text-muted">{invoice.items?.length ?? 0} rincian</p>
              </div>
              <div className="invoice-row__group">
                <span className="invoice-row__label">Jatuh Tempo</span>
                <strong>{formatDate(invoice.due_date)}</strong>
              </div>
            </div>

            <div className="invoice-row invoice-row--bottom">
              <div className="invoice-row__group invoice-row__group--amount">
                <span className="invoice-row__label">Total</span>
                <strong>{formatCurrency(invoice.total_rp)}</strong>
              </div>
              <div className="invoice-row__group invoice-row__group--amount">
                <span className="invoice-row__label">Sisa</span>
                <strong>{formatCurrency(outstanding)}</strong>
              </div>
              <div className="invoice-row__actions">
                <Button
                  onClick={(event) => {
                    event.stopPropagation();
                    void onPay(invoice.id);
                  }}
                  isLoading={payingInvoiceID === invoice.id}
                  disabled={!canPay}
                >
                  {canPay ? 'Bayar' : 'Selesai'}
                </Button>
              </div>
            </div>
          </article>
        );
      })}
      {invoiceHasMore ? (
        <div className="invoice-list__footer">
          <p className="invoice-list__progress">
            {invoices.length} dari {invoiceTotalCount} invoice dimuat
          </p>
          <Button variant="secondary" onClick={() => void onLoadMore()} isLoading={invoiceListLoadingMore}>
            Muat lebih banyak
          </Button>
        </div>
      ) : invoiceTotalCount > 0 ? (
        <div className="invoice-list__footer">
          <p className="invoice-list__progress">
            {invoices.length} dari {invoiceTotalCount} invoice dimuat
          </p>
        </div>
      ) : null}
    </div>
  );
}
