import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { CycleCard } from './components/CycleCard';
import { useWorldState } from '../hooks/useWorldState';
import type { CycleType, CycleData } from '../hooks/useWorldState';

const MOCK_CYCLES: CycleData[] = [
  { type: 'cetus',   phase: 'Day',   secondsRemaining: 3142, progressPercent: 48, source: 'predictive' },
  { type: 'vallis',  phase: 'Warm',  secondsRemaining: 210,  progressPercent: 75, source: 'predictive' },
  { type: 'earth',   phase: 'Night', secondsRemaining: 7200, progressPercent: 10, source: 'predictive' },
  { type: 'zariman', phase: 'Light', secondsRemaining: 1800, progressPercent: 50, source: 'predictive' },
];

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [useMock, setUseMock] = useState(false);
  const { cycles, source } = useWorldState();

  const activeCycles = useMock ? MOCK_CYCLES : cycles;
  const apiStatus = useMock ? 'mock' : source === 'api' ? 'live' : 'partial';

  function getCycle(type: CycleType) {
    return activeCycles.find(c => c.type === type);
  }

  return (
    <div className="shell">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="shell-main">
        <TopHeader apiStatus={apiStatus} />

        <div className="content-scroll">
          <main className="bento-grid">
            <div className="glass-panel panel--wide">
              <div className="panel-label">Weekly Tasks</div>
              <p className="panel-placeholder">Dashboard content coming soon…</p>
            </div>

            <div className="glass-panel">
              <div className="panel-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                World Cycles
                <button
                  onClick={() => setUseMock(m => !m)}
                  style={{ fontSize: '0.7rem', padding: '2px 8px', opacity: 0.6, cursor: 'pointer' }}
                >
                  {useMock ? 'Mock ON' : 'Mock OFF'}
                </button>
              </div>
              <div className="cycles-grid">
                <CycleCard cycle={getCycle('cetus')} />
                <CycleCard cycle={getCycle('vallis')} />
                <CycleCard cycle={getCycle('earth')} />
                <CycleCard cycle={getCycle('zariman')} />
              </div>
            </div>

            <div className="glass-panel">
              <div className="panel-label">Void Fissures</div>
              <p className="panel-placeholder">Live fissure list here</p>
            </div>

            <div className="glass-panel">
              <div className="panel-label">Nightwave</div>
              <p className="panel-placeholder">Act checklist here</p>
            </div>

            <div className="glass-panel">
              <div className="panel-label">Baro Ki'Teer</div>
              <p className="panel-placeholder">Trader status &amp; inventory</p>
            </div>

            <div className="glass-panel">
              <div className="panel-label">Steel Path</div>
              <p className="panel-placeholder">Weekly honors here</p>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;
