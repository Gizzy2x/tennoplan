import { useState, useEffect, useRef, useCallback } from 'react';
import { useThemeStore } from '@/store/theme';
import type { CardOverride } from '@/store/theme';
import {
  TYPOGRAPHY_ROLE_MAP,
  FONT_FAMILY_OPTIONS,
  type TypographyRoleName,
  type TypographyRole,
  type DesignTokens,
} from '@/tokens/index';
import { getTypographyStyle } from '@/tokens/utils';

if (!import.meta.env.DEV) {
  // Fail fast at module level — nothing in this file should run in production
}

// ─────────────────────────────────────────────────────────────────────────────
// Colour / contrast helpers
// ─────────────────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] | null {
  const h = hex.replace(/^#/, '');
  if (h.length === 3) return [parseInt(h[0]+h[0],16), parseInt(h[1]+h[1],16), parseInt(h[2]+h[2],16)];
  if (h.length >= 6) return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
  return null;
}

function relativeLuminance(hex: string): number | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const toL = (c: number) => { const s = c/255; return s<=0.03928 ? s/12.92 : Math.pow((s+0.055)/1.055, 2.4); };
  return 0.2126*toL(rgb[0]) + 0.7152*toL(rgb[1]) + 0.0722*toL(rgb[2]);
}

function contrastRatio(a: string, b: string): number | null {
  const l1 = relativeLuminance(a), l2 = relativeLuminance(b);
  if (l1===null||l2===null) return null;
  const hi=Math.max(l1,l2), lo=Math.min(l1,l2);
  return (hi+0.05)/(lo+0.05);
}

function wcagBadge(ratio: number): { label: string; clr: string } {
  if (ratio >= 7)   return { label:'AAA',      clr:'#4ade80' };
  if (ratio >= 4.5) return { label:'AA',        clr:'#86efac' };
  if (ratio >= 3)   return { label:'AA Large',  clr:'#fbbf24' };
  return                   { label:'FAIL',      clr:'#f87171' };
}

// ─────────────────────────────────────────────────────────────────────────────
// Audit helpers
// ─────────────────────────────────────────────────────────────────────────────

interface AuditItem {
  path: string;
  text: string;
  fontSize: string;
  hasRole: boolean;
  role?: string;
  suggestedRole: TypographyRoleName;
  el: HTMLElement;
}

function getElemPath(el: HTMLElement): string {
  const parts: string[] = [];
  let cur: HTMLElement | null = el;
  for (let d=0; d<4 && cur && cur!==document.body; d++) {
    const t = cur.tagName.toLowerCase();
    const c = typeof cur.className==='string' && cur.className ? `.${cur.className.trim().split(/\s+/)[0]}` : '';
    parts.unshift(t+c);
    cur = cur.parentElement;
  }
  return parts.join('>');
}

function closestRole(sizeRem: number): TypographyRoleName {
  if (sizeRem >= 1.8) return 'hero';
  if (sizeRem >= 0.8) return 'tabTitle';
  if (sizeRem >= 0.50) return 'sectionHeader';
  if (sizeRem >= 0.42) return 'emphasis';
  if (sizeRem >= 0.34) return 'body';
  if (sizeRem >= 0.26) return 'labelSmall';
  return 'labelTiny';
}

function runAudit(editorRoot: HTMLElement | null): AuditItem[] {
  const results: AuditItem[] = [];
  const seen = new Set<HTMLElement>();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const parent = (node as Text).parentElement;
    if (parent && !seen.has(parent) && parent.textContent?.trim()) {
      if (!editorRoot?.contains(parent)) {
        seen.add(parent);
        const cs = window.getComputedStyle(parent);
        const pxSize = parseFloat(cs.fontSize);
        const sizeRem = pxSize / 16;
        const role = parent.getAttribute('data-role') ?? undefined;
        results.push({
          path: getElemPath(parent),
          text: (node.textContent ?? '').slice(0, 60),
          fontSize: cs.fontSize,
          hasRole: !!role,
          role,
          suggestedRole: closestRole(sizeRem),
          el: parent,
        });
      }
    }
    node = walker.nextNode();
  }
  return results.filter(r => !r.hasRole).slice(0, 80);
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared Orokin editor styles
// ─────────────────────────────────────────────────────────────────────────────

const ED: Record<string, React.CSSProperties> = {
  panel: {
    background: 'rgba(8,8,6,0.97)',
    border: '1px solid rgba(227,195,114,0.25)',
    borderRadius: 4,
    fontFamily: '"Noto Sans",-apple-system,sans-serif',
    color: '#e5e2e1',
  },
  sectionTitle: {
    fontSize: '0.60rem',
    fontWeight: 700,
    letterSpacing: '0.22em',
    textTransform: 'uppercase' as const,
    color: 'rgba(227,195,114,0.7)',
    margin: 0,
    marginBottom: 10,
    paddingBottom: 6,
    borderBottom: '1px solid rgba(227,195,114,0.12)',
  },
  label: {
    fontSize: '0.52rem',
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    color: 'rgba(227,195,114,0.55)',
  },
  value: {
    fontSize: '0.52rem',
    fontFamily: 'monospace',
    color: 'rgba(227,195,114,0.75)',
  },
  tab: (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '5px 4px',
    background: active ? 'rgba(227,195,114,0.12)' : 'transparent',
    border: 'none',
    borderBottom: active ? '1px solid rgba(227,195,114,0.6)' : '1px solid transparent',
    color: active ? '#e3c372' : 'rgba(227,195,114,0.4)',
    fontSize: '0.48rem',
    fontWeight: 700,
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
  }),
  btn: (variant: 'primary'|'ghost' = 'ghost'): React.CSSProperties => ({
    padding: '5px 10px',
    background: variant==='primary' ? 'rgba(227,195,114,0.18)' : 'rgba(227,195,114,0.07)',
    border: `1px solid rgba(227,195,114,${variant==='primary'?'0.4':'0.18'})`,
    borderRadius: 2,
    color: variant==='primary' ? '#e3c372' : 'rgba(227,195,114,0.6)',
    fontSize: '0.52rem',
    fontWeight: 700,
    letterSpacing: '0.10em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    transition: 'all 0.15s',
  }),
  input: {
    padding: '4px 7px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(227,195,114,0.18)',
    borderRadius: 2,
    color: 'rgba(227,195,114,0.8)',
    fontSize: '0.52rem',
    fontFamily: 'monospace',
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  select: {
    padding: '4px 6px',
    background: 'rgba(20,18,14,0.95)',
    border: '1px solid rgba(227,195,114,0.2)',
    borderRadius: 2,
    color: 'rgba(227,195,114,0.8)',
    fontSize: '0.52rem',
    width: '100%',
    cursor: 'pointer',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Reusable sub-inputs
// ─────────────────────────────────────────────────────────────────────────────

function Slider({ label, value, min, max, step=0.01, unit='', digits=2, onChange }: {
  label: string; value: number; min: number; max: number;
  step?: number; unit?: string; digits?: number;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
        <span style={ED.label}>{label}</span>
        <span style={ED.value}>{value.toFixed(digits)}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{
          width:'100%', height:4, cursor:'pointer', outline:'none',
          background:`linear-gradient(to right,rgba(227,195,114,0.4) ${pct}%,rgba(227,195,114,0.1) ${pct}%)`,
        }}
      />
    </div>
  );
}

function ColourInput({ label, value, onChange }: { label:string; value:string; onChange:(v:string)=>void }) {
  return (
    <div>
      <div style={{ ...ED.label, marginBottom:4 }}>{label}</div>
      <div style={{ display:'flex', gap:5 }}>
        <input type="color" value={value} onChange={e=>onChange(e.target.value)}
          style={{ width:32, height:28, border:'1px solid rgba(227,195,114,0.2)', borderRadius:2, cursor:'pointer', padding:1 }} />
        <input type="text" value={value} onChange={e=>onChange(e.target.value)} style={{ ...ED.input, flex:1 }} />
      </div>
    </div>
  );
}

function Select({ label, value, options, onChange }: {
  label:string; value:string; options:Record<string,string>; onChange:(v:string)=>void;
}) {
  return (
    <div style={{ marginBottom:8 }}>
      <div style={{ ...ED.label, marginBottom:4 }}>{label}</div>
      <select value={value} onChange={e=>onChange(e.target.value)} style={ED.select}>
        {Object.entries(options).map(([k,v])=>(
          <option key={k} value={v}>{k}</option>
        ))}
      </select>
    </div>
  );
}

function WeightSelect({ value, onChange }: { value:number; onChange:(v:number)=>void }) {
  return (
    <div style={{ marginBottom:8 }}>
      <div style={{ ...ED.label, marginBottom:4 }}>Weight</div>
      <select value={value} onChange={e=>onChange(parseInt(e.target.value))} style={ED.select}>
        {[100,200,300,400,500,600,700,800,900].map(w=>(
          <option key={w} value={w}>{w}</option>
        ))}
      </select>
    </div>
  );
}

function TransformSelect({ value, onChange }: {
  value: 'none'|'uppercase'|'lowercase'|'capitalize'; onChange:(v:string)=>void;
}) {
  return (
    <div style={{ marginBottom:8 }}>
      <div style={{ ...ED.label, marginBottom:4 }}>Text Transform</div>
      <select value={value} onChange={e=>onChange(e.target.value)} style={ED.select}>
        {['none','uppercase','lowercase','capitalize'].map(t=>(
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Role card editor
// ─────────────────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<TypographyRoleName, string> = {
  hero: 'HERO', tabTitle: 'TAB TITLE', sectionHeader: 'SECTION HEADER',
  emphasis: 'EMPHASIS', body: 'BODY', labelSmall: 'LABEL SMALL', labelTiny: 'LABEL TINY',
};

function RoleCard({ role, tokens, overrides, search }: {
  role: TypographyRoleName;
  tokens: DesignTokens;
  overrides: Record<string, Partial<TypographyRole>>;
  search: string;
}) {
  const { updateRoleProperty, updateRoleTransform, markAsUnique, removeOverride } = useThemeStore();
  const [expanded, setExpanded] = useState(false);
  const [showOverride, setShowOverride] = useState(false);
  const [overrideId, setOverrideId] = useState('');
  const roleData = tokens.typography.roles[role];
  const scale = tokens.typography.bodyScaleMultiplier;
  const scaledSize = (parseFloat(roleData.size) * scale).toFixed(3);

  if (search && !role.toLowerCase().includes(search.toLowerCase()) &&
      !ROLE_LABELS[role].toLowerCase().includes(search.toLowerCase())) return null;

  const set = (prop: keyof TypographyRole, val: unknown) => updateRoleProperty(role, prop, val);
  const setTx = (key: keyof NonNullable<TypographyRole['transforms']>, val: number) => updateRoleTransform(role, key, val);
  const tx = roleData.transforms ?? { translateX:0, translateY:0, scale:1, rotate:0 };
  const bg = contrastRatio(roleData.color ?? tokens.colors.primary, tokens.colors.background);

  return (
    <div style={{
      marginBottom: 8,
      border: '1px solid rgba(227,195,114,0.12)',
      borderRadius: 3,
      overflow: 'hidden',
    }}>
      {/* Role header */}
      <div
        onClick={() => setExpanded(e=>!e)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '7px 10px', cursor: 'pointer',
          background: expanded ? 'rgba(227,195,114,0.07)' : 'rgba(227,195,114,0.03)',
        }}
      >
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ ...ED.label, color:'rgba(227,195,114,0.8)' }}>{ROLE_LABELS[role]}</span>
          <span style={{
            ...getTypographyStyle(tokens, role),
            color: roleData.color ?? tokens.colors.onSurface,
            maxWidth: 120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
          }}>
            {ROLE_LABELS[role]}
          </span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ ...ED.value, fontSize:'0.45rem' }}>{scaledSize}rem</span>
          {bg !== null && (
            <span style={{
              fontSize:'0.40rem', fontWeight:700, letterSpacing:'0.08em',
              color: wcagBadge(bg).clr, padding:'1px 4px',
              border:`1px solid ${wcagBadge(bg).clr}`, borderRadius:2,
            }}>
              {wcagBadge(bg).label}
            </span>
          )}
          <span style={{ color:'rgba(227,195,114,0.4)', fontSize:'0.6rem' }}>{expanded?'▲':'▼'}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ padding:'10px', background:'rgba(0,0,0,0.3)' }}>
          {/* Font family (re-type) */}
          <Select
            label="Font Family (Re-type)"
            value={roleData.fontFamily}
            options={FONT_FAMILY_OPTIONS}
            onChange={v => set('fontFamily', v)}
          />

          {/* Size */}
          <Slider label="Size" value={parseFloat(roleData.size)} min={0.20} max={4.0} step={0.01} unit="rem"
            onChange={v => set('size', `${v.toFixed(2)}rem`)} />

          {/* Weight */}
          <WeightSelect value={roleData.weight} onChange={v => set('weight', v)} />

          {/* Letter spacing */}
          <Slider label="Letter Spacing" value={parseFloat(roleData.letterSpacing)} min={0} max={0.5} step={0.005} unit="em" digits={3}
            onChange={v => set('letterSpacing', `${v.toFixed(3)}em`)} />

          {/* Text transform */}
          <TransformSelect
            value={roleData.textTransform}
            onChange={v => set('textTransform', v as TypographyRole['textTransform'])}
          />

          {/* Line height */}
          <Slider label="Line Height" value={roleData.lineHeight ?? 1.5} min={0.8} max={3.0} step={0.05} digits={2}
            onChange={v => set('lineHeight', v)} />

          {/* Word spacing */}
          <div style={{ marginBottom:8 }}>
            <div style={{ ...ED.label, marginBottom:4 }}>Word Spacing</div>
            <input type="text" value={roleData.wordSpacing ?? 'normal'}
              onChange={e => set('wordSpacing', e.target.value)}
              style={ED.input} placeholder="normal or 0.05em" />
          </div>

          {/* Color override */}
          <ColourInput
            label="Colour Override (optional)"
            value={roleData.color ?? tokens.colors.primary}
            onChange={v => set('color', v)}
          />
          {roleData.color && (
            <button style={{ ...ED.btn(), marginBottom:8, fontSize:'0.45rem' }}
              onClick={() => { const r = { ...tokens.typography.roles[role] }; delete r.color; updateRoleProperty(role, 'color', undefined); }}>
              ✕ Remove colour override
            </button>
          )}

          {/* Contrast badge */}
          {bg !== null && (
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10, padding:'5px 8px', background:'rgba(0,0,0,0.3)', borderRadius:2 }}>
              <span style={ED.label}>Contrast vs bg:</span>
              <span style={{ ...ED.value, color: wcagBadge(bg).clr }}>{bg.toFixed(2)}:1</span>
              <span style={{ fontSize:'0.42rem', fontWeight:700, color: wcagBadge(bg).clr,
                border:`1px solid ${wcagBadge(bg).clr}`, borderRadius:2, padding:'1px 4px' }}>
                {wcagBadge(bg).label}
              </span>
            </div>
          )}

          {/* 4-axis transforms */}
          <div style={{ ...ED.sectionTitle, fontSize:'0.48rem', marginTop:8 }}>4-Axis Transforms</div>
          <Slider label="Translate X" value={tx.translateX} min={-80} max={80} step={0.5} unit="px" digits={1}
            onChange={v => setTx('translateX', v)} />
          <Slider label="Translate Y" value={tx.translateY} min={-80} max={80} step={0.5} unit="px" digits={1}
            onChange={v => setTx('translateY', v)} />
          <Slider label="Scale" value={tx.scale} min={0.1} max={3.0} step={0.01} digits={2}
            onChange={v => setTx('scale', v)} />
          <Slider label="Rotate" value={tx.rotate} min={-180} max={180} step={1} unit="°" digits={0}
            onChange={v => setTx('rotate', v)} />
          {(tx.translateX!==0||tx.translateY!==0||tx.scale!==1||tx.rotate!==0) && (
            <button style={{ ...ED.btn(), marginBottom:10, fontSize:'0.45rem' }}
              onClick={() => updateRoleProperty(role, 'transforms', undefined)}>
              ↺ Reset transforms
            </button>
          )}

          {/* Unique override */}
          <div style={{ borderTop:'1px solid rgba(227,195,114,0.1)', paddingTop:10, marginTop:6 }}>
            <div style={{ ...ED.label, marginBottom:6, color:'rgba(227,195,114,0.7)' }}>▼ Mark Instance as Unique</div>
            {!showOverride ? (
              <button style={ED.btn('primary')} onClick={() => setShowOverride(true)}>
                + Create Override
              </button>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                <input type="text" value={overrideId} onChange={e=>setOverrideId(e.target.value)}
                  style={ED.input} placeholder="e.g. hero-main-title" />
                <button style={ED.btn('primary')} onClick={() => {
                  if (!overrideId.trim()) return;
                  markAsUnique(overrideId.trim(), { ...roleData });
                  setShowOverride(false);
                }}>
                  ✦ Mark as Unique
                </button>
                <button style={ED.btn()} onClick={() => setShowOverride(false)}>Cancel</button>
              </div>
            )}
          </div>

          {/* Show existing overrides for this role prefix */}
          {Object.entries(overrides).filter(([id]) => id.startsWith(role)).map(([id, ov]) => (
            <div key={id} style={{ marginTop:6, padding:'6px 8px', background:'rgba(227,195,114,0.05)', borderRadius:2 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ ...ED.label, color:'rgba(227,195,114,0.8)' }}>{id}</span>
                <button style={{ ...ED.btn(), fontSize:'0.40rem', padding:'2px 6px' }}
                  onClick={() => removeOverride(id)}>✕</button>
              </div>
              <pre style={{ ...ED.value, fontSize:'0.40rem', marginTop:4, whiteSpace:'pre-wrap' }}>
                {JSON.stringify(ov, null, 2)}
              </pre>
              {/* Code snippet */}
              <div style={{ marginTop:6, padding:'5px', background:'rgba(0,0,0,0.5)', borderRadius:2, fontFamily:'monospace', fontSize:'0.42rem', color:'rgba(227,195,114,0.7)', whiteSpace:'pre-wrap' }}>
{`style={getTypographyStyle(tokens, '${role}', {
  overrides, overrideId: '${id}'
})}
data-role="${role}"
data-override-id="${id}"`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Typography
// ─────────────────────────────────────────────────────────────────────────────

function TypographyTab({ tokens, overrides, search }: {
  tokens: DesignTokens; overrides: Record<string, Partial<TypographyRole>>; search: string;
}) {
  const { setBodyScale } = useThemeStore();
  const scale = tokens.typography.bodyScaleMultiplier;

  return (
    <div>
      <div style={{ marginBottom:14, padding:'10px', background:'rgba(227,195,114,0.05)', borderRadius:3, border:'1px solid rgba(227,195,114,0.12)' }}>
        <Slider
          label={`Global Body Scale  (${(scale*100).toFixed(0)}% — all sizes scale linearly)`}
          value={scale} min={0.5} max={2.0} step={0.01} digits={2}
          onChange={setBodyScale}
        />
        <div style={{ display:'flex', gap:6, marginTop:6 }}>
          {[0.5,0.75,1.0,1.25,1.5,2.0].map(v=>(
            <button key={v} style={{ ...ED.btn(v===scale?'primary':'ghost'), padding:'3px 7px', fontSize:'0.42rem', flex:1 }}
              onClick={() => setBodyScale(v)}>{v}×</button>
          ))}
        </div>
      </div>

      {TYPOGRAPHY_ROLE_MAP.map(role => (
        <RoleCard key={role} role={role} tokens={tokens} overrides={overrides} search={search} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Colours
// ─────────────────────────────────────────────────────────────────────────────

const COLOUR_GROUPS: { title: string; keys: (keyof DesignTokens['colors'])[] }[] = [
  { title:'Primary (Gold)',   keys:['primary','primaryContainer','primaryFixed','onPrimary','onPrimaryContainer'] },
  { title:'Secondary',       keys:['secondary','secondaryContainer','onSecondary'] },
  { title:'Tertiary',        keys:['tertiary','tertiaryContainer','onTertiary'] },
  { title:'Surface',         keys:['background','surface','surfaceBright','surfaceContainerLow','surfaceContainerHigh','surfaceVariant'] },
  { title:'Text',            keys:['onSurface','onSurfaceVariant','onBackground'] },
  { title:'Status',          keys:['error','errorContainer','success','outline'] },
];

function ColoursTab({ tokens }: { tokens: DesignTokens }) {
  const { updateToken } = useThemeStore();
  const bg = tokens.colors.background;

  return (
    <div>
      {COLOUR_GROUPS.map(group => (
        <div key={group.title} style={{ marginBottom:16 }}>
          <h3 style={ED.sectionTitle}>{group.title}</h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {group.keys.map(key => {
              const val = tokens.colors[key];
              const cr = contrastRatio(val, bg);
              return (
                <div key={key}>
                  <ColourInput
                    label={key}
                    value={val}
                    onChange={v => updateToken(`colors.${key}`, v)}
                  />
                  {cr !== null && (
                    <div style={{ display:'flex', gap:4, marginTop:3, alignItems:'center' }}>
                      <span style={{ ...ED.value, fontSize:'0.40rem' }}>{cr.toFixed(1)}:1</span>
                      <span style={{ fontSize:'0.38rem', fontWeight:700, color:wcagBadge(cr).clr,
                        border:`1px solid ${wcagBadge(cr).clr}`, borderRadius:2, padding:'0 3px' }}>
                        {wcagBadge(cr).label}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Spacing
// ─────────────────────────────────────────────────────────────────────────────

function SpacingTab({ tokens }: { tokens: DesignTokens }) {
  const { updateToken } = useThemeStore();
  const keys = Object.keys(tokens.spacing) as (keyof typeof tokens.spacing)[];

  return (
    <div>
      <h3 style={ED.sectionTitle}>Spacing</h3>
      {keys.map(k => {
        const v = tokens.spacing[k];
        const unit = v.endsWith('px') ? 'px' : 'rem';
        const num = parseFloat(v);
        const isRem = unit === 'rem';
        return (
          <Slider
            key={k} label={k} value={num}
            min={isRem ? 0 : 0} max={isRem ? 4 : 64} step={isRem ? 0.1 : 1}
            unit={unit} digits={isRem ? 1 : 0}
            onChange={nv => updateToken(`spacing.${k}`, `${isRem?nv.toFixed(1):Math.round(nv)}${unit}`)}
          />
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Borders
// ─────────────────────────────────────────────────────────────────────────────

function BordersTab({ tokens }: { tokens: DesignTokens }) {
  const { updateToken } = useThemeStore();
  const radiusKeys: (keyof typeof tokens.borders)[] = ['radiusTiny','radiusSmall','radiusMedium','radiusLarge'];

  return (
    <div>
      <h3 style={ED.sectionTitle}>Border Radius</h3>
      {radiusKeys.map(k => (
        <Slider key={k} label={k} value={parseFloat(tokens.borders[k])} min={0} max={24} step={1} unit="px" digits={0}
          onChange={v => updateToken(`borders.${k}`, `${Math.round(v)}px`)} />
      ))}
      <h3 style={{ ...ED.sectionTitle, marginTop:12 }}>Border Widths</h3>
      <Slider label="Panel border width" value={parseFloat(tokens.borders.panelBorderWidth)} min={0} max={4} step={0.5} unit="px" digits={1}
        onChange={v => updateToken('borders.panelBorderWidth', `${v}px`)} />
      <Slider label="Ghost border width" value={parseFloat(tokens.borders.ghostBorderWidth)} min={0} max={4} step={0.5} unit="px" digits={1}
        onChange={v => updateToken('borders.ghostBorderWidth', `${v}px`)} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Preview
// ─────────────────────────────────────────────────────────────────────────────

function PreviewTab({ tokens, overrides }: { tokens: DesignTokens; overrides: Record<string, Partial<TypographyRole>> }) {
  const SAMPLES: { role: TypographyRoleName; text: string }[] = [
    { role:'hero',          text:'Orokin Empire' },
    { role:'tabTitle',      text:'CELESTIAL PENDULUM' },
    { role:'sectionHeader', text:'WORLD CYCLES' },
    { role:'emphasis',      text:'Next Nightwave in 4h 23m' },
    { role:'body',          text:'The Void is a trans-dimensional plane of existence occupied by the Orokin and their technology.' },
    { role:'labelSmall',    text:'ACTIVE FISSURES' },
    { role:'labelTiny',     text:'SYNDICATE · ARBITERS OF HEXIS' },
  ];

  return (
    <div>
      <h3 style={ED.sectionTitle}>Live Role Preview</h3>
      <div style={{ padding:'12px', background:'rgba(0,0,0,0.5)', borderRadius:3, marginBottom:12,
        border:'1px solid rgba(227,195,114,0.1)' }}>
        {SAMPLES.map(({ role, text }) => (
          <div key={role} style={{ marginBottom:10, paddingBottom:10, borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ ...ED.label, marginBottom:4, color:'rgba(227,195,114,0.35)' }}>{role}</div>
            <div
              style={getTypographyStyle(tokens, role, { overrides })}
              data-role={role}
            >
              {text}
            </div>
          </div>
        ))}
      </div>

      {/* Sample card */}
      <h3 style={ED.sectionTitle}>Sample Card</h3>
      <div style={{ background:'rgba(28,27,27,0.6)', border:'1px solid rgba(227,195,114,0.15)',
        borderRadius:4, overflow:'hidden' }}>
        <div style={{ padding:'7px 14px', borderBottom:'1px solid rgba(227,195,114,0.15)', display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ ...getTypographyStyle(tokens,'sectionHeader'), color:'rgba(227,195,114,0.7)' }} data-role="sectionHeader">
            PANEL HEADER
          </span>
        </div>
        <div style={{ padding:'12px 14px' }}>
          <div style={{ ...getTypographyStyle(tokens,'tabTitle'), color:tokens.colors.primary, marginBottom:8 }} data-role="tabTitle">
            World State Active
          </div>
          <div style={{ ...getTypographyStyle(tokens,'body'), color:tokens.colors.onSurface, marginBottom:10 }} data-role="body">
            Current world cycle data is live. Fissure missions refresh every 5 minutes.
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ ...getTypographyStyle(tokens,'labelSmall'), color:'rgba(198,198,199,0.45)' }} data-role="labelSmall">EARTH · CETUS</span>
            <span style={{ ...getTypographyStyle(tokens,'emphasis'), color:tokens.colors.primary }} data-role="emphasis">Day — 2h 14m</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', padding:'4px 0' }}>
            <span style={{ ...getTypographyStyle(tokens,'labelTiny'), color:'rgba(198,198,199,0.35)' }} data-role="labelTiny">UPDATED 30S AGO</span>
            <span style={{ ...getTypographyStyle(tokens,'labelTiny'), color:'rgba(227,195,114,0.4)' }} data-role="labelTiny">LIVE</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Audit
// ─────────────────────────────────────────────────────────────────────────────

function AuditTab({ tokens, editorRef }: { tokens: DesignTokens; editorRef: React.RefObject<HTMLDivElement | null> }) {
  const [results, setResults] = useState<AuditItem[]>([]);
  const [ran, setRan] = useState(false);
  const bg = tokens.colors.background;

  const run = () => {
    setResults(runAudit(editorRef.current));
    setRan(true);
  };

  return (
    <div>
      <h3 style={ED.sectionTitle}>Token Audit</h3>
      <p style={{ ...ED.label, color:'rgba(227,195,114,0.45)', marginBottom:8, lineHeight:1.5 }}>
        Scans the live DOM for text elements missing a data-role attribute.
      </p>
      <button style={{ ...ED.btn('primary'), marginBottom:12 }} onClick={run}>▶ Run Audit</button>

      {ran && results.length === 0 && (
        <div style={{ padding:'10px', background:'rgba(74,222,128,0.08)', border:'1px solid rgba(74,222,128,0.3)', borderRadius:3 }}>
          <span style={{ ...ED.label, color:'#4ade80' }}>✓ All visible text elements have semantic roles.</span>
        </div>
      )}

      {results.map((item, i) => (
        <div key={i} style={{ marginBottom:8, padding:'8px', background:'rgba(248,113,113,0.05)',
          border:'1px solid rgba(248,113,113,0.2)', borderRadius:3 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
            <span style={{ ...ED.value, fontSize:'0.42rem', color:'rgba(198,198,199,0.6)', flex:1, marginRight:8 }}>{item.path}</span>
            <span style={{ ...ED.label, color:'#fbbf24', whiteSpace:'nowrap' }}>→ {item.suggestedRole}</span>
          </div>
          <div style={{ ...ED.value, fontSize:'0.45rem', color:'rgba(198,198,199,0.5)', marginBottom:4 }}>
            "{item.text}"
          </div>
          <div style={{ ...ED.label, color:'rgba(227,195,114,0.3)', marginBottom:6 }}>
            computed: {item.fontSize}
          </div>
          <div style={{ fontFamily:'monospace', fontSize:'0.40rem', color:'rgba(227,195,114,0.6)',
            background:'rgba(0,0,0,0.5)', padding:'4px 6px', borderRadius:2 }}>
            {`data-role="${item.suggestedRole}"`}
          </div>
        </div>
      ))}

      <div style={{ marginTop:16, borderTop:'1px solid rgba(227,195,114,0.1)', paddingTop:12 }}>
        <h3 style={ED.sectionTitle}>Contrast Checker — All Roles</h3>
        {TYPOGRAPHY_ROLE_MAP.map(role => {
          const roleData = tokens.typography.roles[role];
          const textColor = roleData.color ?? tokens.colors.primary;
          const cr = contrastRatio(textColor, bg);
          return (
            <div key={role} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6,
              padding:'5px 8px', background:'rgba(0,0,0,0.3)', borderRadius:2 }}>
              <span style={{ ...ED.label, flex:1 }}>{ROLE_LABELS[role]}</span>
              {cr !== null ? (
                <>
                  <span style={ED.value}>{cr.toFixed(2)}:1</span>
                  <span style={{ fontSize:'0.42rem', fontWeight:700, color:wcagBadge(cr).clr,
                    border:`1px solid ${wcagBadge(cr).clr}`, borderRadius:2, padding:'1px 5px' }}>
                    {wcagBadge(cr).label}
                  </span>
                </>
              ) : (
                <span style={{ ...ED.label, color:'rgba(248,113,113,0.6)' }}>Non-hex</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Card Inspector (shown when card edit mode is active)
// ─────────────────────────────────────────────────────────────────────────────

interface SelectedCard {
  el: HTMLElement;
  cardId: string;
}

function CardInspectorSection({ selected, tokens }: {
  selected: SelectedCard | null;
  tokens: DesignTokens;
}) {
  const { updateCardOverride, cardOverrides } = useThemeStore();

  if (!selected) {
    return (
      <div style={{ padding:'12px', background:'rgba(227,195,114,0.03)',
        border:'1px dashed rgba(227,195,114,0.2)', borderRadius:3, textAlign:'center' }}>
        <span style={ED.label}>Click any card in the app to inspect it</span>
      </div>
    );
  }

  const id = selected.cardId || '__unnamed__';
  const ov = cardOverrides[id] ?? { translateX:0, translateY:0, scaleX:1, scaleY:1, rotate:0, bodyScale:1 };

  const apply = (patch: Partial<CardOverride>) => {
    updateCardOverride(id, patch);
    const next = { ...ov, ...patch };
    selected.el.style.transform = `translate(${next.translateX}px,${next.translateY}px) scale(${next.scaleX},${next.scaleY}) rotate(${next.rotate}deg)`;
    selected.el.style.fontSize = next.bodyScale === 1 ? '' : `${next.bodyScale}em`;
  };

  // Scan for text children with data-role
  const textEls: Array<{ role:string; text:string }> = [];
  selected.el.querySelectorAll('[data-role]').forEach(el => {
    const role = el.getAttribute('data-role') ?? '';
    const text = (el.textContent ?? '').slice(0, 40);
    if (text.trim()) textEls.push({ role, text });
  });

  return (
    <div style={{ borderTop:'1px solid rgba(227,195,114,0.15)', paddingTop:10, marginTop:10 }}>
      <h3 style={{ ...ED.sectionTitle, color:'rgba(227,195,114,0.9)' }}>
        ✦ Card Inspector {id !== '__unnamed__' ? `— ${id}` : '(no data-card-id)'}
      </h3>

      {/* Body scale (zoom-like) */}
      <Slider
        label="Body Scale (zoom — scales all content linearly)"
        value={ov.bodyScale} min={0.5} max={2.0} step={0.02} digits={2}
        onChange={v => apply({ bodyScale:v })}
      />

      {/* 4-axis transforms */}
      <div style={{ ...ED.sectionTitle, fontSize:'0.46rem', marginBottom:8 }}>4-Axis Position</div>
      <Slider label="Translate X" value={ov.translateX} min={-200} max={200} step={1} unit="px" digits={0}
        onChange={v => apply({ translateX:v })} />
      <Slider label="Translate Y" value={ov.translateY} min={-200} max={200} step={1} unit="px" digits={0}
        onChange={v => apply({ translateY:v })} />
      <Slider label="Scale X" value={ov.scaleX} min={0.1} max={3.0} step={0.01} digits={2}
        onChange={v => apply({ scaleX:v })} />
      <Slider label="Scale Y" value={ov.scaleY} min={0.1} max={3.0} step={0.01} digits={2}
        onChange={v => apply({ scaleY:v })} />
      <Slider label="Rotate" value={ov.rotate} min={-180} max={180} step={1} unit="°" digits={0}
        onChange={v => apply({ rotate:v })} />

      {/* Card content list */}
      {textEls.length > 0 && (
        <>
          <div style={{ ...ED.sectionTitle, fontSize:'0.46rem', marginTop:10 }}>Card Content ({textEls.length} elements)</div>
          {textEls.map((el, i) => (
            <div key={i} style={{ display:'flex', gap:6, alignItems:'center', marginBottom:4,
              padding:'4px 6px', background:'rgba(0,0,0,0.3)', borderRadius:2 }}>
              <span style={{ ...ED.label, color:'rgba(227,195,114,0.6)', minWidth:80 }}>{el.role}</span>
              <span style={{ ...getTypographyStyle(tokens, el.role as TypographyRoleName), color:tokens.colors.onSurface }}>
                {el.text}
              </span>
            </div>
          ))}
        </>
      )}

      {id === '__unnamed__' && (
        <div style={{ marginTop:8, padding:'6px 8px', background:'rgba(251,191,36,0.08)',
          border:'1px solid rgba(251,191,36,0.25)', borderRadius:2 }}>
          <span style={{ ...ED.label, color:'#fbbf24' }}>
            Add data-card-id="..." to this element to persist card overrides.
          </span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main ThemeEditor
// ─────────────────────────────────────────────────────────────────────────────

type TabId = 'typography' | 'colors' | 'spacing' | 'borders' | 'preview' | 'audit';
const TABS: { id: TabId; label: string }[] = [
  { id:'typography', label:'Type' },
  { id:'colors',     label:'Colors' },
  { id:'spacing',    label:'Space' },
  { id:'borders',    label:'Borders' },
  { id:'preview',    label:'Preview' },
  { id:'audit',      label:'Audit' },
];

export function ThemeEditor() {
  if (!import.meta.env.DEV) return null;

  const {
    tokens, overrides, past, future, modes, activeMode,
    cardEditModeEnabled, selectedCardId,
    undo, redo, resetTokens, setActiveMode, exportJSON, importJSON,
    toggleCardEditMode, setSelectedCardId,
  } = useThemeStore();

  const [open,          setOpen]          = useState(false);
  const [tab,           setTab]           = useState<TabId>('typography');
  const [search,        setSearch]        = useState('');
  const [copied,        setCopied]        = useState(false);
  const [importText,    setImportText]    = useState('');
  const [showImport,    setShowImport]    = useState(false);
  const [selectedCard,  setSelectedCard]  = useState<SelectedCard | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);

  // ── Keyboard shortcuts ───────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  // ── Search highlight injection ────────────────────────────────────────
  useEffect(() => {
    let styleEl: HTMLStyleElement | null = null;
    if (search) {
      styleEl = document.createElement('style');
      styleEl.id = '__te-search-hl';
      // highlight matching data-role elements
      styleEl.textContent = TYPOGRAPHY_ROLE_MAP
        .filter(r => r.toLowerCase().includes(search.toLowerCase()))
        .map(r => `[data-role="${r}"] { outline: 2px solid rgba(227,195,114,0.7) !important; outline-offset: 1px; }`)
        .join('\n');
      document.head.appendChild(styleEl);
    }
    return () => { if (styleEl) document.head.removeChild(styleEl); };
  }, [search]);

  // ── Card edit mode ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!cardEditModeEnabled) {
      // clean up
      document.querySelectorAll('[data-te-hover],[data-te-selected]').forEach(el => {
        el.removeAttribute('data-te-hover');
        el.removeAttribute('data-te-selected');
      });
      return;
    }

    let styleEl: HTMLStyleElement | null = document.createElement('style');
    styleEl.id = '__te-card-edit';
    styleEl.textContent = `
      [data-te-hover] { outline: 2px dashed rgba(227,195,114,0.5) !important; cursor: crosshair !important; }
      [data-te-selected] { outline: 2px solid rgba(227,195,114,1) !important; }
    `;
    document.head.appendChild(styleEl);

    const onOver = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (editorRef.current?.contains(t)) return;
      const card = t.closest('[data-card-id],[class*="panel"],[class*="Panel"],[class*="card"],[class*="Card"]') as HTMLElement | null;
      document.querySelectorAll('[data-te-hover]').forEach(el => el.removeAttribute('data-te-hover'));
      if (card) card.setAttribute('data-te-hover', '');
    };

    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (editorRef.current?.contains(t)) return;
      e.preventDefault(); e.stopPropagation();
      const card = t.closest('[data-card-id],[class*="panel"],[class*="Panel"],[class*="card"],[class*="Card"]') as HTMLElement | null;
      document.querySelectorAll('[data-te-selected]').forEach(el => el.removeAttribute('data-te-selected'));
      if (card) {
        card.setAttribute('data-te-selected', '');
        const id = card.getAttribute('data-card-id') ?? '';
        setSelectedCard({ el: card, cardId: id });
        setSelectedCardId(id || null);
      }
    };

    document.addEventListener('mouseover', onOver);
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('mouseover', onOver);
      document.removeEventListener('click', onClick, true);
      if (styleEl) document.head.removeChild(styleEl);
      styleEl = null;
      document.querySelectorAll('[data-te-hover],[data-te-selected]').forEach(el => {
        el.removeAttribute('data-te-hover');
        el.removeAttribute('data-te-selected');
      });
    };
  }, [cardEditModeEnabled, setSelectedCardId]);

  // Sync selectedCard when cardEditMode toggled off
  useEffect(() => {
    if (!cardEditModeEnabled) setSelectedCard(null);
  }, [cardEditModeEnabled]);

  const handleExport = () => {
    navigator.clipboard.writeText(exportJSON()).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleImport = () => {
    importJSON(importText);
    setImportText(''); setShowImport(false);
  };

  // ── Collapsed button ──────────────────────────────────────────────────
  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        title="Open Theme Editor (dev only)"
        style={{
          position:'fixed', bottom:20, right:20, width:50, height:50,
          borderRadius:'50%', background:'linear-gradient(135deg,#e3c372 0%,#c1a355 100%)',
          border:'2px solid rgba(227,195,114,0.6)', color:'#1a1a1a', fontSize:'1.2rem',
          cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:'0 0 20px rgba(227,195,114,0.4)', zIndex:9999, fontWeight:'bold',
        }}>
        ✦
      </button>
    );
  }

  // ── Expanded editor ───────────────────────────────────────────────────
  return (
    <div
      ref={editorRef}
      data-theme-editor=""
      style={{
        ...ED.panel,
        position: 'fixed', bottom: 20, right: 20,
        width: 440, maxHeight: '92vh',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        zIndex: 9999,
        boxShadow: '0 8px 40px rgba(0,0,0,0.8), inset 0 0 30px rgba(0,0,0,0.4)',
      }}
    >
      {/* ── Header ── */}
      <div style={{ padding:'10px 14px', borderBottom:'1px solid rgba(227,195,114,0.15)',
        display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:'0.70rem', fontWeight:700, letterSpacing:'0.22em',
            color:'#e3c372', textTransform:'uppercase' }}>✦ Theme Editor</span>
          <select value={activeMode} onChange={e => setActiveMode(e.target.value)}
            style={{ ...ED.select, width:'auto', fontSize:'0.46rem', padding:'2px 5px' }}>
            {Object.keys(modes).map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          {/* Undo/Redo */}
          <button title="Undo (Ctrl+Z)" disabled={past.length===0}
            style={{ ...ED.btn(), padding:'3px 7px', opacity:past.length?1:0.3 }} onClick={undo}>↩</button>
          <button title="Redo (Ctrl+Shift+Z)" disabled={future.length===0}
            style={{ ...ED.btn(), padding:'3px 7px', opacity:future.length?1:0.3 }} onClick={redo}>↪</button>
          {/* Card edit mode */}
          <button title="Card Edit Mode"
            style={{ ...ED.btn(cardEditModeEnabled?'primary':'ghost'), padding:'3px 7px' }}
            onClick={toggleCardEditMode}>
            {cardEditModeEnabled ? '◉ Card' : '◎ Card'}
          </button>
          <button onClick={() => setOpen(false)}
            style={{ background:'none', border:'none', color:'rgba(227,195,114,0.5)',
              fontSize:'1rem', cursor:'pointer', padding:'0 2px', lineHeight:1 }}>✕</button>
        </div>
      </div>

      {/* ── Search bar ── */}
      <div style={{ padding:'6px 14px', borderBottom:'1px solid rgba(227,195,114,0.08)', flexShrink:0 }}>
        <input
          type="text" value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search roles, tokens… (highlights in app)"
          style={{ ...ED.input, fontSize:'0.50rem' }}
        />
      </div>

      {/* ── Tab nav ── */}
      <div style={{ display:'flex', borderBottom:'1px solid rgba(227,195,114,0.12)', flexShrink:0 }}>
        {TABS.map(t => (
          <button key={t.id} style={ED.tab(tab===t.id)} onClick={() => setTab(t.id as TabId)}>{t.label}</button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div style={{ flex:1, overflowY:'auto', padding:'12px 14px' }}>
        {tab==='typography' && (
          <TypographyTab tokens={tokens} overrides={overrides} search={search} />
        )}
        {tab==='colors' && <ColoursTab tokens={tokens} />}
        {tab==='spacing' && <SpacingTab tokens={tokens} />}
        {tab==='borders' && <BordersTab tokens={tokens} />}
        {tab==='preview' && <PreviewTab tokens={tokens} overrides={overrides} />}
        {tab==='audit'   && <AuditTab tokens={tokens} editorRef={editorRef} />}

        {/* Card inspector — always visible when card edit mode is on */}
        {cardEditModeEnabled && (
          <CardInspectorSection selected={selectedCard} tokens={tokens} />
        )}
      </div>

      {/* ── Footer actions ── */}
      <div style={{ padding:'8px 14px', borderTop:'1px solid rgba(227,195,114,0.12)',
        display:'flex', gap:6, flexShrink:0, flexWrap:'wrap' }}>
        <button style={ED.btn('primary')} onClick={handleExport}>
          {copied ? '✓ Copied' : '⬇ Export JSON + CSS'}
        </button>
        <button style={ED.btn()} onClick={() => setShowImport(v=>!v)}>⬆ Import</button>
        <button style={ED.btn()} onClick={resetTokens}>↺ Reset</button>
        <div style={{ ...ED.label, color:'rgba(227,195,114,0.3)', alignSelf:'center', marginLeft:'auto', fontSize:'0.40rem' }}>
          {past.length} undo · {future.length} redo
        </div>
      </div>

      {/* Import textarea */}
      {showImport && (
        <div style={{ padding:'8px 14px', borderTop:'1px solid rgba(227,195,114,0.1)', flexShrink:0 }}>
          <textarea
            value={importText} onChange={e=>setImportText(e.target.value)}
            placeholder="Paste exported JSON here…"
            style={{ ...ED.input, height:80, resize:'vertical', fontFamily:'monospace', fontSize:'0.42rem' }}
          />
          <div style={{ display:'flex', gap:6, marginTop:6 }}>
            <button style={ED.btn('primary')} onClick={handleImport}>Apply</button>
            <button style={ED.btn()} onClick={() => { setShowImport(false); setImportText(''); }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
