/**
 * TacticalRadar — Phase 3 of the Celestial Pendulum redesign.
 *
 * Replaces TimerHeroPanel as the page's hero section. Layout:
 *   Left (28%):  Compact timer — state, countdown, cycle note
 *   Right (72%): SVG blueprint radar with hotspot nodes
 *
 * Radar behaviour:
 *   • Active hotspots  — current cycle, bright + solid glow
 *   • Ghost hotspots   — next cycle when isPreHeat, hollow + pulsing outline
 *   • Scan-line sweep  — vertical wipe animation on cycleState change
 *   • Hover tooltip    — resource name, location, short tip
 *
 * Worlds without a map (Fortuna, Zariman, Duviri) fall back to a
 * placeholder card showing the world's key resources list.
 */

import { memo, useState, useEffect, useRef, useCallback } from 'react';
import type { CycleId } from '@/core/domain/cycles';
import type { CycleUrgency } from '../hooks/useWorldCycles';
import type { KeyResource } from './TimerHeroPanel';
import { RADAR_MAPS, HAS_RADAR_MAP } from '../data/radarMaps';
import type { RadarHotspot, RadarMapDef } from '../data/radarMaps';
import { WORLD_THEMES } from '@/tokens/worldThemes';

// ─── Props ────────────────────────────────────────────────────────────────────

interface TacticalRadarProps {
  worldId:       CycleId;
  cycleState:    string;       // e.g. "day", "night", "fass"
  timeRemaining: string;       // pre-formatted, e.g. "37M"
  cycleNote?:    string | null;
  resources:     KeyResource[];
  urgency?:      CycleUrgency;
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

interface TooltipState {
  hotspot: RadarHotspot;
  x: number;   // SVG viewBox coordinate
  y: number;
}

// ─── SVG Blueprint ────────────────────────────────────────────────────────────

const VIEWBOX_W = 400;
const VIEWBOX_H = 220;
const GRID_STEP = 20;

function BlueprintGrid({ accent }: { accent: string }) {
  const lines: React.ReactElement[] = [];
  // Vertical grid lines
  for (let x = 0; x <= VIEWBOX_W; x += GRID_STEP) {
    lines.push(
      <line key={`v${x}`} x1={x} y1={0} x2={x} y2={VIEWBOX_H}
        stroke={accent} strokeWidth="0.4" opacity="0.12" />
    );
  }
  // Horizontal grid lines
  for (let y = 0; y <= VIEWBOX_H; y += GRID_STEP) {
    lines.push(
      <line key={`h${y}`} x1={0} y1={y} x2={VIEWBOX_W} y2={y}
        stroke={accent} strokeWidth="0.4" opacity="0.12" />
    );
  }
  return <g className="radar-grid">{lines}</g>;
}

interface HotspotNodeProps {
  hotspot: RadarHotspot;
  accent:  string;
  isGhost: boolean;
  onHover: (h: RadarHotspot | null, x: number, y: number) => void;
}

function HotspotNode({ hotspot, accent, isGhost, onHover }: HotspotNodeProps) {
  const r      = hotspot.tier === 'primary' ? 5 : 3.5;
  const rOuter = hotspot.tier === 'primary' ? 10 : 7;

  return (
    <g
      className={`radar-hotspot ${isGhost ? 'radar-hotspot--ghost' : 'radar-hotspot--active'}`}
      style={{ '--radar-accent': accent } as React.CSSProperties}
      onMouseEnter={() => onHover(hotspot, hotspot.cx, hotspot.cy)}
      onMouseLeave={() => onHover(null, 0, 0)}
      aria-label={`${hotspot.label}: ${hotspot.resource}`}
    >
      {/* Outer ring */}
      <circle
        cx={hotspot.cx} cy={hotspot.cy} r={rOuter}
        fill="none"
        stroke={accent}
        strokeWidth={isGhost ? 0.8 : 0.6}
        opacity={isGhost ? 0.4 : 0.25}
        className={isGhost ? 'radar-hotspot-ring--ghost' : undefined}
      />
      {/* Inner dot */}
      <circle
        cx={hotspot.cx} cy={hotspot.cy} r={r}
        fill={isGhost ? 'none' : accent}
        stroke={accent}
        strokeWidth={isGhost ? 1.2 : 0}
        opacity={isGhost ? 0.55 : 0.9}
      />
      {/* Crosshair arms (primary only) */}
      {hotspot.tier === 'primary' && (
        <g stroke={accent} strokeWidth="0.8" opacity={isGhost ? 0.3 : 0.6}>
          <line x1={hotspot.cx - 14} y1={hotspot.cy} x2={hotspot.cx - r - 2} y2={hotspot.cy} />
          <line x1={hotspot.cx + r + 2} y1={hotspot.cy} x2={hotspot.cx + 14} y2={hotspot.cy} />
          <line x1={hotspot.cx} y1={hotspot.cy - 14} x2={hotspot.cx} y2={hotspot.cy - r - 2} />
          <line x1={hotspot.cx} y1={hotspot.cy + r + 2} x2={hotspot.cx} y2={hotspot.cy + 14} />
        </g>
      )}
    </g>
  );
}

// ─── Tooltip popup ───────────────────────────────────────────────────────────

function RadarTooltip({ tooltip, accent }: { tooltip: TooltipState; accent: string }) {
  // Clamp tooltip so it doesn't overflow the SVG viewbox edges
  const boxW = 140;
  const boxH = 58;
  const pad  = 8;
  let tx = tooltip.x + 14;
  let ty = tooltip.y - boxH - 6;
  if (tx + boxW > VIEWBOX_W - pad) tx = tooltip.x - boxW - 14;
  if (ty < pad) ty = tooltip.y + 14;

  return (
    <g className="radar-tooltip">
      <rect
        x={tx} y={ty} width={boxW} height={boxH} rx={3}
        fill="rgba(10,17,23,0.94)"
        stroke={accent}
        strokeWidth="0.8"
        opacity="0.95"
      />
      {/* Resource name */}
      <text x={tx + 8} y={ty + 14} fill={accent}
        fontSize="8" fontFamily="Inter, sans-serif"
        fontWeight="600" letterSpacing="0.08em"
      >
        {tooltip.hotspot.resource.toUpperCase()}
      </text>
      {/* Location */}
      <text x={tx + 8} y={ty + 26} fill="rgba(229,226,225,0.85)"
        fontSize="7.5" fontFamily="Inter, sans-serif"
      >
        {tooltip.hotspot.label}
      </text>
      {/* Tip — wrap at ~120 chars wide (2 lines).
          xmlns is required for foreignObject to render XHTML inside SVG;
          React's HTMLDivElement types don't surface it, so we spread via
          a generic attribute object to keep TS happy without losing the
          SVG-correct markup. */}
      <foreignObject x={tx + 8} y={ty + 32} width={boxW - 16} height={24}>
        <div
          {...{ xmlns: 'http://www.w3.org/1999/xhtml' }}
          style={{ fontSize: '6.5px', color: 'rgba(168,165,160,0.9)', lineHeight: 1.4, fontFamily: 'Inter, sans-serif' }}
        >
          {tooltip.hotspot.tip}
        </div>
      </foreignObject>
    </g>
  );
}

// ─── Map stub (for worlds without a custom radar map) ────────────────────────

function RadarStub({ worldId, resources, accent }: {
  worldId:   CycleId;
  resources: KeyResource[];
  accent:    string;
}) {
  return (
    <div className="radar-stub">
      <div className="radar-stub-label" style={{ color: accent }}>
        FIELD SURVEY PENDING
      </div>
      <div className="radar-stub-world">{worldId.toUpperCase()} CARTOGRAPHY IN PROGRESS</div>
      <div className="radar-stub-resources">
        {resources.map(r => (
          <div key={r.name} className="radar-stub-resource">
            <span className="radar-stub-resource-name">{r.name}</span>
            <span className="radar-stub-resource-source">{r.source}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export const TacticalRadar = memo(function TacticalRadar({
  worldId,
  cycleState,
  timeRemaining,
  cycleNote,
  resources,
  urgency,
}: TacticalRadarProps) {
  const [tooltip,    setTooltip]   = useState<TooltipState | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const prevStateRef = useRef(cycleState);
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Trigger scan-line sweep when cycleState changes
  useEffect(() => {
    if (prevStateRef.current !== cycleState) {
      prevStateRef.current = cycleState;
      setIsScanning(true);
      setTooltip(null);
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
      scanTimerRef.current = setTimeout(() => setIsScanning(false), 700);
    }
    return () => {
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    };
  }, [cycleState]);

  const handleHotspotHover = useCallback((
    hotspot: RadarHotspot | null,
    x: number,
    y: number,
  ) => {
    setTooltip(hotspot ? { hotspot, x, y } : null);
  }, []);

  const theme      = WORLD_THEMES[worldId];
  const accent     = theme?.accent ?? 'var(--color-accent-teal)';
  const mapDef     = RADAR_MAPS[worldId] as RadarMapDef | undefined;
  const isPreHeat  = urgency?.isPreHeat ?? false;
  const nextState  = urgency?.nextStateKey.split('-')[1] ?? '';

  // Partition hotspots into active vs ghost layers
  const activeHotspots = mapDef?.hotspots.filter(h =>
    h.cycles.includes(cycleState)
  ) ?? [];
  const ghostHotspots = (isPreHeat && nextState && mapDef)
    ? mapDef.hotspots.filter(h => h.cycles.includes(nextState) && !h.cycles.includes(cycleState))
    : [];

  return (
    <div className="tactical-radar">
      {/* ── Left: compact timer panel ───────────────────────────────── */}
      <div className="radar-timer-panel">
        <div className="radar-timer-label">CURRENT CYCLE</div>

        <div className="radar-timer-state" style={{ color: accent }}>
          {cycleState.toUpperCase()}
        </div>

        <div className="radar-timer-countdown">
          <span className="radar-timer-value">{timeRemaining}</span>
          <span className="radar-timer-unit">REMAINING</span>
        </div>

        {cycleNote && (
          <div className="radar-cycle-note">
            <span className="radar-cycle-note-icon" style={{ color: accent }}>◆</span>
            <span className="radar-cycle-note-text">{cycleNote}</span>
          </div>
        )}

        {isPreHeat && (
          <div className="radar-pre-heat-badge">
            ↑ {nextState.toUpperCase()} INCOMING
          </div>
        )}

        <div className="radar-timer-divider" />
        <div className="radar-resources-label">KEY RESOURCES</div>
        <div className="radar-resources-list">
          {resources.slice(0, 5).map(r => (
            <div key={r.name} className="radar-resource-row">
              <span className="radar-resource-name">{r.name}</span>
              <span className="radar-resource-source">{r.source}</span>
            </div>
          ))}
          {resources.length === 0 && (
            <span className="radar-resource-empty">No resources for this cycle</span>
          )}
        </div>
      </div>

      {/* ── Right: SVG blueprint or stub ────────────────────────────── */}
      <div className="radar-map-container">
        {HAS_RADAR_MAP(worldId) && mapDef ? (
          <svg
            viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
            className={`radar-svg${isScanning ? ' radar-svg--scanning' : ''}`}
            style={{ '--radar-accent': accent } as React.CSSProperties}
            aria-label={`${worldId} tactical map — ${cycleState}`}
          >
            <defs>
              {/* Glow filter for active hotspots */}
              <filter id={`radar-glow-${worldId}`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {/* Scan-line gradient */}
              <linearGradient id={`scan-grad-${worldId}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"   stopColor={accent} stopOpacity="0" />
                <stop offset="40%"  stopColor={accent} stopOpacity="0.55" />
                <stop offset="60%"  stopColor={accent} stopOpacity="0.55" />
                <stop offset="100%" stopColor={accent} stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Blueprint grid */}
            <BlueprintGrid accent={accent} />

            {/* World boundary */}
            <path
              d={mapDef.boundary}
              fill="none"
              stroke={accent}
              strokeWidth="1"
              opacity="0.22"
            />

            {/* Terrain / topology hints */}
            {mapDef.terrain.map((d, i) => (
              <path key={i} d={d} fill="none"
                stroke={accent} strokeWidth="0.6" opacity="0.10"
              />
            ))}

            {/* Named zones */}
            {mapDef.zones.map(zone => (
              <g key={zone.id}>
                <path d={zone.path} fill={accent}
                  fillOpacity="0.06" stroke={accent}
                  strokeWidth="0.8" opacity="0.30"
                />
              </g>
            ))}

            {/* Ghost hotspots (approaching cycle — isPreHeat only) */}
            <g filter={`url(#radar-glow-${worldId})`} className="radar-layer--ghost">
              {ghostHotspots.map(h => (
                <HotspotNode key={h.id} hotspot={h} accent={accent}
                  isGhost={true} onHover={handleHotspotHover} />
              ))}
            </g>

            {/* Active hotspots */}
            <g filter={`url(#radar-glow-${worldId})`} className="radar-layer--active">
              {activeHotspots.map(h => (
                <HotspotNode key={h.id} hotspot={h} accent={accent}
                  isGhost={false} onHover={handleHotspotHover} />
              ))}
            </g>

            {/* Entry point marker */}
            <g opacity="0.5">
              <circle cx={mapDef.entryPoint.cx} cy={mapDef.entryPoint.cy}
                r={4} fill="none" stroke={accent} strokeWidth="1" />
              <line x1={mapDef.entryPoint.cx - 7} y1={mapDef.entryPoint.cy}
                x2={mapDef.entryPoint.cx + 7} y2={mapDef.entryPoint.cy}
                stroke={accent} strokeWidth="0.8" />
              <line x1={mapDef.entryPoint.cx} y1={mapDef.entryPoint.cy - 7}
                x2={mapDef.entryPoint.cx} y2={mapDef.entryPoint.cy + 7}
                stroke={accent} strokeWidth="0.8" />
            </g>

            {/* Scan-line sweep (triggered on cycle change) */}
            {isScanning && (
              <rect
                x={0} y={0} width={24} height={VIEWBOX_H}
                fill={`url(#scan-grad-${worldId})`}
                className="radar-scan-line"
              />
            )}

            {/* Tooltip (rendered last = on top) */}
            {tooltip && !isScanning && (
              <RadarTooltip tooltip={tooltip} accent={accent} />
            )}
          </svg>
        ) : (
          <RadarStub worldId={worldId} resources={resources} accent={accent} />
        )}

        {/* Map legend */}
        {mapDef && (
          <div className="radar-legend">
            <span className="radar-legend-item">
              <span className="radar-legend-dot radar-legend-dot--active"
                style={{ background: accent }} />
              Active farming
            </span>
            {isPreHeat && ghostHotspots.length > 0 && (
              <span className="radar-legend-item">
                <span className="radar-legend-dot radar-legend-dot--ghost"
                  style={{ borderColor: accent }} />
                Approaching ({nextState})
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
