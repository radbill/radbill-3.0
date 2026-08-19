import { CircleCheck, ShieldCheck, Wifi } from 'lucide-react';

interface ActiveServiceCardProps {
  title: string;
  subtitle: string;
  statusLabel: string;
  statValue: string | number;
  statLabel: string;
}

export function ActiveServiceCard({
  title,
  subtitle,
  statusLabel,
  statValue,
  statLabel,
}: ActiveServiceCardProps) {
  return (
    <section className="glass-card portal-panel portal-service-card">
      <div className="portal-service-card__copy">
        <div className="portal-service-card__chips">
          <span className="portal-soft-chip"><CircleCheck aria-hidden="true" />Aktif</span>
          <span className="portal-soft-chip portal-soft-chip--muted"><Wifi aria-hidden="true" />Internet</span>
        </div>
        <div>
          <h2 className="text-h2">{title}</h2>
          <p className="text-muted">{subtitle}</p>
        </div>
        <div className="portal-service-card__meta">
          <span><ShieldCheck aria-hidden="true" />Status layanan</span>
          <strong>{statusLabel}</strong>
        </div>
      </div>

      <div className="portal-service-card__gauge" aria-hidden="true">
        <div className="portal-service-card__gauge-ring">
          <div className="portal-service-card__gauge-core">
            <strong>{statValue}</strong>
            <span>{statLabel}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
