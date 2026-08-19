import { useEffect, useRef, useState, type TouchEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  CircleGauge,
  CreditCard,
  MoonStar,
  Sun,
  Sunset,
  Wifi,
} from 'lucide-react';
import { PortalOfferCard } from '../components/PortalOfferCard';
import { usePortal } from '../usePortal';
import { formatCurrency, formatDate } from '../utils';

const OFFERS = [
  {
    eyebrow: 'Add-on',
    title: 'Boost Kecepatan',
    description: 'Tambahkan kecepatan sementara untuk kebutuhan upload, streaming, atau jam sibuk.',
    actionLabel: 'Lihat SpeedBoost',
    actionPath: '/addons',
  },
  {
    eyebrow: 'Upgrade',
    title: 'Pindah ke Paket Lebih Tinggi',
    description: 'Tawarkan upgrade paket utama dengan limit yang lebih besar dan prioritas layanan.',
    actionLabel: 'Segera Hadir',
    actionPath: undefined,
  },
  {
    eyebrow: 'Tambahan',
    title: 'WiFi Mesh / Perangkat Tambahan',
    description: 'Cocok untuk perluasan jangkauan rumah atau penambahan perangkat layanan pelanggan.',
    actionLabel: 'Segera Hadir',
    actionPath: undefined,
  },
];

function SummaryInvoiceAlertIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 8.25v4.25M12 16h.01M10.35 4.8 4.98 14.1a1.5 1.5 0 0 0 1.3 2.25h10.44a1.5 1.5 0 0 0 1.3-2.25L12.65 4.8a1.5 1.5 0 0 0-2.3 0Z" />
    </svg>
  );
}

function GreetingIcon({ hour }: { hour: number }) {
  if (hour >= 5 && hour < 15) {
    return <Sun aria-hidden="true" />;
  }

  if (hour >= 15 && hour < 18) {
    return <Sunset aria-hidden="true" />;
  }

  return <MoonStar aria-hidden="true" />;
}

export default function OverviewPage() {
  const navigate = useNavigate();
  const { me, outstandingInvoices } = usePortal();
  const [activeOfferIndex, setActiveOfferIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef(0);

  const subscription = me?.subscription;
  const currentHour = new Date().getHours();
  const greetingLabel =
    currentHour >= 5 && currentHour < 11
      ? 'selamat pagi'
      : currentHour >= 11 && currentHour < 15
        ? 'selamat siang'
        : currentHour >= 15 && currentHour < 18
          ? 'selamat sore'
          : 'selamat malam';
  const activePlanName =
    subscription?.service_profile_name?.trim() || me?.customer.segment?.trim() || 'Paket Internet Rumah';
  const suspendLabel = subscription?.next_suspend_at ? formatDate(subscription.next_suspend_at) : 'Belum terjadwal';
  const paymentTypeLabel =
    subscription?.payment_type === 'prepaid'
      ? 'Prepaid'
      : subscription?.payment_type === 'postpaid'
        ? 'Postpaid'
        : '-';
  const billingTypeLabel =
    subscription?.billing_type === 'cycle'
      ? 'Cycle'
      : subscription?.billing_type === 'fixed_date'
        ? 'Fixed date'
        : subscription?.billing_type === 'renewal'
          ? 'Renewal'
          : '-';
  const subscriptionStatusLabel = subscription?.status ? subscription.status.replace(/_/g, ' ') : 'Belum ada subscription';
  const subscriptionSubtitle = subscription?.start_at
    ? `Aktif sejak ${formatDate(subscription.start_at)}`
    : 'Belum ada jadwal subscription aktif';
  const now = new Date();
  const currentMonthOutstandingInvoices = outstandingInvoices.filter((invoice) => {
    const issueDate = new Date(invoice.issue_date);
    return issueDate.getFullYear() === now.getFullYear() && issueDate.getMonth() === now.getMonth();
  });
  const currentMonthOutstandingTotal = currentMonthOutstandingInvoices.reduce(
    (sum, invoice) => sum + Math.max(invoice.total_rp - invoice.paid_rp, 0),
    0,
  );
  const currentMonthNearestDueInvoice =
    [...currentMonthOutstandingInvoices].sort((left, right) => Date.parse(left.due_date) - Date.parse(right.due_date))[0] ?? null;

  useEffect(() => {
    if (isDragging) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveOfferIndex((current) => (current + 1) % OFFERS.length);
    }, 4500);

    return () => window.clearInterval(timer);
  }, [isDragging]);

  const showPrevOffer = () => {
    setActiveOfferIndex((current) => (current - 1 + OFFERS.length) % OFFERS.length);
  };

  const showNextOffer = () => {
    setActiveOfferIndex((current) => (current + 1) % OFFERS.length);
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
    touchDeltaX.current = 0;
    setIsDragging(true);
    setDragOffset(0);
  };

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null) {
      return;
    }

    const rawDelta = (event.touches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
    const pullingPastStart = activeOfferIndex === 0 && rawDelta > 0;
    const pullingPastEnd = activeOfferIndex === OFFERS.length - 1 && rawDelta < 0;
    const nextDelta = pullingPastStart || pullingPastEnd ? rawDelta * 0.35 : rawDelta;

    touchDeltaX.current = rawDelta;
    setDragOffset(nextDelta);
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null) {
      return;
    }

    if (touchDeltaX.current <= -40) {
      showNextOffer();
    } else if (touchDeltaX.current >= 40) {
      showPrevOffer();
    }

    touchStartX.current = null;
    touchDeltaX.current = 0;
    setDragOffset(0);
    setIsDragging(false);
  };

  const slideWidth = viewportRef.current?.clientWidth ?? 0;
  const transformValue =
    slideWidth > 0
      ? `translateX(-${activeOfferIndex * slideWidth - dragOffset}px)`
      : `translateX(calc(-${activeOfferIndex * 100}% + ${dragOffset}px))`;

  return (
    <div className="portal-stack">
      <section className="portal-customer-greeting" aria-label="Identitas pelanggan">
        <p className="portal-customer-greeting__salutation">
          <GreetingIcon hour={currentHour} />
          Halo, {greetingLabel}
        </p>
        <h1>{me?.customer.name ?? 'Pelanggan'}</h1>
        <span>ID Pelanggan: {me?.customer.customer_code ?? '-'}</span>
      </section>

      {currentMonthNearestDueInvoice ? (
        <section
          className="portal-invoice-banner is-unpaid"
          role="button"
          tabIndex={0}
          onClick={() => navigate('/invoices')}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              navigate('/invoices');
            }
          }}
        >
          <div className="portal-invoice-banner__copy">
            <div className="portal-invoice-banner__title">
              <SummaryInvoiceAlertIcon />
              <span>
                {currentMonthOutstandingInvoices.length > 1
                  ? `${currentMonthOutstandingInvoices.length} invoice bulan ini belum lunas`
                  : 'Invoice bulan ini belum lunas'}
              </span>
            </div>
            <div className="portal-invoice-banner__body">
              <span className="portal-invoice-banner__primary">
                {`Sisa tagihan ${formatCurrency(currentMonthOutstandingTotal)} dengan jatuh tempo ${formatDate(
                  currentMonthNearestDueInvoice.due_date,
                )}.`}
              </span>
              <span className="portal-invoice-banner__secondary">
                {currentMonthOutstandingInvoices.length > 1
                  ? `Termasuk ${currentMonthOutstandingInvoices.length} invoice aktif di bulan ini.`
                  : `Invoice terdekat: ${currentMonthNearestDueInvoice.invoice_no}`}
              </span>
            </div>
          </div>
        </section>
      ) : null}

      <section className="portal-balance-card">
        <div className="portal-balance-card__main">
          <div className="portal-balance-card__headline">
            <h2><Wifi aria-hidden="true" />{activePlanName}</h2>
            <p>{subscriptionSubtitle}</p>
          </div>
          <div className="portal-balance-card__summary">
            <strong><CircleGauge aria-hidden="true" />{subscriptionStatusLabel}</strong>
            <span>
              <CreditCard aria-hidden="true" />
              {paymentTypeLabel} / {billingTypeLabel}
            </span>
          </div>
        </div>
        <div className="portal-balance-card__spotlight">
          <span><CalendarClock aria-hidden="true" />Jatuh Tempo</span>
          <strong>{suspendLabel}</strong>
        </div>
      </section>

      <section className="glass-card portal-panel">
        <div className="portal-offer-carousel">
          <div className="portal-offer-carousel__controls">
            <button
              type="button"
              className="portal-offer-carousel__nav"
              aria-label="Promo sebelumnya"
              onClick={showPrevOffer}
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            <div className="portal-offer-carousel__dots">
              {OFFERS.map((offer, index) => (
                <button
                  key={offer.title}
                  type="button"
                  className={`portal-offer-carousel__dot ${index === activeOfferIndex ? 'is-active' : ''}`}
                  aria-label={`Lihat promo ${index + 1}`}
                  onClick={() => setActiveOfferIndex(index)}
                />
              ))}
            </div>
            <button
              type="button"
              className="portal-offer-carousel__nav"
              aria-label="Promo berikutnya"
              onClick={showNextOffer}
            >
              <ChevronRight aria-hidden="true" />
            </button>
          </div>

          <div
            ref={viewportRef}
            className={`portal-offer-carousel__viewport ${isDragging ? 'is-dragging' : ''}`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
          >
            <div
              className={`portal-offer-carousel__track ${isDragging ? 'is-dragging' : ''}`}
              style={{ transform: transformValue }}
            >
              {OFFERS.map((offer, index) => (
                <div
                  key={offer.title}
                  className={`portal-offer-carousel__slide ${index === activeOfferIndex ? 'is-active' : ''} ${
                    isDragging && index === activeOfferIndex ? 'is-pressing' : ''
                  }`}
                >
                  <PortalOfferCard
                    eyebrow={offer.eyebrow}
                    title={offer.title}
                    description={offer.description}
                    actionLabel={offer.actionLabel}
                    onAction={offer.actionPath ? () => navigate(offer.actionPath) : undefined}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
