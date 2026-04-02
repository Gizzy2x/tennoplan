import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { CycleCard } from './components/CycleCard';
import { useWorldState } from '../hooks/useWorldState';
import type { CycleType } from '../hooks/useWorldState';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { cycles, source } = useWorldState();

  const apiStatus = source === 'api' ? 'live' : 'partial';

  function getCycle(type: CycleType) {
    return cycles.find(c => c.type === type);
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
              <div className="panel-label">World Cycles</div>
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
