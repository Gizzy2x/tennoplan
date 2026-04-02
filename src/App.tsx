import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="shell">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="shell-main">
        <TopHeader apiStatus="loading" />

        <div className="content-scroll">
          <main className="bento-grid">
            {/* Placeholder panels — populate with real components as migration proceeds */}
            <div className="glass-panel panel--wide">
              <div className="panel-label">Weekly Tasks</div>
              <p className="panel-placeholder">Dashboard content coming soon…</p>
            </div>

            <div className="glass-panel">
              <div className="panel-label">World Cycles</div>
              <p className="panel-placeholder">Cetus · Vallis · Cambion · Zariman</p>
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
