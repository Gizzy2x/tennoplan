import { PageHero } from '@/components/ui/PageHero';

export function SolarRailFeedPage() {
  return (
    <>
      <PageHero prefix="SOLAR RAIL" title="FEED" subtitle="Live Alerts, Invasions & Events" />
      <div className="coming-soon-body">
        <span className="coming-soon-label">Systems Initializing</span>
      </div>
    </>
  );
}
