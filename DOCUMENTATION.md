# PRA-GATI Trading Platform - Complete Documentation

## 1. Updated File Tree

```
/app/
├── backend/
│   ├── .env                          # Environment variables (Zerodha credentials)
│   ├── __init__.py
│   ├── server.py                     # Main FastAPI server (MODIFIED)
│   ├── app.py                        # Legacy app (not used)
│   ├── config.py                     # Configuration constants
│   ├── backtest_engine.py            # Backtest module (future)
│   ├── market_regime.py              # NIFTY regime detection
│   ├── data/
│   │   ├── __init__.py
│   │   ├── zerodha_client.py         # Zerodha Kite Connect client (MODIFIED)
│   │   ├── fetch_candles.py          # OHLCV data fetcher (MODIFIED)
│   │   ├── sample_data.py            # Sample data generator
│   │   ├── universe.py               # 206 symbol universe
│   │   ├── instruments.py            # NSE instrument mapping
│   │   ├── instruments_nse.csv       # NSE instrument data
│   │   ├── nifty_data.py
│   │   └── storage.py
│   ├── engine/
│   │   ├── __init__.py
│   │   ├── signal_runner.py          # Main signal generation engine
│   │   ├── ranking.py                # Signal ranking/scoring
│   │   └── relative_strength.py      # RS calculations
│   ├── indicators/
│   │   ├── __init__.py
│   │   ├── ema.py                    # Exponential Moving Average
│   │   ├── rsi.py                    # Relative Strength Index
│   │   ├── adx.py                    # Average Directional Index
│   │   ├── atr.py                    # Average True Range
│   │   └── rolling_stats.py          # Rolling mean/median
│   ├── strategies/
│   │   ├── __init__.py
│   │   ├── strategy_vwlm.py          # VWLM strategy
│   │   └── strategy_volatility_breakout.py  # Volatility Breakout strategy
│   └── outputs/
│       ├── signals_latest.csv        # Generated signals
│       └── ranked_signals.csv        # Ranked signals
├── frontend/
│   ├── .env                          # Frontend environment (API URL)
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── public/
│   └── src/
│       ├── App.js                    # Main React app (MODIFIED - 8 pages)
│       ├── index.js
│       └── index.css                 # Tailwind CSS styles
└── memory/
    └── PRD.md                        # Product Requirements Document
```

---

## 2. All Changed/Created Files

### Files CREATED:
- `/app/backend/.env` - Zerodha credentials
- `/app/memory/PRD.md` - Product requirements document

### Files MODIFIED:
- `/app/backend/server.py` - Complete rewrite with all API endpoints
- `/app/backend/data/zerodha_client.py` - Environment-based credentials
- `/app/backend/data/fetch_candles.py` - Added fallback logic
- `/app/frontend/src/App.js` - Complete frontend with 8 pages

### Files UNCHANGED (from original repo):
- All indicator files (`ema.py`, `rsi.py`, `adx.py`, `atr.py`)
- All strategy files (`strategy_vwlm.py`, `strategy_volatility_breakout.py`)
- `ranking.py`, `signal_runner.py`
- `universe.py`, `sample_data.py`

---

## 3. Local Run Commands

```bash
# Step 1: Install backend dependencies
cd /app/backend
pip install fastapi uvicorn pandas numpy python-dotenv kiteconnect python-multipart

# Step 2: Install frontend dependencies
cd /app/frontend
yarn install

# Step 3: Set up environment variables
# Backend: /app/backend/.env
# Frontend: /app/frontend/.env

# Step 4: Run backend (Port 8001)
cd /app/backend
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Step 5: Run frontend (Port 3000)
cd /app/frontend
yarn start

# Access the app at: http://localhost:3000
# Backend API at: http://localhost:8001/api/
```

### With Supervisor (Production):
```bash
sudo supervisorctl restart backend
sudo supervisorctl restart frontend
sudo supervisorctl status
```

---

## 4. Required .env Variables

### Backend (`/app/backend/.env`):
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=pragati
ZERODHA_API_KEY=your_api_key_here
ZERODHA_API_SECRET=your_api_secret_here
ZERODHA_ACCESS_TOKEN=your_daily_access_token_here
DEMO_MODE=false
DATA_PROVIDER=zerodha
```

### Frontend (`/app/frontend/.env`):
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

### Environment Variable Descriptions:
| Variable | Description | Required |
|----------|-------------|----------|
| `ZERODHA_API_KEY` | Kite Connect API key | Yes |
| `ZERODHA_API_SECRET` | Kite Connect API secret | Yes |
| `ZERODHA_ACCESS_TOKEN` | Daily access token (expires daily) | Yes |
| `DEMO_MODE` | `true` = use sample data, `false` = try Zerodha | Yes |
| `DATA_PROVIDER` | `zerodha` or `sample` (display only) | No |
| `MONGO_URL` | MongoDB connection string | No |
| `DB_NAME` | Database name | No |

---

## 5. Route List with Sample JSON Responses

### GET `/api/health`
**Purpose**: Health check and system status
**Data Source**: System state
```json
{
  "status": "ok",
  "timestamp": "2026-03-08T14:51:14.589964+00:00",
  "demo_mode": false,
  "data_provider": "zerodha",
  "engine_status": "success",
  "last_run": "2026-03-08T14:25:26.292915+00:00"
}
```

### GET `/api/config`
**Purpose**: Configuration without secrets
**Data Source**: Environment variables
```json
{
  "demo_mode": false,
  "data_provider": "zerodha",
  "zerodha_configured": true,
  "universe_size": 206,
  "output_dir": "/app/backend/outputs"
}
```

### GET `/api/universe`
**Purpose**: List of monitored symbols
**Data Source**: Static list in `universe.py`
```json
{
  "count": 206,
  "symbols": ["360ONE", "ABB", "APLAPOLLO", "AUBANK", "ADANIENSOL", ...]
}
```

### GET `/api/signals`
**Purpose**: Raw signals from all strategies
**Data Source**: `outputs/signals_latest.csv` (generated from OHLCV data)
```json
[
  {
    "ts": "2026-03-06T00:00:00",
    "tradingsymbol": "ANGELONE",
    "strategy": "VWLM",
    "close": 997.57,
    "ema_fast": 985.23,
    "ema_slow": 972.11,
    "adx": 24.10,
    "atr": 24.37,
    "rsi": 65.30,
    "signal": 1
  }
]
```

### GET `/api/signals/ranked`
**Purpose**: Ranked signals with scores
**Data Source**: `outputs/ranked_signals.csv` (processed from signals)
```json
[
  {
    "ts": "2026-03-06T00:00:00",
    "tradingsymbol": "ANGELONE",
    "strategy": "VWLM",
    "close": 997.57,
    "score": 23.0,
    "entry": 997.57,
    "sl": 961.02,
    "target": 1070.68,
    "rr": 2.0,
    "shares": 273,
    "position_value": 272336.61,
    "max_loss_if_sl": 9980.25,
    "max_profit_if_target": 19959.03
  }
]
```

### GET `/api/run`
**Purpose**: Trigger signal engine execution
**Data Source**: Runs engine, processes OHLCV data
```json
{
  "status": "success",
  "signals_count": 1,
  "ranked_count": 1
}
```

### GET `/api/scan?top_n=10`
**Purpose**: Market scanner with top N results
**Data Source**: Real-time engine run on universe
```json
{
  "status": "success",
  "universe_count": 206,
  "signals_count": 3,
  "returned_count": 3,
  "results": [
    {
      "ts": "2026-03-06T00:00:00",
      "tradingsymbol": "ANGELONE",
      "strategy": "VWLM",
      "close": 997.57,
      "score": 23.0,
      "entry": 997.57,
      "sl": 961.02,
      "target": 1070.68,
      "rr": 2.0
    }
  ]
}
```

### GET `/api/debug/{symbol}`
**Purpose**: Debug indicator data for a symbol
**Data Source**: Fetches OHLCV and calculates indicators
```json
[
  {
    "ts": "2026-03-06T12:00:00+05:30",
    "tradingsymbol": "RELIANCE",
    "open": 1416.0,
    "high": 1420.5,
    "low": 1401.0,
    "close": 1407.0,
    "volume": 8613942,
    "ema_fast": 1395.79,
    "ema_slow": 1411.38,
    "atr": 22.92,
    "adx": 26.84,
    "rsi": 43.32,
    "signal": 0,
    "vb_signal": 0,
    "median_42": 1422.70
  }
]
```

### GET `/api/debug/{symbol}/summary`
**Purpose**: Analysis summary with explanations
**Data Source**: Calculated from latest indicator values
```json
{
  "symbol": "RELIANCE",
  "ts": "2026-03-06T12:00:00+05:30",
  "close": 1407.0,
  "ema_fast": 1395.79,
  "ema_slow": 1411.38,
  "adx": 26.84,
  "atr": 22.92,
  "rsi": 43.32,
  "median_42": 1422.70,
  "vwlm_signal": false,
  "vb_signal": false,
  "vwlm_reason": "EMA fast is not above EMA slow.",
  "vb_reason": "Close is below median_42."
}
```

### GET `/api/debug/status`
**Purpose**: Engine status and route health
**Data Source**: Internal state tracking
```json
{
  "status": "ok",
  "engine": {
    "last_run": "2026-03-08T14:25:26.292915+00:00",
    "last_run_status": "success",
    "processed_count": 20,
    "error_count": 0,
    "signals_generated": 0,
    "last_error": null
  },
  "data": {
    "signals_file_exists": true,
    "signals_count": 0,
    "ranked_file_exists": true,
    "ranked_count": 0
  },
  "config": {
    "demo_mode": false,
    "data_provider": "zerodha",
    "universe_size": 206
  },
  "routes": {
    "/api/health": "ok",
    "/api/signals": "ok",
    "/api/signals/ranked": "ok",
    "/api/universe": "ok",
    "/api/scan": "ok",
    "/api/run": "ok",
    "/api/debug/{symbol}": "ok",
    "/api/debug/{symbol}/summary": "ok"
  }
}
```

---

## 6. Signal Logic Formulas

### VWLM Strategy (Volume-Weighted Liquidity Momentum)

**Indicators Used:**
```python
ema_fast = EMA(close, span=18)
ema_slow = EMA(close, span=42)
atr = ATR(high, low, close, window=20)
adx = ADX(high, low, close, window=20)
rsi = RSI(close, window=14)
vol_ma = SMA(volume, window=20)
```

**Signal Formula:**
```python
signal = (
    (ema_fast > ema_slow) AND           # EMA bullish crossover
    (close > prev_high) AND              # Price breakout
    (volume > vol_ma * 1.05) AND         # Volume confirmation (+5%)
    (adx > 20) AND                       # Trend strength
    (rsi > 50) AND                       # Momentum confirmation
    (atr / close > 0.003)                # Volatility confirmation (0.3%)
)
```

### Volatility Breakout Strategy

**Indicators Used:**
```python
ema_fast = EMA(close, span=18)
ema_slow = EMA(close, span=42)
atr = ATR(high, low, close, window=20)
adx = ADX(high, low, close, window=20)
rsi = RSI(close, window=14)
vol_ma_20 = SMA(volume, window=20)
median_42 = MEDIAN(close, window=42)
hh_20 = MAX(prev_high, window=20)
range_10 = MAX(prev_high, 10) - MIN(prev_low, 10)
atr_mean_10 = SMA(prev_atr, window=10)
```

**Signal Formula:**
```python
signal = (
    (regime_bull) AND                    # Market in bull regime
    (rs_filter) AND                      # Relative strength filter
    (ema_fast > ema_slow AND close > ema_fast) AND  # Trend up
    (adx > 20) AND                       # Trend strength
    (rsi > 52) AND                       # Momentum confirmation
    (close > hh_20) AND                  # 20-day breakout
    (volume > vol_ma_20 * 1.15) AND      # Volume expansion (+15%)
    (atr / close > 0.004) AND            # Volatility confirmation (0.4%)
    (range_10 < atr_mean_10 * 10) AND    # Compression confirmation
    ((close - low) / (high - low) > 0.55) AND  # Close strength
    (abs(open - prev_close) / prev_close < 0.04)  # No big gaps (<4%)
)
```

### Ranking/Scoring Formula
```python
score = (adx * 0.4) + (rsi * 0.2) + ((ema_fast - ema_slow) * 0.4)

# Position Sizing
entry = close
sl = entry - (1.5 * atr)    # Stop loss: 1.5x ATR below entry
target = entry + (3.0 * atr) # Target: 3x ATR above entry
rr = (target - entry) / (entry - sl)  # Risk-Reward ratio = 2.0

# Share calculation (min of risk-based and capital-based)
risk_per_trade = 10000  # 1% of 10L capital
shares_by_risk = risk_per_trade / (entry - sl)
shares_by_capital = 100000 / entry  # 10% of capital
shares = min(shares_by_risk, shares_by_capital)
```

---

## 7. Data Source Explanation by Endpoint

| Endpoint | Data Source | Fallback | Notes |
|----------|-------------|----------|-------|
| `/api/health` | System state | None | Always returns current state |
| `/api/config` | Environment vars | None | No secrets exposed |
| `/api/universe` | Static list | None | 206 hardcoded symbols |
| `/api/signals` | CSV file | Empty array | Reads `signals_latest.csv` |
| `/api/signals/ranked` | CSV file | Empty array | Reads `ranked_signals.csv` |
| `/api/run` | **Zerodha API** | **Sample data** | Tries Zerodha, falls back to sample |
| `/api/scan` | **Zerodha API** | **Sample data** | Same as `/api/run` |
| `/api/debug/{symbol}` | **Zerodha API** | **Sample data** | 4-hour candles for 90 days |
| `/api/debug/{symbol}/summary` | **Zerodha API** | **Sample data** | Same as debug |
| `/api/debug/status` | System state | None | Internal tracking |

### Data Flow Decision Tree:
```
Request comes in
    │
    ├── Is DEMO_MODE=true?
    │       └── YES → Use sample data (deterministic based on symbol hash)
    │
    └── NO → Try Zerodha API
            │
            ├── ZERODHA_API_KEY set?
            │       └── NO → Use sample data
            │
            ├── ZERODHA_ACCESS_TOKEN valid?
            │       └── NO → Use sample data (token expires daily)
            │
            └── API call succeeds?
                    ├── YES → Return real data
                    └── NO → Use sample data (with error log)
```

### Sample Data Characteristics:
- Generated using `numpy.random` with seed based on symbol hash
- Produces consistent data per symbol across runs
- Simulates realistic price movements with:
  - Base price: 500 + (symbol_hash % 2000)
  - Daily returns: Normal distribution (μ=0.0003, σ=0.02)
  - Volume: Random 100K-5M
- Signals can still trigger on sample data based on indicator conditions

---

## Quick Reference

### Ports:
- Backend: **8001**
- Frontend: **3000**
- MongoDB: **27017**

### Key Files:
- Main API: `/app/backend/server.py`
- Signal Engine: `/app/backend/engine/signal_runner.py`
- Frontend: `/app/frontend/src/App.js`
- Credentials: `/app/backend/.env`

### Frontend Pages:
1. Dashboard (`/`)
2. Live Signals (`/signals`)
3. Ranked (`/ranked`)
4. Scanner (`/scanner`)
5. Charts (`/charts`)
6. Universe (`/universe`)
7. Debug Tool (`/debug`)
8. Settings (`/settings`)
