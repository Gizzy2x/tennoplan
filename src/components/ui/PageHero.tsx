import type { ReactNode } from 'react';

interface PageHeroProps {
  /** Lighter-weight prefix displayed before the bold title word(s) */
  prefix?: string;
  /** Bold/black weight title word(s) — shown in gold */
  title: string;
  /** Optional tiny all-caps subtitle below the heading */
  subtitle?: string;
  /** Optional right-side slot (sync status, refresh button, etc.) */
  right?: ReactNode;
  className?: string;
}

/**
 * Universal cinematic page title header.
 * Every page in Tennoplan starts with this component.
 * Pattern: [LIGHT PREFIX] [BOLD GOLD TITLE] / subtitle / somatic-line divider
 */
export function PageHero({ prefix, title, subtitle, right, className = '' }: PageHeroProps) {
  return (
    <div className={`page-hero ${className}`}>
      <div className="page-hero-row">
        <div>
          <h1 className="page-hero-heading">
            {prefix && <span className="page-hero-prefix">{prefix}</span>}
            <span className="page-hero-title orokin-etched">{title}</span>
          </h1>
          {subtitle && <p className="page-hero-subtitle">{subtitle}</p>}
        </div>

        {right && <div className="page-hero-right">{right}</div>}
      </div>

      <div className="somatic-line page-hero-divider" />
    </div>
  );
}
