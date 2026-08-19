interface PortalMetricCardProps {
  label: string;
  value: string | number;
}

export function PortalMetricCard({ label, value }: PortalMetricCardProps) {
  return (
    <article className="portal-metric glass-card">
      <span className="portal-metric__label">{label}</span>
      <strong className="portal-metric__value">{value}</strong>
    </article>
  );
}
