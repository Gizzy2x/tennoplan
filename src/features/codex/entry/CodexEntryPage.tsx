/**
 * CodexEntryPage — generic shell for a single codex entry.
 *
 * Two-column layout: left column hosts the long-scroll content blocks
 * (description, abilities with prose, components, drops, etc.); the
 * right column hosts a sticky per-category summary card (intrinsic
 * stats, mod baselines, derived stats — built first for Warframes).
 *
 * Categories without a registered summary fall back to single-column
 * automatically (see `hasSummaryFor`), so the rollout is incremental.
 *
 * Each left-column block is responsible for deciding whether it has
 * enough data to render — blocks return null when their data is absent,
 * so adding a new optional field to TennoplanItem doesn't require shell
 * changes and missing data doesn't leave empty boxes.
 *
 * Mods render here too, as a full detail page (ModCard block), so they flow
 * through the same breadcrumb / back navigation as every other entry. The
 * old ModDetailModal overlay is retired.
 */

import { useState } from 'react';
import clsx from 'clsx';
import type { CodexEntry } from '../types';
import { blocksFor, type BlockKey } from './blockSets';
import { CodexSummaryRail, hasSummaryFor } from './summary/CodexSummaryRail';
import { HeaderBlock } from './blocks/HeaderBlock';
import { HeroIconBlock } from './blocks/HeroIconBlock';
import { StatsWarframeBlock } from './blocks/StatsWarframeBlock';
import { DescriptionBlock } from './blocks/DescriptionBlock';
import { PolaritiesBlock } from './blocks/PolaritiesBlock';
import { AbilitiesBlock } from './blocks/AbilitiesBlock';
import { PassiveBlock } from './blocks/PassiveBlock';
import { GeneralInformationBlock } from './blocks/GeneralInformationBlock';
import { WikiFooterBlock } from './blocks/WikiFooterBlock';
import { ModStatsBlock } from './blocks/ModStatsBlock';
import { ModDetailBlock } from './blocks/ModDetailBlock';
import { BestFarmsBlock } from './blocks/BestFarmsBlock';
import { PatchHistoryBlock } from './blocks/PatchHistoryBlock';
import { BuildBlock } from './blocks/BuildBlock';
import { DropsBlock } from './blocks/DropsBlock';
import { ComponentsBlock } from './blocks/ComponentsBlock';
import { AugmentContextBlock } from './blocks/AugmentContextBlock';
import { PlanetaryOriginsBlock } from './blocks/PlanetaryOriginsBlock';
import { ConsumersBlock } from './blocks/ConsumersBlock';
import { RelatedEntriesBlock } from './blocks/RelatedEntriesBlock';

interface CodexEntryPageProps {
  entry: CodexEntry;
  /** Open another codex entry (component sub-cards, related links). */
  onSelectEntry?: (entry: CodexEntry) => void;
}

export function CodexEntryPage({ entry, onSelectEntry }: CodexEntryPageProps) {
  const blocks   = blocksFor(entry.category);
  const withRail = hasSummaryFor(entry.category);

  return (
    <div className={clsx('codex-entry', withRail && 'codex-entry--with-rail')}>
      <main className="codex-entry__content">
        {blocks.map((key) => (
          <BlockSlot
            key={key}
            blockKey={key}
            entry={entry}
            onSelectEntry={onSelectEntry}
          />
        ))}
      </main>
      {withRail && (
        <aside className="codex-entry__rail">
          <CodexSummaryRail entry={entry} />
        </aside>
      )}
    </div>
  );
}

interface BlockSlotProps {
  blockKey:        BlockKey;
  entry:           CodexEntry;
  onSelectEntry?:  (entry: CodexEntry) => void;
}

/**
 * Dispatcher — turns a BlockKey into a rendered component.
 * Unimplemented keys render a labelled placeholder so the shell stays
 * visually meaningful while the catalog continues to grow (RelicRewards,
 * DucatValue, etc. land in later steps).
 */
function BlockSlot({ blockKey, entry, onSelectEntry }: BlockSlotProps) {
  switch (blockKey) {
    case 'Header':         return <HeaderBlock entry={entry} />;
    case 'HeroIcon':       return <HeroIconBlock entry={entry} />;
    case 'StatsWarframe':  return <StatsWarframeBlock entry={entry} />;
    case 'Description':    return <DescriptionBlock entry={entry} />;
    case 'Polarities':     return <PolaritiesBlock entry={entry} />;
    case 'Abilities':      return <AbilitiesBlock entry={entry} />;
    case 'Passive':        return <PassiveBlock entry={entry} />;
    case 'GeneralInformation': return <GeneralInformationBlock entry={entry} />;
    case 'WikiFooter':     return <WikiFooterBlock entry={entry} />;
    case 'ModCard':        return <ModDetailBlock entry={entry} />;
    case 'ModStats':       return <ModStatsBlockSlot entry={entry} />;
    case 'ArcaneStats':    return <ArcaneStatsBlockSlot entry={entry} />;
    case 'AugmentContext':
      return (
        <AugmentContextBlock
          isAugment={entry.isAugment === true}
          compatName={entry.compatName}
          onSelectWarframe={onSelectEntry}
        />
      );
    case 'PlanetaryOrigins': return <PlanetaryOriginsBlock entry={entry} />;
    case 'Consumers':        return <ConsumersBlock entry={entry} onSelectEntry={onSelectEntry} />;
    case 'BestFarms':      return <BestFarmsBlock entry={entry} />;
    case 'PatchHistory':   return <PatchHistoryBlock entry={entry} />;
    case 'Build':          return <BuildBlock entry={entry} />;
    case 'Drops':          return <DropsBlock entry={entry} />;
    case 'Components':     return <ComponentsBlock entry={entry} onSelectEntry={onSelectEntry} />;
    case 'Related':        return <RelatedEntriesBlock entry={entry} onSelectEntry={onSelectEntry} />;
    default:
      return (
        <div className="codex-entry-placeholder">
          <span className="typo-label-xs">{blockKey}</span>
        </div>
      );
  }
}

/**
 * Local wrapper that owns rank state for ModStatsBlock. The block is
 * controlled so a future full-page mod view can sync rank to the URL;
 * for now we keep rank in component state defaulted to max rank.
 */
function ModStatsBlockSlot({ entry }: { entry: CodexEntry }) {
  const levelStats = entry.levelStats ?? [];
  const maxRank = Math.max(0, levelStats.length - 1);
  const [rank, setRank] = useState(maxRank);

  if (levelStats.length === 0) return null;

  return (
    <ModStatsBlock
      levelStats={levelStats}
      baseDrain={entry.baseDrain ?? 0}
      rank={rank}
      onRankChange={setRank}
    />
  );
}

/**
 * Sibling of ModStatsBlockSlot for arcane entries. Arcanes ship the same
 * `levelStats` shape (per-rank stat-line arrays) as mods, so we reuse
 * ModStatsBlock as the rendering primitive — only difference is no drain
 * (arcanes don't cost mod capacity) and the slider's aria-label reads
 * "Arcane rank" so screen-reader users hear the right noun.
 */
function ArcaneStatsBlockSlot({ entry }: { entry: CodexEntry }) {
  const levelStats = entry.levelStats ?? [];
  const maxRank = Math.max(0, levelStats.length - 1);
  const [rank, setRank] = useState(maxRank);

  if (levelStats.length === 0) return null;

  return (
    <ModStatsBlock
      levelStats={levelStats}
      baseDrain={0}
      rank={rank}
      onRankChange={setRank}
      rankAriaLabel="Arcane rank"
    />
  );
}
