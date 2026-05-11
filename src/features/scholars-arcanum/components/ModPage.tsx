import { useMemo } from 'react';
import { ModCard } from './ModCard';
import type { ModEntry } from '@/lib/mods/modsAdapter';
import { useIconBlobUrl } from '@/lib/icons/iconBlobCache';
import { getIconUrl } from '@/lib/icons/IconResolver';

const COMPAT_LABEL_FULL: Record<string, string> = {
  SHOTGUN:   'Shotgun Mods',
  RIFLE:     'Rifle Mods',
  SECONDARY: 'Secondary Mods',
  MELEE:     'Melee Mods',
  WARFRAME:  'Warframe Mods',
  COMPANION: 'Companion Mods',
  ARCHWING:  'Archwing Mods',
  AURA:      'Aura Mods',
  STANCE:    'Stance Mods',
  RIVEN:     'Riven Mods',
  EXILUS:    'Exilus Mods',
};

function SidebarFeatureCard({ mod }: { mod: ModEntry }) {
  const cdnUrl  = mod.imageName ? getIconUrl(mod.imageName) : '/lotus-placeholder.svg';
  const iconSrc = useIconBlobUrl(cdnUrl);
  const label   = COMPAT_LABEL_FULL[mod.compatName] ?? `${mod.compatName} Mods`;

  return (
    <div className="mod-sidebar-card">
      <div className="mod-sidebar-art">
        <img src={iconSrc} alt="" className="mod-sidebar-icon" aria-hidden="true" decoding="async" />
        <div className="mod-sidebar-overlay" />
      </div>
      <div className="mod-sidebar-footer">
        <span className="mod-sidebar-label">{label}</span>
      </div>
    </div>
  );
}

function RelatedModsSection({ modName }: { modName: string }) {
  return (
    <div className="mod-related-section">
      <div className="section-divider">
        <span className="section-divider-label typo-label-xs">{modName} RELATED MODS</span>
        <div className="section-divider-line" />
      </div>
      <p className="mod-related-stub typo-label-xs">
        Related mods — coming in Phase 3.
      </p>
    </div>
  );
}

interface ModPageProps {
  mod:    ModEntry;
  onBack: () => void;
}

export function ModPage({ mod, onBack }: ModPageProps) {
  const ranks = useMemo(
    () => Array.from({ length: mod.levelStats.length }, (_, i) => i),
    [mod.levelStats.length],
  );

  return (
    <div className="mod-page">
      <nav className="mod-breadcrumb typo-label-xs" aria-label="Breadcrumb">
        <button className="mod-breadcrumb-link" onClick={onBack}>MODS</button>
        <span className="mod-breadcrumb-sep">&rsaquo;</span>
        <span className="mod-breadcrumb-current">{mod.name.toUpperCase()}</span>
      </nav>

      <div className="mod-page-hero">
        <div>
          <h1 className="mod-page-title orokin-etched">{mod.name.toUpperCase()}</h1>
          <p className="mod-page-subtitle typo-label-xs">
            {mod.type}
            {mod.rarity && <span>&ensp;&middot;&ensp;{mod.rarity}</span>}
            &ensp;&middot;&ensp;{mod.levelStats.length} RANKS
          </p>
        </div>
      </div>
      <div className="somatic-line" style={{ margin: '0 0 var(--space-xl)' }} />

      <div className="mod-page-layout">
        <div className="mod-rank-grid-wrap">
          <div className="mod-rank-grid">
            {ranks.map((r) => (
              <ModCard key={r} mod={mod} rank={r} size="grid" />
            ))}
          </div>
        </div>
        <SidebarFeatureCard mod={mod} />
      </div>

      <RelatedModsSection modName={mod.name.toUpperCase()} />
    </div>
  );
}
