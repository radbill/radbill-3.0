import { Sparkles } from 'lucide-react';
import { Button } from '../../../shared/ui';

interface PortalOfferCardProps {
  eyebrow: string;
  title: string;
  description: string;
  actionLabel: string;
  onAction?: () => void;
}

export function PortalOfferCard({
  eyebrow,
  title,
  description,
  actionLabel,
  onAction,
}: PortalOfferCardProps) {
  return (
    <article className="portal-offer-card">
      <span className="portal-offer-card__eyebrow"><Sparkles aria-hidden="true" />{eyebrow}</span>
      <div className="portal-offer-card__body">
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      <Button type="button" variant="secondary" onClick={onAction} disabled={!onAction}>
        {actionLabel}
      </Button>
    </article>
  );
}
