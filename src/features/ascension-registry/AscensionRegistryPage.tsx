import { PageHero } from '@/components/ui/PageHero';

export function AscensionRegistryPage() {
  return (
    <>
      <PageHero prefix="ASCENSION" title="REGISTRY" subtitle="Mastery & Progression Tracker" />
      <div className="coming-soon-body">
        <span className="coming-soon-label">Systems Initializing</span>
      </div>
    </>
  );
}
