import { memo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { Badge } from '../Badge/Badge';
import type { BadgeVariant } from '../Badge/Badge';
import './ToolCard.css';

export interface ToolCardProps {
  /** Unique identifier for the tool. */
  readonly id: string;
  /** Display title. */
  readonly title: string;
  /** Short description shown under the title. */
  readonly description: string;
  /** Icon node (e.g. <FileText size={22} />). */
  readonly icon: React.ReactNode;
  /** Route path for the tool. */
  readonly path: string;
  /** Status badge label (e.g. "Готово", "Новое"). */
  readonly badge: string;
  /** Badge visual variant. */
  readonly badgeVariant: BadgeVariant;
  /** Brand accent color for the card (icon, top line). */
  readonly accentColor?: string;
  /** Optional list of features to render under the description. */
  readonly features?: readonly string[];
  /** Disables the card (grayed out, no hover effects). */
  readonly disabled?: boolean;
  /** Additional class name. */
  readonly className?: string;
}

/**
 * Unified tool card used across Dashboard and About pages.
 *
 * - Uses design tokens via CSS variables.
 * - Exposes `--tool-color` custom property for brand accent.
 * - Shows optional feature list when provided.
 */
export const ToolCard = memo(function ToolCard({
  id,
  title,
  description,
  icon,
  path,
  badge,
  badgeVariant,
  accentColor,
  features,
  disabled = false,
  className = '',
}: ToolCardProps) {
  const style = accentColor
    ? ({ '--tool-color': accentColor } as React.CSSProperties)
    : undefined;

  const rootClass = [
    'ui-tool-card',
    disabled ? 'ui-tool-card--disabled' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      <div className="ui-tool-card__glow" aria-hidden="true" />
      <header className="ui-tool-card__header">
        <div className="ui-tool-card__icon">{icon}</div>
        <Badge variant={badgeVariant}>{badge}</Badge>
      </header>
      <h3 className="ui-tool-card__title">{title}</h3>
      <p className="ui-tool-card__desc">{description}</p>
      {features && features.length > 0 && (
        <ul className="ui-tool-card__features">
          {features.map((f) => (
            <li key={f}>
              <Check size={14} />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      )}
      <footer className="ui-tool-card__footer">
        <span className="ui-tool-card__link">
          {disabled ? 'В разработке' : (
            <>
              Открыть <ArrowRight size={14} />
            </>
          )}
        </span>
      </footer>
    </>
  );

  if (disabled) {
    return (
      <div className={rootClass} style={style} aria-disabled="true">
        {content}
      </div>
    );
  }

  return (
    <Link
      to={path}
      key={id}
      className={rootClass}
      style={style}
      aria-label={`${title}: ${description}`}
    >
      {content}
    </Link>
  );
});
