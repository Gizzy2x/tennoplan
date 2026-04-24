import { useState } from 'react';
import { PageHero } from '@/components/ui/PageHero';
import { TabNav } from '@/components/ui/TabNav';

type ItemCategory = 'warframes' | 'weapons' | 'companions' | 'archwings';

const CATEGORIES: { id: ItemCategory; label: string }[] = [
  { id: 'warframes',  label: 'Warframes'  },
  { id: 'weapons',    label: 'Weapons'    },
  { id: 'companions', label: 'Companions' },
  { id: 'archwings',  label: 'Archwings'  },
];

function ProgressStat({ label, current, total }: { label: string; current: number; total: number }) {
  const percent = Math.min(100, (current / total) * 100);
  return (
    <div className="content-card p-3">
      <p className="font-label text-[10px] font-semibold uppercase tracking-[0.18em] text-secondary/55 mb-2">
        {label}
      </p>
      <p className="font-label text-sm font-bold text-primary mb-2 tabular-nums">
        {current} / {total}
      </p>
      <div className="w-full h-0.5 bg-primary/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full"
          style={{
            width:     `${percent}%`,
            boxShadow: '0 0 8px rgba(227,195,114,0.40)',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  );
}

export function AscensionRegistryPage() {
  const [activeCategory, setActiveCategory] = useState<ItemCategory>('warframes');

  return (
    <>
      <PageHero prefix="ASCENSION" title="REGISTRY" subtitle="Mastery & Progression Tracker" />

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <ProgressStat label="Current MR"  current={15}  total={30}  />
        <ProgressStat label="Warframes"   current={28}  total={56}  />
        <ProgressStat label="Weapons"     current={142} total={345} />
      </div>

      {/* Category Tabs */}
      <TabNav
        tabs={CATEGORIES}
        activeId={activeCategory}
        onSelect={(id) => setActiveCategory(id as ItemCategory)}
        className="mb-6"
      />

      {/* Item Grid (placeholder) */}
      <div className="grid grid-cols-6 gap-3">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="content-card content-card-interactive p-3 flex flex-col items-center gap-2 text-center"
          >
            <div
              className="w-10 h-10 rounded-full border border-primary/30 flex items-center justify-center shrink-0"
              style={{ background: 'rgba(227,195,114,0.06)' }}
            >
              <div className="w-4 h-4 rounded-full bg-primary/20" />
            </div>
            <span className="font-label text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/80">
              Item {i + 1}
            </span>
            <span className="font-label text-[9px] uppercase tracking-[0.14em] text-secondary/45">
              Not Owned
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
