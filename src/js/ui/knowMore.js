// js/ui/knowMore.js — Shared expand panel builder for the Know More system.
// Imported by fissures.js, nightwave.js, cycles.js.
// All functions are pure — they take data and return DOM elements or HTML strings.

import { getMissionType, getFissureTier, getFaction, getCycleState, getNightwaveActType } from '../wikiContent.js';

// ── Speed rating dots (1–5) ───────────────────────────────────────────────────
function speedDotsHTML(rating, label) {
  if (!rating) return '';
  const dots = Array.from({ length: 5 }, (_, i) =>
    `<span class="km-speed-dot${i < rating ? ' active' : ''}"></span>`
  ).join('');
  return `<div class="km-speed"><span class="km-speed-label">${label || ''}</span>${dots}</div>`;
}

// ── Frame pills ───────────────────────────────────────────────────────────────
function framePillsHTML(frames, isLive = false) {
  if (!frames || !frames.length) return '';
  return frames.map(f =>
    `<span class="km-frame-pill${isLive ? ' km-live' : ''}">${f}</span>`
  ).join('');
}

// ── Weakness pills ────────────────────────────────────────────────────────────
function weaknessPillsHTML(weaknesses) {
  if (!weaknesses || !weaknesses.length) return '';
  return weaknesses.map(w => `<span class="km-weakness-pill">${w}</span>`).join('');
}

// ── Activity pills ────────────────────────────────────────────────────────────
function activityPillsHTML(activities) {
  if (!activities || !activities.length) return '';
  return activities.map(a => `<span class="km-activity-pill">${a}</span>`).join('');
}

// ── Tips list ─────────────────────────────────────────────────────────────────
function tipsHTML(tips) {
  if (!tips || !tips.length) return '';
  return `<ul class="km-tips">${tips.map(t => `<li>${t}</li>`).join('')}</ul>`;
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function section(label, content) {
  if (!content) return '';
  return `<div class="km-section"><div class="km-section-label">${label}</div>${content}</div>`;
}

// ── Build expand panel HTML for a fissure row ─────────────────────────────────
// missionType: string from API e.g. 'Capture'
// faction: string from API e.g. 'Grineer'
// tierName: string e.g. 'Lith'
// isLiveFrame: optional string[] from arbitration buff override
export function buildFissurePanel(missionType, faction, tierName, liveFrames = null) {
  const mt  = getMissionType(missionType);
  const fac = getFaction(faction);
  const ft  = getFissureTier(tierName);

  let html = '';

  // Summary
  if (mt?.summary) {
    html += `<div class="km-panel-summary">${mt.summary}</div>`;
  }

  // Speed rating
  if (mt?.speedRating) {
    html += section('Speed', speedDotsHTML(mt.speedRating, mt.speed));
  }

  // Recommended frames
  const rf = mt?.recommendedFrames;
  if (rf) {
    const frames = (liveFrames && liveFrames.length) ? liveFrames : (rf.general || []);
    const isLive = !!(liveFrames && liveFrames.length);
    const liveTag = isLive ? '<span class="km-live-badge">LIVE</span>' : '';
    html += section(
      `Recommended Frames${liveTag}`,
      `<div class="km-frames">${framePillsHTML(frames, isLive)}</div>`
      + (rf.reason ? `<div style="font-size:11px;color:var(--text-hint);margin-top:5px">${rf.reason}</div>` : '')
    );
  }

  // Faction
  if (fac) {
    html += section('Enemy Faction — ' + faction,
      `<div style="font-size:11.5px;color:var(--text-dim);margin-bottom:6px">${fac.summary}</div>`
      + (fac.weaknesses?.length ? `<div class="km-weaknesses">${weaknessPillsHTML(fac.weaknesses)}</div>` : '')
    );
  }

  // Fissure tier
  if (ft) {
    html += section('Relic Tier — ' + tierName,
      `<div style="font-size:11.5px;color:var(--text-dim);margin-bottom:6px">${ft.summary}</div>`
    );
  }

  // Tips
  if (mt?.tips?.length) {
    html += section('Tips', tipsHTML(mt.tips.slice(0, 3)));
  }

  return html || '<div style="color:var(--text-hint);font-size:11px">No additional info available.</div>';
}

// ── Build expand panel HTML for a nightwave act ───────────────────────────────
// actType: 'daily' | 'weekly' | 'weekly elite'
// actTitle: string — used to derive contextual tip if possible
export function buildNightwavePanel(actType, actTitle) {
  const at = getNightwaveActType(actType);

  let html = '';

  if (at?.summary) {
    html += `<div class="km-panel-summary">${at.summary}</div>`;
  }

  if (at?.standingRange) {
    html += section('Standing', `<div style="font-size:12px;color:var(--text)">${at.standingRange} standing</div>`);
  }

  if (at?.tips?.length) {
    html += section('Tips', tipsHTML(at.tips));
  }

  return html || '<div style="color:var(--text-hint);font-size:11px">No additional info available.</div>';
}

// ── Build expand panel HTML for a world cycle card ────────────────────────────
// location: 'cetus' | 'vallis' | 'cambion'
// currentState: 'day' | 'night' | 'warm' | 'cold' | 'fass' | 'vome'
export function buildCyclePanel(location, currentState) {
  const cs = getCycleState(location, currentState);
  if (!cs) return '<div style="color:var(--text-hint);font-size:11px">No additional info available.</div>';

  let html = '';

  if (cs.summary) {
    html += `<div class="km-panel-summary">${cs.summary}</div>`;
  }

  if (cs.activities?.length) {
    html += section('Active Now', `<div class="km-activities">${activityPillsHTML(cs.activities)}</div>`);
  }

  if (cs.notAvailable?.length) {
    html += section('Not Available', `<div style="font-size:11px;color:var(--text-hint)">${cs.notAvailable.join(' · ')}</div>`);
  }

  if (cs.recommendedFrames?.general?.length) {
    const rf = cs.recommendedFrames;
    html += section('Recommended Frames',
      `<div class="km-frames">${framePillsHTML(rf.general)}</div>`
      + (rf.reason ? `<div style="font-size:11px;color:var(--text-hint);margin-top:5px">${rf.reason}</div>` : '')
    );
  }

  if (cs.tips?.length) {
    html += section('Tips', tipsHTML(cs.tips.slice(0, 3)));
  }

  return html;
}

// ── Attach expand behaviour to any element ────────────────────────────────────
// Wraps the panel HTML in the km-collapsible structure and attaches click toggle.
// el: the element that gets clicked (the row or card header)
// panelHTML: string — the inner content
// containerEl: optional — if provided, panel appends here instead of after el
// Returns the collapsible wrapper div.
export function attachExpand(el, panelHTML, containerEl) {
  const wrapper = document.createElement('div');
  wrapper.className = 'km-collapsible';

  const inner = document.createElement('div');
  inner.className = 'km-inner';

  const panel = document.createElement('div');
  panel.className = 'km-panel';
  panel.innerHTML = panelHTML;
  panel.addEventListener('click', e => e.stopPropagation());

  inner.appendChild(panel);
  wrapper.appendChild(inner);

  const target = containerEl || el;
  target.after(wrapper);

  let open = false;
  el.addEventListener('click', e => {
    // Don't toggle if user clicked a link or button inside the row
    if (e.target.closest('a, button')) return;
    open = !open;
    wrapper.classList.toggle('km-open', open);
    // Update toggle button text if one exists inside el
    const btn = el.querySelector('.km-toggle-btn');
    if (btn) btn.textContent = open ? 'Less ↑' : 'Know more ↓';
  });

  return wrapper;
}
