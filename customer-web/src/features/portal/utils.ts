const statusLabel: Record<string, string> = {
  draft: 'Draft',
  issued: 'Terbit',
  partial: 'Sebagian',
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
