import React, { useState, useEffect, useMemo } from 'react';
import './index.css';

const API_BASE = process.env.REACT_APP_BACKEND_URL || '';

// Helper functions
function formatNumber(num, decimals = 2) {
  if (num === null || num === undefined || !Number.isFinite(num)) return "-";
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

function normalizeSignal(signal) {
  if (signal === null || signal === undefined) return 0;
  if (typeof signal === 'boolean') return signal ? 1 : 0;
  if (typeof signal === 'number' && Number.isFinite(signal)) return signal;
  return 0;
}

// Hooks
function useApi(endpoint, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    if (!endpoint) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    if (options.refetchInterval && endpoint) {
      const interval = setInterval(fetchData, options.refetchInterval);
      return () => clearInterval(interval);
    }
  }, [endpoint]);

  return { data, loading, error, refetch: fetchData };
}

// Components
function SignalBadge({ signal }) {
  const normalized = normalizeSignal(signal);
  if (normalized === 1 || normalized > 0) {
    return <span className="px-2 py-0.5 text-xs font-mono rounded bg-green-500/10 text-green-400 border border-green-500/20">LONG</span>;
  }
  if (normalized === -1 || normalized < 0) {
    return <span className="px-2 py-0.5 text-xs font-mono rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">SHORT</span>;
  }
  return <span className="px-2 py-0.5 text-xs font-mono rounded bg-gray-500/10 text-gray-400 border border-gray-500/20">FLAT</span>;
}

function StatusIndicator({ isOnline }) {
  return (
    <div data-testid="engine-status" className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono border ${
      isOnline 
        ? 'bg-green-400/10 text-green-400 border-green-400/20' 
        : 'bg-red-500/10 text-red-400 border-red-500/20'
    }`}>
      <div className={`w-1.5 h-1.5 rounded-full animate-pulse-slow ${isOnline ? 'bg-green-400' : 'bg-red-400'}`}></div>
      {isOnline ? 'ONLINE' : 'OFFLINE'}
    </div>
  );
}

function StatCard({ title, value, subtitle, loading }) {
  return (
    <div className="terminal-panel p-4">
      <div className="text-xs font-mono text-muted-foreground mb-1">{title}</div>
      <div className="text-3xl font-mono font-bold text-foreground">
        {loading ? '-' : value}
      </div>
      {subtitle && <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>}
    </div>
  );
}

function SignalsTable({ signals = [], loading, showScore = false }) {
  if (loading) {
    return (
      <div className="terminal-panel p-6">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-white/5 animate-pulse rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!signals || signals.length === 0) {
    return (
      <div className="terminal-panel p-12 text-center border-dashed">
        <div className="text-muted-foreground font-mono mb-2">NO_DATA_FOUND</div>
        <p className="text-sm text-muted-foreground/60">Click RUN_ENGINE to generate signals</p>
      </div>
    );
  }

  return (
    <div className="terminal-panel overflow-x-auto">
      <table className="w-full text-sm text-left whitespace-nowrap">
        <thead className="text-xs text-muted-foreground font-mono uppercase bg-black/40 border-b border-border/50">
          <tr>
            <th className="px-4 py-3">Symbol</th>
            <th className="px-4 py-3">Strategy</th>
            {showScore && <th className="px-4 py-3 text-right">Score</th>}
            <th className="px-4 py-3 text-right">Signal</th>
            <th className="px-4 py-3 text-right">Close</th>
            <th className="px-4 py-3 text-right">RSI</th>
            <th className="px-4 py-3 text-right">ADX</th>
            <th className="px-4 py-3 text-right">ATR</th>
          </tr>
        </thead>
        <tbody className="font-mono divide-y divide-border/20">
          {signals.map((sig, idx) => (
            <tr key={`${sig.tradingsymbol}-${idx}`} className="data-table-row">
              <td className="px-4 py-3 font-bold text-foreground">{sig.tradingsymbol || '-'}</td>
              <td className="px-4 py-3 text-muted-foreground text-xs">{sig.strategy || '-'}</td>
              {showScore && (
                <td className="px-4 py-3 text-right">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    (sig.score || 0) > 70 ? 'bg-green-500/20 text-green-400' :
                    (sig.score || 0) > 40 ? 'bg-amber-500/20 text-amber-400' :
                    'bg-white/5 text-muted-foreground'
                  }`}>
                    {formatNumber(sig.score, 1)}
                  </span>
                </td>
              )}
              <td className="px-4 py-3 text-right"><SignalBadge signal={sig.signal} /></td>
              <td className="px-4 py-3 text-right font-number">{formatNumber(sig.close)}</td>
              <td className="px-4 py-3 text-right font-number text-muted-foreground">{formatNumber(sig.rsi)}</td>
              <td className="px-4 py-3 text-right font-number text-muted-foreground">{formatNumber(sig.adx)}</td>
              <td className="px-4 py-3 text-right font-number text-muted-foreground">{formatNumber(sig.atr)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Sidebar({ activePage, setActivePage, onRunEngine, isRunning }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '▣' },
    { id: 'signals', label: 'Live Signals', icon: '◎' },
    { id: 'ranked', label: 'Ranked', icon: '↑' },
    { id: 'scanner', label: 'Scanner', icon: '⊕' },
    { id: 'charts', label: 'Charts', icon: '📈' },
    { id: 'universe', label: 'Universe', icon: '☰' },
    { id: 'debug', label: 'Debug Tool', icon: '⚙' },
    { id: 'settings', label: 'Settings', icon: '⚡' },
  ];

  return (
    <aside data-testid="sidebar" className="w-64 flex-shrink-0 border-r border-border/40 bg-card/30 flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-border/40">
        <div className="flex items-center gap-2 text-primary font-mono font-bold text-lg">
          <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center border border-primary/50">⚡</div>
          PRA<span className="text-foreground">-GATI</span>
        </div>
      </div>
      
      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
        <div className="text-xs font-mono text-muted-foreground mb-4 px-2">SYSTEM_NAV</div>
        {navItems.map(item => (
          <button
            key={item.id}
            data-testid={`nav-${item.id}`}
            onClick={() => setActivePage(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${
              activePage === item.id 
                ? 'bg-primary/10 text-primary' 
                : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
            {activePage === item.id && <span className="ml-auto opacity-50">›</span>}
          </button>
        ))}
      </nav>
      
      <div className="p-4 border-t border-border/40">
        <button 
          data-testid="run-engine-btn"
          onClick={onRunEngine}
          disabled={isRunning}
          className="w-full py-2 px-4 rounded bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 font-mono text-sm transition-all disabled:opacity-50"
        >
          {isRunning ? 'EXECUTING...' : 'RUN_ENGINE()'}
        </button>
      </div>
    </aside>
  );
}

// Pages
function DashboardPage({ health, signals, rankedSignals, universe, onRunEngine, isRunning }) {
  const activeSignals = (signals || []).filter(s => normalizeSignal(s.signal) !== 0).length;
  const topScore = rankedSignals?.length > 0 ? (rankedSignals[0]?.score || 0) : 0;
  const currentTime = new Date().toISOString().split('T')[1]?.substring(0, 8) || '--:--:--';
  const isHealthy = health?.status === 'ok';

  return (
    <div data-testid="dashboard-page" className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">System Overview</h2>
          <p className="mt-1 font-mono text-sm text-muted-foreground">Real-time quantitative analysis engine</p>
        </div>
        <button 
          data-testid="trigger-scan-btn"
          onClick={onRunEngine}
          disabled={isRunning}
          className="px-4 py-2 rounded bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-mono text-xs"
        >
          {isRunning ? 'COMPUTING...' : 'TRIGGER_SCAN'}
        </button>
      </div>

      {!isHealthy && (
        <div data-testid="health-warning" className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-400">
          <span>⚠</span>
          <div>
            <h3 className="text-sm font-bold">Engine Offline or Degraded</h3>
            <p className="mt-1 text-sm opacity-80">The Python backend is not responding normally.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Monitored Universe" value={universe?.length || 0} subtitle="Total tradable symbols" />
        <StatCard title="Active Signals" value={activeSignals} subtitle="Non-zero signals" />
        <StatCard title="Ranked Opportunities" value={rankedSignals?.length || 0} subtitle="Scored via ensemble" />
        <StatCard title="Max Confidence" value={formatNumber(topScore, 1)} subtitle="Strongest signal" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">Top Ranked Opportunities</h3>
            <span className="px-2 py-1 text-xs font-mono rounded bg-primary/10 text-primary">LIMIT: 5</span>
          </div>
          <SignalsTable signals={(rankedSignals || []).slice(0, 5)} showScore />
        </div>
        
        <div className="space-y-4">
          <h3 className="text-lg font-bold">System Log</h3>
          <div className="terminal-panel p-4 h-[300px] font-mono text-xs overflow-y-auto">
            <div className="flex gap-4">
              <span className="text-muted-foreground/50">{currentTime}</span>
              <span className="text-green-400">System initialized</span>
            </div>
            <div className="flex gap-4 mt-2">
              <span className="text-muted-foreground/50">{currentTime}</span>
              <span>Health check: {health?.status || 'UNKNOWN'}</span>
            </div>
            <div className="flex gap-4 mt-2">
              <span className="text-muted-foreground/50">{currentTime}</span>
              <span>Data provider: {health?.data_provider || 'N/A'}</span>
            </div>
            <div className="flex gap-4 mt-2">
              <span className="text-muted-foreground/50">{currentTime}</span>
              <span>Demo mode: {health?.demo_mode ? 'ON' : 'OFF'}</span>
            </div>
            {signals?.length > 0 && (
              <div className="flex gap-4 mt-2">
                <span className="text-muted-foreground/50">{currentTime}</span>
                <span className="text-blue-400">Loaded {signals.length} signals</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SignalsPage({ signals, loading }) {
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState(false);

  const filtered = useMemo(() => {
    let result = signals || [];
    if (search.trim()) {
      result = result.filter(s => s.tradingsymbol?.toLowerCase().includes(search.toLowerCase()));
    }
    if (filterActive) {
      result = result.filter(s => normalizeSignal(s.signal) !== 0);
    }
    return result;
  }, [signals, search, filterActive]);

  return (
    <div data-testid="signals-page" className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Live Signals</h2>
          <p className="mt-1 font-mono text-sm text-muted-foreground">Raw output from all strategies</p>
        </div>
        <div className="flex gap-3">
          <input
            type="text"
            data-testid="signal-search"
            placeholder="Search symbol..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9 px-4 rounded border border-border/50 bg-card font-mono text-sm text-foreground placeholder:text-muted-foreground"
          />
          <button
            data-testid="filter-active-btn"
            onClick={() => setFilterActive(!filterActive)}
            className={`h-9 px-4 rounded font-mono text-xs ${
              filterActive ? 'bg-primary text-primary-foreground' : 'bg-card border border-border/50'
            }`}
          >
            ACTIVE_ONLY
          </button>
        </div>
      </div>
      <SignalsTable signals={filtered} loading={loading} />
      {!loading && (
        <div className="text-right font-mono text-xs text-muted-foreground">
          Showing {filtered.length} of {(signals || []).length} signals
        </div>
      )}
    </div>
  );
}

function RankedPage({ rankedSignals, loading }) {
  const sorted = useMemo(() => {
    return [...(rankedSignals || [])].sort((a, b) => (b.score || 0) - (a.score || 0));
  }, [rankedSignals]);

  return (
    <div data-testid="ranked-page" className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-8 w-2 rounded-sm bg-amber-500"></div>
          <h2 className="text-2xl font-bold text-foreground">Ranked Opportunities</h2>
        </div>
        <p className="ml-5 font-mono text-sm text-muted-foreground">
          Signals processed through ensemble scoring
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between p-4 rounded-t-lg border border-b-0 border-amber-500/20 bg-amber-500/10">
          <h3 className="font-mono text-sm font-bold text-amber-400">TOP HIGH-CONVICTION SETUPS</h3>
          <span className="font-mono text-xs text-amber-400/60">SORT: DESC(SCORE)</span>
        </div>
        <div className="border border-amber-500/20 rounded-b-lg overflow-hidden">
          <SignalsTable signals={sorted.slice(0, 10)} loading={loading} showScore />
        </div>
      </div>

      {!loading && sorted.length > 10 && (
        <div className="mt-8">
          <h3 className="mb-4 font-mono text-sm text-muted-foreground">REMAINDER OF UNIVERSE</h3>
          <SignalsTable signals={sorted.slice(10)} showScore />
        </div>
      )}
    </div>
  );
}

function ScannerPage() {
  const [topN, setTopN] = useState('20');
  const [queryVal, setQueryVal] = useState('20');
  const { data, loading } = useApi(`/api/scan?top_n=${queryVal}`);
  const results = data?.results || [];

  return (
    <div data-testid="scanner-page" className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <span className="text-primary">⊕</span> Market Scanner
          </h2>
          <p className="mt-1 font-mono text-sm text-muted-foreground">Cross-sectional analysis</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-muted-foreground">TOP_N:</span>
          <input
            type="number"
            data-testid="top-n-input"
            value={topN}
            onChange={e => setTopN(e.target.value)}
            className="h-9 w-20 text-center rounded border border-border/50 bg-card font-mono text-foreground"
            min="1"
          />
          <button
            data-testid="run-scan-btn"
            onClick={() => setQueryVal(topN)}
            disabled={loading}
            className="h-9 px-4 rounded bg-primary text-primary-foreground font-mono text-xs"
          >
            {loading ? 'SCANNING...' : 'RUN_SCAN'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="terminal-panel h-48 p-5 opacity-50">
              <div className="h-6 w-20 animate-pulse rounded bg-white/10"></div>
            </div>
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="terminal-panel border-dashed p-12 text-center">
          <div className="text-4xl mb-4">⊕</div>
          <div className="font-mono text-muted-foreground">NO_RESULTS_FOUND</div>
          <p className="text-sm text-muted-foreground/60 mt-2">Try running the engine first</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {results.map((res, i) => {
            const score = res.score || 0;
            const isHigh = score >= 60;
            return (
              <div key={`${res.tradingsymbol}-${i}`} className={`terminal-panel p-5 ${isHigh ? 'border-primary/40' : ''}`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-mono text-xl font-bold text-foreground">{res.tradingsymbol || '-'}</h3>
                    <div className="text-xs text-muted-foreground">{res.strategy || '-'}</div>
                  </div>
                  <span className={`px-2 py-1 rounded font-mono text-xs font-bold ${
                    isHigh ? 'bg-primary/20 text-primary' : 'bg-white/5 text-muted-foreground'
                  }`}>
                    {score > 0 ? score.toFixed(1) : '-'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground font-mono">Close</div>
                    <div className="font-mono font-medium">{formatNumber(res.close)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground font-mono">RSI</div>
                    <div className={`font-mono font-medium ${res.rsi > 70 ? 'text-rose-400' : res.rsi < 30 ? 'text-green-400' : ''}`}>
                      {formatNumber(res.rsi, 1)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground font-mono">ADX</div>
                    <div className={`font-mono font-medium ${res.adx > 25 ? 'text-green-400' : ''}`}>
                      {formatNumber(res.adx, 1)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground font-mono">ATR</div>
                    <div className="font-mono font-medium">{formatNumber(res.atr)}</div>
                  </div>
                </div>
                <div className="border-t border-border/40 pt-3 text-xs font-mono">
                  {isHigh ? <span className="text-primary">↑ ACTIONABLE</span> : <span className="text-muted-foreground">MONITORING</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ChartsPage({ universe }) {
  const [symbol, setSymbol] = useState('RELIANCE');
  const { data: debugData, loading } = useApi(symbol ? `/api/debug/${symbol}` : null);

  const chartData = useMemo(() => {
    if (!debugData || !Array.isArray(debugData)) return [];
    return debugData.map(d => ({
      ts: d.ts ? d.ts.substring(5, 16).replace('T', ' ') : '',
      close: d.close,
      ema_fast: d.ema_fast,
      ema_slow: d.ema_slow,
      rsi: d.rsi,
      adx: d.adx
    }));
  }, [debugData]);

  return (
    <div data-testid="charts-page" className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <span className="text-primary">📈</span> Price Charts
          </h2>
          <p className="mt-1 font-mono text-sm text-muted-foreground">Technical analysis visualization</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-muted-foreground">SYMBOL:</span>
          <select
            data-testid="chart-symbol-select"
            value={symbol}
            onChange={e => setSymbol(e.target.value)}
            className="h-9 px-3 rounded border border-border/50 bg-card font-mono text-sm text-foreground"
          >
            {(universe || []).slice(0, 50).map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="terminal-panel p-6">
        <h3 className="font-mono text-sm text-muted-foreground mb-4">PRICE + EMA ({symbol})</h3>
        {loading ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground font-mono">
            LOADING_CHART_DATA...
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground font-mono">
            NO_DATA_AVAILABLE
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground font-mono uppercase bg-black/40 border-b border-border/50">
                <tr>
                  <th className="px-4 py-2 text-left">Time</th>
                  <th className="px-4 py-2 text-right">Close</th>
                  <th className="px-4 py-2 text-right">EMA Fast</th>
                  <th className="px-4 py-2 text-right">EMA Slow</th>
                  <th className="px-4 py-2 text-right">RSI</th>
                  <th className="px-4 py-2 text-right">ADX</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs divide-y divide-border/20">
                {chartData.map((d, i) => (
                  <tr key={i} className="data-table-row">
                    <td className="px-4 py-2 text-muted-foreground">{d.ts}</td>
                    <td className="px-4 py-2 text-right font-bold">{formatNumber(d.close)}</td>
                    <td className="px-4 py-2 text-right text-blue-400">{formatNumber(d.ema_fast)}</td>
                    <td className="px-4 py-2 text-right text-amber-400">{formatNumber(d.ema_slow)}</td>
                    <td className={`px-4 py-2 text-right ${d.rsi > 70 ? 'text-rose-400' : d.rsi < 30 ? 'text-green-400' : 'text-muted-foreground'}`}>
                      {formatNumber(d.rsi, 1)}
                    </td>
                    <td className={`px-4 py-2 text-right ${d.adx > 25 ? 'text-green-400' : 'text-muted-foreground'}`}>
                      {formatNumber(d.adx, 1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="terminal-panel p-4">
          <div className="text-xs font-mono text-muted-foreground mb-2">LATEST CLOSE</div>
          <div className="text-2xl font-mono font-bold">
            {chartData.length > 0 ? formatNumber(chartData[chartData.length - 1].close) : '-'}
          </div>
        </div>
        <div className="terminal-panel p-4">
          <div className="text-xs font-mono text-muted-foreground mb-2">EMA TREND</div>
          <div className="text-2xl font-mono font-bold">
            {chartData.length > 0 && chartData[chartData.length - 1].ema_fast > chartData[chartData.length - 1].ema_slow
              ? <span className="text-green-400">BULLISH ↑</span>
              : <span className="text-rose-400">BEARISH ↓</span>
            }
          </div>
        </div>
        <div className="terminal-panel p-4">
          <div className="text-xs font-mono text-muted-foreground mb-2">RSI STATUS</div>
          <div className="text-2xl font-mono font-bold">
            {chartData.length > 0 ? (
              chartData[chartData.length - 1].rsi > 70 
                ? <span className="text-rose-400">OVERBOUGHT</span>
                : chartData[chartData.length - 1].rsi < 30 
                  ? <span className="text-green-400">OVERSOLD</span>
                  : <span className="text-muted-foreground">NEUTRAL</span>
            ) : '-'}
          </div>
        </div>
      </div>
    </div>
  );
}

function UniversePage({ universe, loading }) {
  const [search, setSearch] = useState('');
  const symbols = universe || [];
  const filtered = useMemo(() => {
    if (!search.trim()) return symbols;
    return symbols.filter(s => s.toLowerCase().includes(search.toLowerCase()));
  }, [symbols, search]);

  return (
    <div data-testid="universe-page" className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <span className="text-primary">☰</span> Trading Universe
          </h2>
          <p className="mt-1 font-mono text-sm text-muted-foreground">Symbols actively monitored</p>
        </div>
        <input
          type="text"
          data-testid="universe-search"
          placeholder="Filter symbols..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-9 w-72 px-4 rounded border border-border/50 bg-card font-mono text-sm text-foreground placeholder:text-muted-foreground"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="terminal-panel p-6">
          <div className="text-xs font-mono text-muted-foreground mb-4">UNIVERSE_STATS</div>
          <div className="text-5xl font-mono font-bold text-foreground mb-2">{loading ? '-' : symbols.length}</div>
          <div className="text-sm text-primary mb-6">Total Symbols</div>
          <div className="space-y-3 border-t border-border/50 pt-6 font-mono text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Filtered:</span>
              <span>{filtered.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Source:</span>
              <span className="text-green-400">Live Backend</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          {loading ? (
            <div className="flex flex-wrap gap-2">
              {[...Array(24)].map((_, i) => (
                <div key={i} className="h-10 w-24 animate-pulse rounded border border-border/30 bg-white/5"></div>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {filtered.map(symbol => (
                <div
                  key={symbol}
                  className="px-4 py-2 rounded border border-border/50 bg-card font-mono text-sm text-foreground hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all"
                >
                  {symbol}
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="w-full rounded border border-dashed border-border/50 p-12 text-center font-mono text-muted-foreground">
                  NO_SYMBOLS_MATCH_FILTER
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DebugPage() {
  const [symbol, setSymbol] = useState('');
  const [activeSymbol, setActiveSymbol] = useState('');
  const { data: rows, loading: rowsLoading, error: rowsError } = useApi(
    activeSymbol ? `/api/debug/${activeSymbol}` : null
  );
  const { data: summary, loading: summaryLoading } = useApi(
    activeSymbol ? `/api/debug/${activeSymbol}/summary` : null
  );
  const { data: debugStatus } = useApi('/api/debug/status');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get('symbol');
    if (s) {
      setSymbol(s.toUpperCase());
      setActiveSymbol(s.toUpperCase());
    }
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (symbol.trim()) {
      setActiveSymbol(symbol.trim().toUpperCase());
    }
  };

  const loading = rowsLoading || summaryLoading;
  const hasData = Array.isArray(rows) && rows.length > 0;

  return (
    <div data-testid="debug-page" className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <span className="text-primary">⚙</span> Strategy Debugger
        </h2>
        <p className="mt-1 font-mono text-sm text-muted-foreground">Deep dive into signal generation logic</p>
      </div>

      {/* Debug Status Panel */}
      {debugStatus && (
        <div className="terminal-panel p-4">
          <h3 className="font-mono text-xs text-muted-foreground mb-4">ENGINE STATUS</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Last Run</div>
              <div className="font-mono">{debugStatus.engine?.last_run ? 'Yes' : 'Never'}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Status</div>
              <div className="font-mono">{debugStatus.engine?.last_run_status || 'N/A'}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Signals Count</div>
              <div className="font-mono">{debugStatus.data?.signals_count || 0}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Universe Size</div>
              <div className="font-mono">{debugStatus.config?.universe_size || 0}</div>
            </div>
          </div>
        </div>
      )}

      <div className="terminal-panel p-6">
        <form onSubmit={handleSearch} className="flex gap-4">
          <input
            type="text"
            data-testid="debug-symbol-input"
            value={symbol}
            onChange={e => setSymbol(e.target.value.toUpperCase())}
            placeholder="ENTER SYMBOL (e.g. RELIANCE)"
            className="flex-1 max-w-md h-12 px-4 rounded border border-border bg-black/50 font-mono text-lg text-foreground placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            data-testid="debug-analyze-btn"
            disabled={loading || !symbol.trim()}
            className="h-12 px-8 rounded bg-primary text-primary-foreground font-mono disabled:opacity-50"
          >
            {loading ? 'QUERYING...' : 'ANALYZE'}
          </button>
        </form>
      </div>

      {rowsError && activeSymbol && (
        <div className="flex items-center gap-3 rounded border border-red-500/30 bg-red-500/10 p-4 font-mono text-red-400">
          <span>⚠</span>
          <div>FAILED TO FETCH DATA FOR "{activeSymbol}": Symbol may not exist in universe.</div>
        </div>
      )}

      {activeSymbol && hasData && !loading && (
        <div className="space-y-6">
          {summary && (
            <div className="terminal-panel border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-6">
              <h3 className="mb-4 font-mono text-sm uppercase text-primary">Analysis Summary: {activeSymbol}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div className="text-xs text-muted-foreground font-mono mb-1">VWLM SIGNAL</div>
                  <SignalBadge signal={summary.vwlm_signal ? 1 : 0} />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground font-mono mb-1">VB SIGNAL</div>
                  <SignalBadge signal={summary.vb_signal ? 1 : 0} />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground font-mono mb-1">EXPLANATION</div>
                  <p className="text-sm text-foreground/90">{summary.vwlm_reason} {summary.vb_reason}</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <h3 className="mb-4 font-mono text-sm text-muted-foreground">INTERNAL STATE (LAST 10 TICKS)</h3>
            <div className="terminal-panel overflow-x-auto">
              <table className="w-full whitespace-nowrap text-left text-sm">
                <thead className="text-[10px] uppercase text-muted-foreground font-mono border-b border-border/50 bg-black/40">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3 text-right">Close</th>
                    <th className="px-4 py-3 text-right">EMA Fast</th>
                    <th className="px-4 py-3 text-right">EMA Slow</th>
                    <th className="px-4 py-3 text-right">RSI</th>
                    <th className="px-4 py-3 text-right">ADX</th>
                    <th className="px-4 py-3 text-right border-l border-border/30">VB Sig</th>
                    <th className="px-4 py-3 text-right">Med_42</th>
                    <th className="px-4 py-3 text-right bg-primary/5">Final Sig</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-xs divide-y divide-border/20">
                  {rows.slice(-10).map((row, idx) => (
                    <tr key={`${row.ts}-${idx}`} className="data-table-row">
                      <td className="px-4 py-2 text-muted-foreground">{(row.ts || '').substring(0, 19).replace('T', ' ')}</td>
                      <td className="px-4 py-2 text-right">{formatNumber(row.close)}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">{formatNumber(row.ema_fast)}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">{formatNumber(row.ema_slow)}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">{formatNumber(row.rsi, 1)}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">{formatNumber(row.adx, 1)}</td>
                      <td className="px-4 py-2 text-right border-l border-border/30">
                        {normalizeSignal(row.vb_signal) === 1 ? <span className="text-green-400">1</span> : 
                         normalizeSignal(row.vb_signal) === -1 ? <span className="text-rose-400">-1</span> : 
                         <span className="text-muted-foreground">0</span>}
                      </td>
                      <td className="px-4 py-2 text-right text-muted-foreground">{formatNumber(row.median_42)}</td>
                      <td className="px-4 py-2 text-right font-bold bg-primary/5">
                        {normalizeSignal(row.signal) === 1 ? <span className="text-green-400">1</span> : 
                         normalizeSignal(row.signal) === -1 ? <span className="text-rose-400">-1</span> : 
                         <span className="text-muted-foreground">0</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {!activeSymbol && !loading && (
        <div className="terminal-panel border-dashed border-border/50 p-16 text-center opacity-50">
          <div className="text-4xl mb-4">⚙</div>
          <div className="font-mono text-sm">AWAITING_INPUT</div>
          <p className="mt-2 text-xs text-muted-foreground">Enter a symbol above to view internal strategy variables</p>
        </div>
      )}
    </div>
  );
}

function SettingsPage({ health }) {
  const { data: config } = useApi('/api/config');
  const { data: debugStatus } = useApi('/api/debug/status');

  return (
    <div data-testid="settings-page" className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <span className="text-primary">⚡</span> Settings & Configuration
        </h2>
        <p className="mt-1 font-mono text-sm text-muted-foreground">System configuration and status</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="terminal-panel p-6">
          <h3 className="font-mono text-sm text-muted-foreground mb-4">DATA CONFIGURATION</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-border/30">
              <span className="text-sm">Demo Mode</span>
              <span className={`px-2 py-1 rounded text-xs font-mono ${
                config?.demo_mode ? 'bg-amber-500/20 text-amber-400' : 'bg-green-500/20 text-green-400'
              }`}>
                {config?.demo_mode ? 'ENABLED' : 'DISABLED'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/30">
              <span className="text-sm">Data Provider</span>
              <span className="font-mono text-sm">{config?.data_provider || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/30">
              <span className="text-sm">Zerodha Configured</span>
              <span className={`px-2 py-1 rounded text-xs font-mono ${
                config?.zerodha_configured ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {config?.zerodha_configured ? 'YES' : 'NO'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm">Universe Size</span>
              <span className="font-mono text-sm">{config?.universe_size || 0} symbols</span>
            </div>
          </div>
        </div>

        <div className="terminal-panel p-6">
          <h3 className="font-mono text-sm text-muted-foreground mb-4">ENGINE STATUS</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-border/30">
              <span className="text-sm">Health Status</span>
              <span className={`px-2 py-1 rounded text-xs font-mono ${
                health?.status === 'ok' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {health?.status?.toUpperCase() || 'UNKNOWN'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/30">
              <span className="text-sm">Last Engine Run</span>
              <span className="font-mono text-sm text-muted-foreground">
                {debugStatus?.engine?.last_run || 'Never'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/30">
              <span className="text-sm">Signals Generated</span>
              <span className="font-mono text-sm">{debugStatus?.data?.signals_count || 0}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm">Ranked Signals</span>
              <span className="font-mono text-sm">{debugStatus?.data?.ranked_count || 0}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="terminal-panel p-6">
        <h3 className="font-mono text-sm text-muted-foreground mb-4">API ROUTES STATUS</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {debugStatus?.routes && Object.entries(debugStatus.routes).map(([route, status]) => (
            <div key={route} className="flex items-center gap-2 p-2 rounded bg-black/20">
              <div className={`w-2 h-2 rounded-full ${status === 'ok' ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <span className="font-mono text-xs truncate">{route}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="terminal-panel p-6 border-amber-500/30">
        <h3 className="font-mono text-sm text-amber-400 mb-4">⚠ ENVIRONMENT NOTES</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• Zerodha credentials are stored securely in environment variables</li>
          <li>• Access tokens expire daily and need to be refreshed</li>
          <li>• Demo mode uses sample data for development/testing</li>
          <li>• Set DEMO_MODE=false in backend .env for live trading</li>
        </ul>
      </div>
    </div>
  );
}

// Main App
function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [isRunning, setIsRunning] = useState(false);

  const { data: health, loading: healthLoading } = useApi('/api/health', { refetchInterval: 30000 });
  const { data: signals, loading: signalsLoading, refetch: refetchSignals } = useApi('/api/signals', { refetchInterval: 60000 });
  const { data: rankedSignals, loading: rankedLoading, refetch: refetchRanked } = useApi('/api/signals/ranked', { refetchInterval: 60000 });
  const { data: universeData, loading: universeLoading } = useApi('/api/universe');

  const universe = universeData?.symbols || [];
  const isHealthy = health?.status === 'ok';

  const handleRunEngine = async () => {
    setIsRunning(true);
    try {
      const res = await fetch(`${API_BASE}/api/run`);
      const data = await res.json();
      console.log('Engine run result:', data);
      setTimeout(() => {
        refetchSignals();
        refetchRanked();
      }, 1000);
    } catch (e) {
      console.error('Engine run failed:', e);
    } finally {
      setIsRunning(false);
    }
  };

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage 
          health={health} 
          signals={signals} 
          rankedSignals={rankedSignals} 
          universe={universe}
          onRunEngine={handleRunEngine}
          isRunning={isRunning}
        />;
      case 'signals':
        return <SignalsPage signals={signals} loading={signalsLoading} />;
      case 'ranked':
        return <RankedPage rankedSignals={rankedSignals} loading={rankedLoading} />;
      case 'scanner':
        return <ScannerPage />;
      case 'charts':
        return <ChartsPage universe={universe} />;
      case 'universe':
        return <UniversePage universe={universe} loading={universeLoading} />;
      case 'debug':
        return <DebugPage />;
      case 'settings':
        return <SettingsPage health={health} />;
      default:
        return <DashboardPage health={health} signals={signals} rankedSignals={rankedSignals} universe={universe} />;
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar 
        activePage={activePage} 
        setActivePage={setActivePage} 
        onRunEngine={handleRunEngine}
        isRunning={isRunning}
      />
      
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 flex-shrink-0 border-b border-border/40 bg-card/20 flex items-center justify-between px-6">
          <h1 className="text-sm font-mono text-muted-foreground uppercase">/{activePage}</h1>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="text-muted-foreground">ENGINE_STATUS:</span>
              {healthLoading ? (
                <span className="text-muted-foreground animate-pulse">CHECKING...</span>
              ) : (
                <StatusIndicator isOnline={isHealthy} />
              )}
            </div>
            <div className="text-xs font-mono text-muted-foreground border-l border-border/50 pl-6">
              {new Date().toISOString().split('T')[0]} <span className="text-foreground">{new Date().toISOString().split('T')[1].substring(0, 8)}</span> UTC
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto animate-slide-in">
            {renderPage()}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
