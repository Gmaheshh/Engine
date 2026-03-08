import sys
import os
from pathlib import Path
from datetime import datetime, timezone

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / '.env')

# Ensure the parent directory is in path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import math
import pandas as pd
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.config import OUTPUT_DIR
from backend.engine.signal_runner import run_engine
from backend.data.instruments import download_nse_instruments, get_instrument_token
from backend.data.universe import TEST_SYMBOLS
from backend.data.fetch_candles import fetch_4h_candles
from backend.strategies.strategy_vwlm import run_vwlm
from backend.strategies.strategy_volatility_breakout import run_volatility_breakout

app = FastAPI(title="PRA-GATI Backend", version="1.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global state for debug/status tracking
class EngineState:
    last_run: str = None
    last_run_status: str = "never_run"
    processed_count: int = 0
    error_count: int = 0
    signals_generated: int = 0
    last_error: str = None

engine_state = EngineState()


def clean_value(v):
    if pd.isna(v):
        return None
    if isinstance(v, pd.Timestamp):
        return v.isoformat()
    if isinstance(v, (np.integer,)):
        return int(v)
    if isinstance(v, (np.floating,)):
        if math.isnan(float(v)) or math.isinf(float(v)):
            return None
        return float(v)
    if isinstance(v, (np.bool_, bool)):
        return bool(v)
    return v


def clean_records(df: pd.DataFrame):
    if df.empty:
        return []

    records = df.to_dict(orient="records")
    cleaned = []
    for row in records:
        cleaned_row = {}
        for k, v in row.items():
            cleaned_row[k] = clean_value(v)
        cleaned.append(cleaned_row)
    return cleaned


def convert_signal_to_int(df: pd.DataFrame) -> pd.DataFrame:
    """Convert boolean signals to integer (1/0) for frontend compatibility."""
    out = df.copy()
    if "signal" in out.columns:
        out["signal"] = out["signal"].apply(lambda x: 1 if bool(x) else 0)
    if "vb_signal" in out.columns:
        out["vb_signal"] = out["vb_signal"].apply(lambda x: 1 if bool(x) else 0)
    return out


@app.get("/api/health")
def health():
    """Health check endpoint."""
    demo_mode = os.environ.get('DEMO_MODE', 'true').lower() == 'true'
    data_provider = os.environ.get('DATA_PROVIDER', 'sample')
    
    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "demo_mode": demo_mode,
        "data_provider": data_provider,
        "engine_status": engine_state.last_run_status,
        "last_run": engine_state.last_run
    }


@app.get("/api/debug/status")
def debug_status():
    """Get detailed debug status about the engine."""
    signals_path = OUTPUT_DIR / "signals_latest.csv"
    ranked_path = OUTPUT_DIR / "ranked_signals.csv"
    
    signals_count = 0
    ranked_count = 0
    
    try:
        if signals_path.exists() and signals_path.stat().st_size > 1:
            df = pd.read_csv(signals_path)
            signals_count = len(df)
    except Exception:
        pass
    
    try:
        if ranked_path.exists() and ranked_path.stat().st_size > 1:
            df = pd.read_csv(ranked_path)
            ranked_count = len(df)
    except Exception:
        pass
    
    return {
        "status": "ok",
        "engine": {
            "last_run": engine_state.last_run,
            "last_run_status": engine_state.last_run_status,
            "processed_count": engine_state.processed_count,
            "error_count": engine_state.error_count,
            "signals_generated": engine_state.signals_generated,
            "last_error": engine_state.last_error
        },
        "data": {
            "signals_file_exists": signals_path.exists(),
            "signals_count": signals_count,
            "ranked_file_exists": ranked_path.exists(),
            "ranked_count": ranked_count
        },
        "config": {
            "demo_mode": os.environ.get('DEMO_MODE', 'true').lower() == 'true',
            "data_provider": os.environ.get('DATA_PROVIDER', 'sample'),
            "universe_size": len(TEST_SYMBOLS)
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


@app.get("/api/debug/signals")
def debug_signals():
    """Get raw signals data for debugging."""
    path = OUTPUT_DIR / "signals_latest.csv"
    
    if not path.exists() or path.stat().st_size <= 1:
        return {
            "status": "no_data",
            "message": "No signals file found. Run the engine first.",
            "signals": []
        }
    
    try:
        df = pd.read_csv(path)
        return {
            "status": "ok",
            "count": len(df),
            "columns": list(df.columns),
            "signals": clean_records(df.head(20))
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "signals": []
        }


@app.get("/api/universe")
def get_universe():
    return {
        "count": len(TEST_SYMBOLS),
        "symbols": TEST_SYMBOLS
    }


@app.get("/api/instruments/refresh")
def refresh_instruments():
    df = download_nse_instruments()
    return {
        "status": "success",
        "rows": int(len(df))
    }


@app.get("/api/run")
def run_signals():
    """Run the signal engine on the universe."""
    global engine_state
    
    try:
        engine_state.last_run = datetime.now(timezone.utc).isoformat()
        engine_state.last_run_status = "running"
        engine_state.error_count = 0
        
        symbols_to_process = TEST_SYMBOLS[:20]  # Limit for faster response
        engine_state.processed_count = len(symbols_to_process)
        
        signals, ranked = run_engine(symbols_to_process)
        
        engine_state.signals_generated = len(signals) if not signals.empty else 0
        engine_state.last_run_status = "success"
        engine_state.last_error = None
        
        return {
            "status": "success",
            "signals_count": int(len(signals)),
            "ranked_count": int(len(ranked)),
        }
    except Exception as e:
        engine_state.last_run_status = "error"
        engine_state.last_error = str(e)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/signals")
def get_signals():
    path = OUTPUT_DIR / "signals_latest.csv"
    if not path.exists() or path.stat().st_size <= 1:
        # Run engine to generate signals if none exist
        signals, ranked = run_engine(TEST_SYMBOLS[:20])
        if signals.empty:
            return JSONResponse(content=[])
    
    try:
        df = pd.read_csv(path)
        if df.empty:
            return JSONResponse(content=[])
        df = convert_signal_to_int(df)
        return JSONResponse(content=clean_records(df))
    except Exception as e:
        print(f"Error reading signals: {e}")
        return JSONResponse(content=[])


@app.get("/api/signals/ranked")
def get_ranked_signals():
    path = OUTPUT_DIR / "ranked_signals.csv"
    if not path.exists() or path.stat().st_size <= 1:
        # Run engine to generate signals if none exist
        signals, ranked = run_engine(TEST_SYMBOLS[:20])
        if ranked.empty:
            return JSONResponse(content=[])
    
    try:
        df = pd.read_csv(path)
        if df.empty:
            return JSONResponse(content=[])
        df = convert_signal_to_int(df)
        return JSONResponse(content=clean_records(df))
    except Exception as e:
        print(f"Error reading ranked signals: {e}")
        return JSONResponse(content=[])


@app.get("/api/debug/{symbol}")
def debug_symbol(symbol: str):
    symbol = symbol.upper()

    token = get_instrument_token(symbol)
    df = fetch_4h_candles(token, days=90, symbol=symbol)

    if df.empty:
        return JSONResponse(
            {"error": f"No candle data found for {symbol}"},
            status_code=404
        )

    df["tradingsymbol"] = symbol
    df["interval"] = "4hour"

    vwlm_df = run_vwlm(df)
    vb_df = run_volatility_breakout(df)

    debug_df = vwlm_df.copy()
    debug_df["vb_signal"] = vb_df["signal"]

    if "median_42" in vb_df.columns:
        debug_df["median_42"] = vb_df["median_42"]

    cols = [
        "ts",
        "tradingsymbol",
        "open",
        "high",
        "low",
        "close",
        "volume",
        "ema_fast",
        "ema_slow",
        "atr",
        "adx",
        "rsi",
        "signal",
        "vb_signal",
        "median_42",
    ]

    available_cols = [c for c in cols if c in debug_df.columns]
    out = debug_df[available_cols].tail(10).copy()
    out = convert_signal_to_int(out)

    return JSONResponse(content=clean_records(out))


@app.get("/api/debug/{symbol}/summary")
def debug_symbol_summary(symbol: str):
    symbol = symbol.upper()

    token = get_instrument_token(symbol)
    df = fetch_4h_candles(token, days=90, symbol=symbol)

    if df.empty:
        return JSONResponse(
            {"error": f"No candle data found for {symbol}"},
            status_code=404
        )

    df["tradingsymbol"] = symbol
    df["interval"] = "4hour"

    vwlm_df = run_vwlm(df)
    vb_df = run_volatility_breakout(df)

    latest_vwlm = vwlm_df.iloc[-1]
    latest_vb = vb_df.iloc[-1]

    ema_fast = latest_vwlm.get("ema_fast")
    ema_slow = latest_vwlm.get("ema_slow")
    adx_val = latest_vwlm.get("adx")
    rsi_val = latest_vwlm.get("rsi")
    close_val = latest_vwlm.get("close")
    atr_val = latest_vwlm.get("atr")
    median_42 = latest_vb.get("median_42")

    vwlm_signal = bool(latest_vwlm.get("signal", False))
    vb_signal = bool(latest_vb.get("signal", False))

    if pd.notna(ema_fast) and pd.notna(ema_slow) and pd.notna(adx_val):
        if ema_fast > ema_slow and adx_val > 10:
            vwlm_reason = "EMA fast is above EMA slow and ADX is strong."
        elif ema_fast <= ema_slow:
            vwlm_reason = "EMA fast is not above EMA slow."
        else:
            vwlm_reason = "ADX is too weak."
    else:
        vwlm_reason = "Not enough data to evaluate VWLM."

    if pd.notna(close_val) and pd.notna(median_42):
        if close_val > median_42:
            vb_reason = "Close is above median_42."
        else:
            vb_reason = "Close is below median_42."
    else:
        vb_reason = "Not enough data to evaluate breakout."

    summary = {
        "symbol": symbol,
        "ts": clean_value(latest_vwlm.get("ts")),
        "close": clean_value(close_val),
        "ema_fast": clean_value(ema_fast),
        "ema_slow": clean_value(ema_slow),
        "adx": clean_value(adx_val),
        "atr": clean_value(atr_val),
        "rsi": clean_value(rsi_val),
        "median_42": clean_value(median_42),
        "vwlm_signal": vwlm_signal,
        "vb_signal": vb_signal,
        "vwlm_reason": vwlm_reason,
        "vb_reason": vb_reason,
    }

    return JSONResponse(content=summary)


@app.get("/api/scan")
def scan_market(top_n: int = 10):
    # Use a subset of symbols for faster scanning
    symbols_to_scan = TEST_SYMBOLS[:min(30, len(TEST_SYMBOLS))]
    signals, ranked = run_engine(symbols_to_scan)

    if ranked.empty:
        return JSONResponse(content={
            "status": "success",
            "universe_count": len(TEST_SYMBOLS),
            "signals_count": 0,
            "returned_count": 0,
            "results": []
        })

    preferred_cols = [
        "ts",
        "tradingsymbol",
        "strategy",
        "close",
        "ema_fast",
        "ema_slow",
        "adx",
        "atr",
        "rsi",
        "median_42",
        "signal",
        "score",
        "entry",
        "sl",
        "target",
        "rr",
        "shares",
        "position_value",
        "max_loss_if_sl",
        "max_profit_if_target",
    ]

    available_cols = [c for c in preferred_cols if c in ranked.columns]
    out = ranked[available_cols].copy().head(top_n)
    out = convert_signal_to_int(out)

    return JSONResponse(content={
        "status": "success",
        "universe_count": len(TEST_SYMBOLS),
        "signals_count": int(len(ranked)),
        "returned_count": int(len(out)),
        "results": clean_records(out)
    })


@app.get("/api/config")
def get_config():
    """Get current configuration (no secrets exposed)."""
    return {
        "demo_mode": os.environ.get('DEMO_MODE', 'true').lower() == 'true',
        "data_provider": os.environ.get('DATA_PROVIDER', 'sample'),
        "zerodha_configured": bool(os.environ.get('ZERODHA_API_KEY')),
        "universe_size": len(TEST_SYMBOLS),
        "output_dir": str(OUTPUT_DIR)
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
