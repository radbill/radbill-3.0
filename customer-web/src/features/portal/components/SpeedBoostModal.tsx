import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Clock, Sparkles, X, Zap } from 'lucide-react';
import { Button } from '../../../shared/ui';
import type { CustomerSpeedBoost, SpeedBoostOffer } from '../types';
import { formatCurrency, formatDate } from '../utils';

interface SpeedBoostModalProps {
  isOpen: boolean;
  offers: SpeedBoostOffer[];
  openBoost: CustomerSpeedBoost | null;
  loading: boolean;
  purchasingID: string;
  onClose: () => void;
  onPurchase: (offer: SpeedBoostOffer) => Promise<void> | void;
}

export function SpeedBoostModal({
  isOpen,
  offers,
  openBoost,
  loading,
  purchasingID,
  onClose,
  onPurchase,
}: SpeedBoostModalProps) {
  const [selectedOfferID, setSelectedOfferID] = useState('');

  useEffect(() => {
    if (offers.length > 0 && !offers.some((offer) => offer.id === selectedOfferID)) {
      setSelectedOfferID(offers[0].id);
    }
  }, [offers, selectedOfferID]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !purchasingID) onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, purchasingID]);

  if (!isOpen) return null;

  const selectedOffer = offers.find((offer) => offer.id === selectedOfferID) ?? offers[0] ?? null;
  const modalContent = (
    <div className="invoice-modal" role="dialog" aria-modal="true" aria-labelledby="speed-boost-title" onClick={onClose}>
      <div className="invoice-modal__sheet speed-boost-modal__sheet" onClick={(event) => event.stopPropagation()}>
        <div className="invoice-modal__header">
          <div>
            <p className="invoice-modal__eyebrow">Layanan Tambahan</p>
            <h3 id="speed-boost-title" className="speed-boost-modal__title"><Zap /> Speed Boost Booster</h3>
          </div>
          <button type="button" className="invoice-modal__close" onClick={onClose} aria-label="Tutup SpeedBoost" disabled={Boolean(purchasingID)}>
            <X />
          </button>
        </div>

        <div className="speed-boost-modal__body">
          {openBoost ? (
            <div className={`speed-boost-card ${openBoost.addon_status === 'active' ? 'speed-boost-card--active' : 'speed-boost-card--pending'}`}>
              <div className="speed-boost-card__badge-row">
                <span className={`speed-boost-status-badge ${openBoost.addon_status === 'active' ? 'is-active' : 'is-pending'}`}>
                  <span className="speed-boost-pulse" aria-hidden="true" />
                  {openBoost.payment_status === 'unpaid' ? 'Menunggu Pembayaran' : openBoost.addon_status === 'active' ? 'Sedang Aktif' : 'Menunggu Aktivasi'}
                </span>
                <span className="text-muted text-xs">Kecepatan: {openBoost.applied_rate_limit}</span>
              </div>
              <p className="speed-boost-card__title">{openBoost.addon_name_snapshot || 'Paket SpeedBoost'}</p>
              {openBoost.ends_at ? <div className="speed-boost-card__expiry"><Clock /><span>Berlaku hingga {formatDate(openBoost.ends_at)}</span></div> : null}
            </div>
          ) : null}

          <div className="speed-boost-modal__section-header">
            <strong>Pilih Paket Kecepatan</strong>
            <span>Tingkatkan kecepatan untuk streaming, download, atau gaming tanpa mengubah paket utama.</span>
          </div>

          {loading ? (
            <div className="payment-modal__loading"><span className="loader" /><p>Memuat pilihan paket booster...</p></div>
          ) : offers.length === 0 ? (
            <div className="portal-empty"><div className="portal-empty__icon"><Zap /></div><p>Belum ada paket SpeedBoost tersedia.</p></div>
          ) : (
            <div className="speed-boost-offer-list">
              {offers.map((offer) => {
                const selected = offer.id === selectedOfferID;
                return (
                  <button
                    type="button"
                    key={offer.id}
                    className={`speed-boost-offer-card ${selected ? 'speed-boost-offer-card--selected' : ''}`}
                    onClick={() => setSelectedOfferID(offer.id)}
                  >
                    <span className="speed-boost-offer-card__left">
                      <span className="speed-boost-offer-card__rate-badge"><Zap /><strong>{offer.override_rate_limit}</strong></span>
                      <span className="speed-boost-offer-card__info">
                        <strong>{offer.name}</strong>
                        {offer.description ? <span>{offer.description}</span> : null}
                        <span className="speed-boost-duration-pill"><Clock /> {offer.duration_days} Hari</span>
                      </span>
                    </span>
                    <span className="speed-boost-offer-card__right">
                      <span className="speed-boost-offer-card__price"><strong>{formatCurrency(offer.price_rp)}</strong></span>
                      <span className={`speed-boost-select-indicator ${selected ? 'is-selected' : ''}`}>{selected ? <Check /> : null}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {selectedOffer ? (
            <div className="speed-boost-summary-box">
              <div className="speed-boost-summary-row"><span>Paket Dipilih</span><strong>{selectedOffer.name} ({selectedOffer.duration_days} Hari)</strong></div>
              <div className="speed-boost-summary-row"><span>Kecepatan Ekstra</span><strong>{selectedOffer.override_rate_limit}</strong></div>
              <div className="speed-boost-summary-row"><span>Total Biaya</span><strong className="text-primary">{formatCurrency(selectedOffer.price_rp)}</strong></div>
            </div>
          ) : null}
        </div>

        <div className="payment-modal__actions">
          <Button
            type="button"
            onClick={() => selectedOffer && void onPurchase(selectedOffer)}
            isLoading={Boolean(purchasingID)}
            disabled={!selectedOffer || loading || Boolean(openBoost)}
          >
            <Sparkles /> {openBoost ? 'Selesaikan boost saat ini' : 'Beli & Bayar Sekarang'}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose} disabled={Boolean(purchasingID)}>Batal</Button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
