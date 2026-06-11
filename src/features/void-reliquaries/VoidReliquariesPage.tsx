import { PageHero } from '@/components/ui/PageHero';

export function VoidReliquariesPage() {
  return (
    <>
      <PageHero prefix="VOID" title="RELIQUARIES" subtitle="Active Fissures & Relic Vault" />
      <div className="coming-soon-body">
        <span className="coming-soon-label">Systems Initializing</span>
      </div>
    </>
  );
}
