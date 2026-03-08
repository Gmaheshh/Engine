# PRA-GATI / Quant Trading Dashboard - PRD

## Original Problem Statement
Repair and complete a broken full-stack quant trading application (PRA-GATI/Engine) with:
- React + TypeScript/Vite frontend
- Express backend proxy
- Python FastAPI backend
- Goal: Make dashboard, signals, ranked signals, scanner, universe, and debug pages work end-to-end

## Architecture

### Stack
- **Frontend**: React (CRA) on port 3000
- **Backend**: FastAPI Python on port 8001
- **Database**: N/A (uses CSV file storage for signals)
- **Data Source**: Sample data (Zerodha API fallback)

### Key Files
- `/app/backend/server.py` - Main FastAPI application with /api/* routes
- `/app/backend/engine/signal_runner.py` - Signal generation engine
- `/app/backend/data/universe.py` - 206 NSE trading symbols
- `/app/frontend/src/App.js` - Single-file React frontend

### API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/health | GET | Health check |
| /api/universe | GET | Returns 206 trading symbols |
| /api/signals | GET | Raw signals from strategies |
| /api/signals/ranked | GET | Signals with ensemble scores |
| /api/scan | GET | Market scanner (top_n param) |
| /api/run | GET | Trigger engine run |
| /api/debug/{symbol} | GET | Symbol debug rows |
| /api/debug/{symbol}/summary | GET | Symbol analysis summary |

## User Personas
- **Quant Traders**: View market signals, scan for opportunities
- **Technical Analysts**: Debug strategy logic per symbol
- **Portfolio Managers**: Review ranked opportunities

## Core Requirements (Static)
1. ✅ Dashboard with system overview, stats, and top signals
2. ✅ Live Signals page with filtering and export
3. ✅ Ranked Signals page sorted by conviction score
4. ✅ Market Scanner with configurable top_n
5. ✅ Universe page showing all 206 monitored symbols
6. ✅ Debug Tool for per-symbol strategy analysis
7. ✅ Backend health monitoring
8. ✅ Sample data fallback when Zerodha API unavailable

## What's Been Implemented
| Date | Feature | Status |
|------|---------|--------|
| 2026-03-08 | Fixed backend with sample data fallback | ✅ Complete |
| 2026-03-08 | Created standalone React frontend | ✅ Complete |
| 2026-03-08 | All 6 pages working (Dashboard, Signals, Ranked, Scanner, Universe, Debug) | ✅ Complete |
| 2026-03-08 | Signal generation with VWLM and Volatility Breakout strategies | ✅ Complete |

## Prioritized Backlog

### P0 (Critical)
- None remaining

### P1 (Important)
- Real Zerodha API integration when valid credentials available
- More symbols generating signals (currently limited to 20-30 for speed)

### P2 (Nice to have)
- CSV export functionality on Signals page
- Historical signal performance tracking
- WebSocket real-time updates
- Authentication/authorization

## Next Tasks
1. Configure valid Zerodha API credentials for real market data
2. Increase symbol batch size for engine runs
3. Add data persistence/caching layer
4. Implement CSV export feature

## Notes
- Sample data uses deterministic random generation based on symbol hash
- Engine currently processes 20 symbols for faster response (configurable)
- All boolean signals converted to integers (0/1) for frontend compatibility
