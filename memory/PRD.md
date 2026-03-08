# PRA-GATI Trading Platform - Product Requirements Document

## Original Problem Statement
Transform GitHub repository (https://github.com/Gmaheshh/Engine) into a stable PRA-GATI trading app with:
- Real market data flow
- Real technical indicator calculations
- Deterministic buy/sell/hold signal generation
- Signal rankings with debug visibility
- Watchlist/scanner workflow
- Charts and market overview
- Clean frontend-backend architecture
- Zerodha-ready architecture

## User Personas
1. **Active Trader**: Needs real-time signals, quick scan capabilities, and clear entry/exit points
2. **Technical Analyst**: Requires indicator visibility, debug tools, and strategy understanding
3. **Portfolio Manager**: Monitors universe, tracks ranked opportunities, reviews system health

## Core Requirements (Static)
1. Real indicator-based signal generation (EMA, RSI, ADX, ATR, MACD)
2. Two strategies: VWLM and Volatility Breakout
3. Signal ranking with scoring
4. Debug visibility for why signals triggered
5. 206 symbol universe (Nifty-related stocks)
6. Environment-based credential management
7. Demo mode for development/testing

## What's Been Implemented (March 8, 2026)

### Backend (Python FastAPI - Port 8001)
- `/api/health` - Health check with status, data provider, demo mode
- `/api/universe` - Returns 206 symbols
- `/api/signals` - Raw signals with indicators
- `/api/signals/ranked` - Ranked signals with scores
- `/api/run` - Trigger signal engine
- `/api/scan` - Market scanner with top_n parameter
- `/api/debug/{symbol}` - Debug indicator data
- `/api/debug/{symbol}/summary` - Analysis summary with reasons
- `/api/debug/status` - Engine status and route health
- `/api/config` - Configuration without secrets

### Frontend (React - Port 3000)
- Dashboard - System overview with stats cards, top ranked, system log
- Live Signals - Signal table with search/filter
- Ranked - Sorted opportunities by score
- Scanner - Cross-sectional analysis cards
- Charts - Symbol data with EMA trend, RSI status
- Universe - 206 symbols with filter
- Debug Tool - Deep dive into signal logic
- Settings - Configuration visibility

### Signal Logic
- **VWLM Strategy**: EMA crossover + RSI + ADX + Volume confirmation
- **Volatility Breakout**: Price breakout + Trend strength + Compression detection
- **Ranking**: Score = ADX*0.4 + RSI*0.2 + EMA_diff*0.4

### Data Integration
- Zerodha Kite Connect configured via environment variables
- Sample data fallback for development
- DEMO_MODE flag for testing

## Prioritized Backlog

### P0 (Critical) - DONE
- [x] Core signal generation
- [x] Backend API endpoints
- [x] Frontend pages
- [x] Zerodha credential management
- [x] Debug visibility

### P1 (High Priority) - Future
- [ ] Real Zerodha historical data integration (access token refresh)
- [ ] Backtest module implementation
- [ ] CSV export for signals
- [ ] Watchlist persistence

### P2 (Medium Priority) - Future
- [ ] Real-time WebSocket streaming
- [ ] Alert notifications
- [ ] User authentication
- [ ] Portfolio tracking
- [ ] Order execution module

## Next Tasks
1. Implement Zerodha access token refresh flow
2. Add backtest module with historical performance
3. Implement watchlist persistence with MongoDB
4. Add CSV export functionality
5. Build sector grouping views

## Technical Stack
- Backend: Python, FastAPI, pandas, numpy, kiteconnect
- Frontend: React 18, Tailwind CSS
- Database: MongoDB (configured but not yet used)
- Data: Zerodha Kite Connect API

## Environment Variables
- `ZERODHA_API_KEY` - Kite Connect API key
- `ZERODHA_API_SECRET` - Kite Connect API secret
- `ZERODHA_ACCESS_TOKEN` - Daily access token
- `DEMO_MODE` - true/false for sample data
- `DATA_PROVIDER` - zerodha/sample
