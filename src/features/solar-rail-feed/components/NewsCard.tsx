import { ExternalLink } from 'lucide-react';
import type { NewsItem } from '@/core/domain/railFeed';

export interface NewsCardProps {
  item: NewsItem;
}

function NewsTypeTag({ item }: { item: NewsItem }) {
  if (item.isUpdate) {
    return (
      <span
        data-role="labelTiny"
        className="typo-label-xs px-2 py-0.5 flex-shrink-0"
        style={{
          color:           '#DBB058',
          border:          '1px solid rgba(219, 176, 88,0.35)',
          backgroundColor: 'rgba(219, 176, 88,0.08)',
        }}
      >
        Update
      </span>
    );
  }
  if (item.isPrime) {
    return (
      <span
        data-role="labelTiny"
        className="typo-label-xs px-2 py-0.5 flex-shrink-0"
        style={{
          color:           '#bac3fe',
          border:          '1px solid rgba(186,195,254,0.35)',
          backgroundColor: 'rgba(186,195,254,0.08)',
        }}
      >
        Prime
      </span>
    );
  }
  if (item.isStream) {
    return (
      <span
        data-role="labelTiny"
        className="typo-label-xs px-2 py-0.5 flex-shrink-0"
        style={{
          color:           '#C6C6C7',
          border:          '1px solid rgba(198,198,199,0.25)',
          backgroundColor: 'rgba(198,198,199,0.06)',
        }}
      >
        Stream
      </span>
    );
  }
  return (
    <span
      data-role="labelTiny"
      className="typo-label-xs flex-shrink-0 px-2 py-0.5"
      style={{
        color:   '#C6C6C7',
        opacity: 0.40,
        border:  '1px solid rgba(197,192,190,0.10)',
      }}
    >
      News
    </span>
  );
}

function formatDate(ms: number): string {
  if (!ms || isNaN(ms)) return '';
  try {
    return new Date(ms).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

export function NewsItemRow({ item }: { item: NewsItem }) {
  return (
    <div className="flex items-center gap-3 py-2.5" style={{ borderBottom: '1px solid rgba(197,192,190,0.06)' }}>
      <NewsTypeTag item={item} />
      <p
        data-role="body"
        className="typo-body flex-1 min-w-0 truncate text-on-surface"
      >
        {item.headline}
      </p>
      <p
        className="font-mono text-[9px] tabular-nums flex-shrink-0"
        style={{ color: '#C6C6C7', opacity: 0.35 }}
      >
        {formatDate(item.dateMs)}
      </p>
      {item.link && (
        <ExternalLink size={12} strokeWidth={1.5} style={{ color: '#C6C6C7', opacity: 0.35, flexShrink: 0 }} />
      )}
    </div>
  );
}

// NewsCard is intentionally exported but unused — the page renders NewsItemRow directly.
export function NewsCard({ item }: NewsCardProps) {
  return <NewsItemRow item={item} />;
}
