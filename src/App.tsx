// App.tsx — Root component.
// Migration is in progress — vanilla JS logic lives in src/js/ for reference.
// Build out React components here and import them as the migration proceeds.

function App() {
  return (
    <div className="app">
      <div className="header">
        <div className="header-left">
          <h1>Tennoplan</h1>
          <div className="subtitle">Warframe endgame tracker · All progress saved locally.</div>
        </div>
      </div>
      <p style={{ padding: '2rem', color: 'var(--text-dim)' }}>
        React scaffold ready. Start building components here.
      </p>
    </div>
  );
}

export default App;
