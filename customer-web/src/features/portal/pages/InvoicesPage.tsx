import { InvoiceDetailCard } from '../components/InvoiceDetailCard';
import { InvoiceList } from '../components/InvoiceList';
import { PaymentCheckoutModal } from '../components/PaymentCheckoutModal';
import { usePortal } from '../usePortal';

export default function InvoicesPage() {
  const {
    invoices,
    selectedInvoice,
    invoiceLoading,
    invoiceHasMore,
    invoiceListLoadingMore,
    invoiceTotalCount,
    payingInvoiceID,
    paymentContextLoading,
    paymentCheckoutLoading,
    paymentContext,
    paymentCheckout,
    paymentError,
    paymentChannelCode,
    loadMoreInvoices,
    backToPaymentChannelSelection,
    openExternalPaymentCheckout,
    handleInvoiceSelect,
    closeInvoiceDetail,
    closePaymentModal,
    handlePayInvoice,
    handlePaymentCheckout,
    setPaymentChannelCode,
  } = usePortal();

  return (
    <div className="portal-stack">
      <section className="glass-card portal-panel">
        <div className="portal-panel__header">
          <div>
            <h2 className="text-h2">Daftar Invoice</h2>
            <p className="text-muted">Daftar invoice terbaru milik akun Anda.</p>
          </div>
        </div>
        <InvoiceList
          invoices={invoices}
          selectedInvoiceID={selectedInvoice?.id}
          invoiceLoading={invoiceLoading}
          invoiceHasMore={invoiceHasMore}
          invoiceListLoadingMore={invoiceListLoadingMore}
          invoiceTotalCount={invoiceTotalCount}
          payingInvoiceID={payingInvoiceID}
          onSelect={handleInvoiceSelect}
          onPay={handlePayInvoice}
          onLoadMore={loadMoreInvoices}
        />
      </section>

      <InvoiceDetailCard invoice={selectedInvoice} onClose={closeInvoiceDetail} />
      <PaymentCheckoutModal
        paymentContext={paymentContext}
        paymentCheckout={paymentCheckout}
        paymentError={paymentError}
        paymentChannelCode={paymentChannelCode}
        paymentContextLoading={paymentContextLoading}
        paymentCheckoutLoading={paymentCheckoutLoading}
        onClose={closePaymentModal}
        onBackToChannelSelection={backToPaymentChannelSelection}
        onChannelChange={setPaymentChannelCode}
        onCheckout={handlePaymentCheckout}
        onOpenExternalCheckout={openExternalPaymentCheckout}
      />
    </div>
  );
}
