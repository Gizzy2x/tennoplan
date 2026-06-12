import { PageHero } from '@/components/ui/PageHero';

export function DailiesWeekliesPage() {
  return (
    <>
      <PageHero prefix="DAILIES" title="& WEEKLIES" subtitle="Daily & Weekly Reset Tracker" />
      <div className="coming-soon-body">
        <span className="coming-soon-label">Systems Initializing</span>
      </div>
    </>
  );
}
