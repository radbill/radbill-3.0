const statusLabel: Record<string, string> = {
  draft: 'Draft',
  issued: 'Terbit',
  partial: 'Sebagian',
  carried: 'Sisa tagihan dipindahkan',
  deferred: 'Ditunda ke invoice berikutnya',
  paid: 'Lunas',
  overdue: 'Jatuh Tempo',
  void: 'Dibatalkan',
  pending: 'Menunggu',
  processing: 'Diproses',
  failed: 'Gagal',
  expired: 'Kedaluwarsa',
  cancelled: 'Dibatalkan',
  scheduled: 'Terjadwal',
  active: 'Aktif',
  closed: 'Selesai',
  unpaid: 'Belum dibayar',
};

export function isInvoicePayable(invoice: { status: string; total_rp: number; paid_rp: number }) {
  return invoice.total_rp > invoice.paid_rp && invoice.status !== 'void' && invoice.status !== 'carried' && invoice.status !== 'deferred';
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function normalizeStatus(value: string) {
  return (value || 'issued').toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

export function humanizeStatus(value: string) {
  return statusLabel[value] || value;
}
