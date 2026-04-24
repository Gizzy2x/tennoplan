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
    <div className={`mb-8 ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-hero-heading leading-none">
            {prefix && (
              <span
                style={{
                  fontWeight: 300,
                  color: 'rgba(229, 226, 225, 0.75)',
                  marginRight: '0.35em',
                }}
              >
                {prefix}
              </span>
            )}
            <span
              className="orokin-etched"
              style={{
                fontWeight: 900,
                color: '#E3C372',
              }}
            >
              {title}
            </span>
          </h1>
          {subtitle && (
            <p className="page-hero-subtitle mt-2">{subtitle}</p>
          )}
        </div>

        {right && (
          <div className="flex items-center gap-3 pt-1 shrink-0">
            {right}
          </div>
        )}
      </div>

      {/* Gold gradient separator */}
      <div className="somatic-line mt-4" />
    </div>
  );
}
