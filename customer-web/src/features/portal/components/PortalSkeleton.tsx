interface PortalSkeletonProps {
  rows?: number;
}

export function PortalSkeleton({ rows = 3 }: PortalSkeletonProps) {
  return (
    <div className="portal-shell">
      <div className="portal-app portal-app--loading" role="status" aria-live="polite" aria-busy="true">
        <div className="portal-skeleton" aria-hidden="true">
          <div className="portal-skeleton__topbar">
            <div className="portal-skeleton__brand">
              <div className="portal-skeleton__avatar" />
              <div className="portal-skeleton__brand-copy">
                <div className="portal-skeleton__eyebrow" />
                <div className="portal-skeleton__title" />
              </div>
            </div>
            <div className="portal-skeleton__icon" />
          </div>

          <div className="portal-skeleton__nav">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="portal-skeleton__nav-item" />
            ))}
          </div>

          <div className="portal-skeleton__hero" />
          <div className="portal-skeleton__row portal-skeleton__row--banner" />
          <div className="portal-skeleton__metrics">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="portal-skeleton__metric" />
            ))}
          </div>
          <div className="portal-skeleton__stack">
            {Array.from({ length: rows }).map((_, index) => (
              <div key={index} className="portal-skeleton__row" />
            ))}
          </div>
          <div className="portal-skeleton__tabbar">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="portal-skeleton__tabbar-item" />
            ))}
          </div>
        </div>
        <span className="sr-only">Memuat portal pelanggan...</span>
      </div>
    </div>
  );
}
