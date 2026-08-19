import { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock, Globe2, History, Radio, Sparkles, Tv, Zap } from 'lucide-react';
import { ApiError, fetchApi } from '../../../shared/api';
import { Button } from '../../../shared/ui';
import { PaymentCheckoutModal } from '../components/PaymentCheckoutModal';
import { PortalEmptyState } from '../components/PortalEmptyState';
import { SpeedBoostModal } from '../components/SpeedBoostModal';
import type { CustomerSpeedBoost, CustomerSpeedBoostListResponse, SpeedBoostOffer } from '../types';
import { formatCurrency, formatDate, normalizeStatus } from '../utils';
import { usePortal } from '../usePortal';

const openStatuses = new Set(['pending', 'scheduled', 'active']);
const historyPageLimit = 10;

function boostStatusLabel(boost: CustomerSpeedBoost) {
  if (boost.addon_status === 'cancelled') return 'Dibatalkan';
  if (boost.addon_status === 'expired') return 'Kedaluwarsa';
  if (boost.addon_status === 'closed') return 'Selesai';
  if (boost.payment_status === 'unpaid') return 'Menunggu pembayaran';
  if (boost.addon_status === 'active') return 'Aktif';
  if (boost.addon_status === 'scheduled') return 'Terjadwal';
  return boost.addon_status.replaceAll('_', ' ');
}

export default function AddonsPage() {
  const {
    me,
    payingInvoiceID,
    paymentContextLoading,
    paymentCheckoutLoading,
    paymentContext,
    paymentCheckout,
    paymentError,
    paymentChannelCode,
    refreshInvoices,
    backToPaymentChannelSelection,
    openExternalPaymentCheckout,
    closePaymentModal,
    handlePayInvoice,
    handlePaymentCheckout,
    setPaymentChannelCode,
  } = usePortal();
  const [offers, setOffers] = useState<SpeedBoostOffer[]>([]);
  const [boosts, setBoosts] = useState<CustomerSpeedBoost[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [orderingOfferID, setOrderingOfferID] = useState('');
  const [cancellingAddonID, setCancellingAddonID] = useState('');
  const [speedBoostModalOpen, setSpeedBoostModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'services' | 'history'>('services');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadAddons = useCallback(async () => {
    setError('');
    try {
      const [offerResponse, boostResponse] = await Promise.all([
        fetchApi<SpeedBoostOffer[]>('/customer/addons/speed-boost/offers'),
        fetchApi<CustomerSpeedBoostListResponse>(`/customer/addons?page=1&limit=${historyPageLimit}`),
      ]);
      setOffers(offerResponse.data);
      setBoosts(boostResponse.data.items);
      setHistoryPage(boostResponse.data.meta.page);
      setHistoryTotal(boostResponse.data.meta.total);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Gagal memuat add-on.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAddons();
  }, [loadAddons]);

  const openBoost = useMemo(() => boosts.find((item) => openStatuses.has(item.addon_status)) ?? null, [boosts]);
  const historyHasMore = boosts.length < historyTotal;

  const loadMoreHistory = async () => {
    if (historyLoadingMore || !historyHasMore) return;
    setHistoryLoadingMore(true);
    setError('');
    try {
      const nextPage = historyPage + 1;
      const response = await fetchApi<CustomerSpeedBoostListResponse>(
        `/customer/addons?page=${nextPage}&limit=${historyPageLimit}`,
      );
      setBoosts((current) => [
        ...current,
        ...response.data.items.filter((item) => !current.some((existing) => existing.id === item.id)),
      ]);
      setHistoryPage(response.data.meta.page);
      setHistoryTotal(response.data.meta.total);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Gagal memuat riwayat berikutnya.');
    } finally {
      setHistoryLoadingMore(false);
    }
  };

  const orderBoost = async (offer: SpeedBoostOffer) => {
    setOrderingOfferID(offer.id);
    setError('');
    setSuccess('');
    try {
      const response = await fetchApi<CustomerSpeedBoost>('/customer/addons/speed-boost/orders', {
        method: 'POST',
        body: JSON.stringify({ offer_id: offer.id }),
      });
      setSpeedBoostModalOpen(false);
      setSuccess(`${offer.name} berhasil dipesan. Selesaikan pembayaran agar boost dapat diaktifkan.`);
      await Promise.all([loadAddons(), refreshInvoices()]);
      if (response.data.invoice_id) await handlePayInvoice(response.data.invoice_id);
    } catch (caught) {
      setError(caught instanceof ApiError || caught instanceof Error ? caught.message : 'Gagal memesan SpeedBoost.');
    } finally {
      setOrderingOfferID('');
    }
  };

  const cancelOrder = async (boost: CustomerSpeedBoost) => {
    setCancellingAddonID(boost.subscription_addon_id);
    setError('');
    setSuccess('');
    try {
      await fetchApi(`/customer/addons/${encodeURIComponent(boost.subscription_addon_id)}/cancel`, { method: 'POST' });
      setSuccess('Pesanan SpeedBoost berhasil dibatalkan.');
      await Promise.all([loadAddons(), refreshInvoices()]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Gagal membatalkan pesanan.');
    } finally {
      setCancellingAddonID('');
    }
  };

  return (
    <div className="portal-stack">
      {error ? <div className="portal-alert portal-alert--error">{error}</div> : null}
      {success ? <div className="portal-alert portal-alert--success">{success}</div> : null}

      <div className="portal-wifi-tabs" role="tablist" aria-label="Navigasi Add-ons">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'services'}
          className={activeTab === 'services' ? 'is-active' : ''}
          onClick={() => setActiveTab('services')}
        >
          <Sparkles /> Layanan
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'history'}
          className={activeTab === 'history' ? 'is-active' : ''}
          onClick={() => setActiveTab('history')}
        >
          <History /> Riwayat
        </button>
      </div>

      {activeTab === 'services' ? (
        <>
      <section className="glass-card portal-panel">
        <div className="portal-panel__header">
          <div>
            <h2 className="text-h2 portal-heading-with-icon"><Zap /> Layanan Tambahan & Add-on</h2>
            <p className="text-muted">Tingkatkan kecepatan internet sementara atau pilih layanan pendukung lainnya.</p>
          </div>
        </div>
        {openBoost ? (
          <div className={`addon-active-hero ${openBoost.addon_status !== 'active' ? 'is-pending' : ''}`}>
            <div className="addon-active-hero__left">
              <span className={`speed-boost-status-badge ${openBoost.addon_status === 'active' ? 'is-active' : 'is-pending'}`}>
                <span className="speed-boost-pulse" aria-hidden="true" /> {boostStatusLabel(openBoost)}
              </span>
              <h3 className="addon-active-hero__rate">Kecepatan Ekstra: {openBoost.applied_rate_limit}</h3>
              <p className="text-muted text-sm">{openBoost.addon_name_snapshot || 'SpeedBoost'} untuk koneksi internet Anda.</p>
              <div className="addon-active-hero__expiry">
                <Clock />
                <span>{openBoost.ends_at ? <>Aktif sampai: <strong>{formatDate(openBoost.ends_at)}</strong></> : 'Masa aktif dimulai setelah pembayaran berhasil.'}</span>
              </div>
              {openBoost.payment_status === 'unpaid' && openBoost.invoice_id ? (
                <div className="addon-active-hero__actions">
                  <Button type="button" onClick={() => void handlePayInvoice(openBoost.invoice_id!)} isLoading={payingInvoiceID === openBoost.invoice_id}>Bayar sekarang</Button>
                  <Button type="button" variant="secondary" onClick={() => void cancelOrder(openBoost)} isLoading={cancellingAddonID === openBoost.subscription_addon_id}>Batalkan pesanan</Button>
                </div>
              ) : null}
            </div>
            <div className="addon-active-hero__badge"><Zap /></div>
          </div>
        ) : (
          <div className="addon-banner-card">
            <div className="addon-banner-card__content">
              <div className="addon-banner-card__badge"><Sparkles /> Fitur Booster Otomatis</div>
              <h3 className="addon-banner-card__title">Percepat Koneksi Internet Secara Instan</h3>
              <p className="addon-banner-card__desc">Butuh koneksi ekstra cepat untuk download besar, live streaming, atau turnamen game? Aktifkan booster harian tanpa mengganti paket bulanan.</p>
            </div>
            <Button type="button" onClick={() => setSpeedBoostModalOpen(true)} className="addon-banner-card__cta"><Zap /> Beli Speed Boost</Button>
          </div>
        )}
      </section>

      <section className="glass-card portal-panel">
        <div className="portal-panel__header"><div><h3 className="text-h3 portal-heading-with-icon"><Sparkles /> Pilihan Paket Speed Boost</h3><p className="text-muted">Aktivasi otomatis pada koneksi Anda setelah pembayaran selesai.</p></div></div>
        {loading ? (
          <div className="payment-modal__loading"><span className="loader" /><p>Memuat katalog paket booster...</p></div>
        ) : offers.length === 0 ? (
          <PortalEmptyState title="Belum Ada Paket Speed Boost Aktif" description="Admin belum menambahkan penawaran untuk tipe layanan Anda." />
        ) : (
          <div className="addon-catalog-grid">
            {offers.map((offer) => (
              <article key={offer.id} className="addon-catalog-card">
                <div className="addon-catalog-card__header"><span className="addon-rate-pill"><Zap /> {offer.override_rate_limit}</span><span className="speed-boost-duration-pill"><Clock /> {offer.duration_days} Hari</span></div>
                <h4 className="addon-catalog-card__name">{offer.name}</h4>
                <p className="addon-catalog-card__desc">{offer.description || `Peningkatan kecepatan ${offer.override_rate_limit} selama ${offer.duration_days} hari.`}</p>
                <div className="addon-catalog-card__footer">
                  <div className="addon-catalog-card__price"><span className="text-muted text-xs">Biaya Paket</span><strong>{formatCurrency(offer.price_rp)}</strong></div>
                  <Button type="button" onClick={() => void orderBoost(offer)} isLoading={orderingOfferID === offer.id} disabled={Boolean(openBoost) || orderingOfferID !== '' || !me?.subscription}>Beli Sekarang</Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="glass-card portal-panel">
        <div className="portal-panel__header"><div><h3 className="text-h3 portal-heading-with-icon"><Globe2 /> Layanan Pendukung Lainnya</h3><p className="text-muted">Kebutuhan infrastruktur dan perangkat tambahan untuk rumah maupun kantor.</p></div></div>
        <div className="addon-extras-grid">
          <article className="addon-extra-card"><div className="addon-extra-card__icon"><Globe2 /></div><div className="addon-extra-card__body"><strong>IP Publik Statis</strong><p>Untuk CCTV online, server pribadi, atau port forwarding.</p><span className="addon-extra-card__tag">Hubungi penyedia layanan</span></div></article>
          <article className="addon-extra-card"><div className="addon-extra-card__icon"><Radio /></div><div className="addon-extra-card__body"><strong>Router Mesh Wi-Fi Extender</strong><p>Perluas jangkauan Wi-Fi tanpa blind spot.</p><span className="addon-extra-card__tag">Sewa / beli perangkat</span></div></article>
          <article className="addon-extra-card"><div className="addon-extra-card__icon"><Tv /></div><div className="addon-extra-card__body"><strong>Android TV Box / IPTV</strong><p>Layanan hiburan tambahan untuk ruang keluarga.</p><span className="addon-extra-card__tag">Segera hadir</span></div></article>
        </div>
      </section>
        </>
      ) : (
      <section className="glass-card portal-panel">
        <div className="portal-panel__header"><div><h3 className="text-h3 portal-heading-with-icon"><History /> Riwayat SpeedBoost</h3><p className="text-muted">Pesanan terbaru dan status masa aktifnya.</p></div></div>
        {boosts.length === 0 ? <PortalEmptyState title="Belum ada riwayat SpeedBoost" /> : (
          <div className="addon-history-list">
            {boosts.map((boost) => (
              <article key={boost.id} className="addon-history-row">
                <div><strong>{boost.addon_name_snapshot || 'SpeedBoost'}</strong><span>{formatDate(boost.created_at)} • {boost.applied_rate_limit}</span></div>
                <div><strong>{formatCurrency(boost.total_rp)}</strong><span className={`status-chip status-chip--${normalizeStatus(boost.addon_status)}`}>{boostStatusLabel(boost)}</span></div>
              </article>
            ))}
            {historyHasMore ? (
              <div className="addon-history-list__footer">
                <span>Menampilkan {boosts.length} dari {historyTotal} riwayat</span>
                <Button type="button" variant="secondary" onClick={() => void loadMoreHistory()} isLoading={historyLoadingMore}>
                  Muat lebih banyak
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </section>
      )}

      <SpeedBoostModal isOpen={speedBoostModalOpen} offers={offers} openBoost={openBoost} loading={loading} purchasingID={orderingOfferID} onClose={() => setSpeedBoostModalOpen(false)} onPurchase={orderBoost} />
      <PaymentCheckoutModal paymentContext={paymentContext} paymentCheckout={paymentCheckout} paymentError={paymentError} paymentChannelCode={paymentChannelCode} paymentContextLoading={paymentContextLoading} paymentCheckoutLoading={paymentCheckoutLoading} onClose={closePaymentModal} onBackToChannelSelection={backToPaymentChannelSelection} onChannelChange={setPaymentChannelCode} onCheckout={handlePaymentCheckout} onOpenExternalCheckout={openExternalPaymentCheckout} />
    </div>
  );
}
