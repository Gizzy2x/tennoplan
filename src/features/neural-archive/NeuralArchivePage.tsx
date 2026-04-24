import { PageHero } from '@/components/ui/PageHero';

export function NeuralArchivePage() {
  return (
    <>
      <PageHero prefix="NEURAL" title="ARCHIVE" subtitle="Item Database & Drop Rates" />
      <div className="coming-soon-body">
        <span className="coming-soon-label">Systems Initializing</span>
      </div>
    </>
  );
}
