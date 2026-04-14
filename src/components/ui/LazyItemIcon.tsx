/**
 * LazyItemIcon — renders an ItemIcon only when the element enters the viewport.
 *
 * Strategy: IntersectionObserver replaces native loading="lazy" for React-level
 * control. The <img> src is not even set until the placeholder div scrolls into
 * view, preventing any network request for off-screen items.
 *
 * Usage (drop-in replacement for ItemIcon with large lists):
 *   <LazyItemIcon imageName="ash-f2c6f3ab3f.png" name="Ash" size="md" />
 *   <LazyItemIcon item={warframeItem} size={48} />
 */

import { useRef, useState, useEffect } from 'react';
import { ItemIcon, type ItemIconProps } from './ItemIcon';
import { cn } from '@/lib/utils';

export type LazyItemIconProps = ItemIconProps & {
  /** Expand the detection margin around the viewport (CSS margin syntax). Default: "100px". */
  rootMargin?: string;
};

export function LazyItemIcon({
  rootMargin = '100px',
  className,
  size = 'md',
  ...rest
}: LazyItemIconProps) {
  const ref        = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Bail to immediate render when IntersectionObserver isn't available
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect(); // one-shot — never goes back to hidden
        }
      },
      { rootMargin, threshold: 0 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  // Compute pixel size for the placeholder skeleton
  const SIZE_MAP = { xs: 24, sm: 32, md: 48, lg: 64, xl: 96 } as const;
  const px = typeof size === 'number' ? size : SIZE_MAP[size as keyof typeof SIZE_MAP] ?? 48;

  if (!visible) {
    // Placeholder: same dimensions as the real icon, prevents layout shift
    return (
      <div
        ref={ref}
        className={cn('shrink-0 rounded-sm bg-surface-container-highest/30', className)}
        style={{ width: px, height: px }}
        aria-hidden="true"
      />
    );
  }

  return <ItemIcon {...rest} size={size} className={className} />;
}
