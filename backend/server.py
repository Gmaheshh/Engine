import sys
import os
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional, Dict, Any

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / '.env')

# Ensure the parent directory is in path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import math
import pandas as pd
import numpy as np
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
import io

from backend.config import OUTPUT_DIR
from backend.engine.signal_runner import run_engine
from backend.data.instruments import download_nse_instruments, get_instrument_token
from backend.data.universe import TEST_SYMBOLS

app = FastAPI(title="PRA-GATI Backend", version="2.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# GLOBAL STATE TRACKING
# =============================================================================

class EngineState:
    last_run: str = None
    last_run_status: str = "never_run"
    processed_count: int = 0
    error_count: int = 0
    signals_generated: int = 0
    last_error: str = None
    last_successful_fetch: str = None
    zerodha_token_valid: bool = None
    zerodha_last_check: str = None
    data_source_used: str = None

engine_state = EngineState()


def get_mode() -> str:
    """Get current operating mode."""
    demo_mode = os.environ.get('DEMO_MODE', 'true').lower() == 'true'
    return "demo" if demo_mode else "live"


def is_demo_mode() -> bool:
    """Check if running in demo mode."""
    return os.environ.get('DEMO_MODE', 'true').lower() == 'true'


def check_zerodha_credentials() -> Dict[str, Any]:
    """Check if Zerodha credentials are configured and valid."""
    api_key = os.environ.get('ZERODHA_API_KEY')
    access_token = os.environ.get('ZERODHA_ACCESS_TOKEN')
    
    result = {
        "configured": bool(api_key and access_token),
        "api_key_present": bool(api_key),
        "access_token_present": bool(access_token),
        "token_valid": None,
        "error": None
    }
    
    if not result["configured"]:
        result["error"] = "Zerodha credentials not configured in environment"
        return result
    
    # Try to validate token by making a simple API call
    try:
        from kiteconnect import KiteConnect
        kite = KiteConnect(api_key=api_key)
        kite.set_access_token(access_token)
        
        # Try to get profile - this validates the token
        profile = kite.profile()
        result["token_valid"] = True
        result["user_id"] = profile.get("user_id")
        engine_state.zerodha_token_valid = True
        engine_state.zerodha_last_check = datetime.now(timezone.utc).isoformat()
    except Exception as e:
        result["token_valid"] = False
        result["error"] = str(e)
        engine_state.zerodha_token_valid = False
        engine_state.zerodha_last_check = datetime.now(timezone.utc).isoformat()
    
    return result


def create_response_metadata(
    data_source: str,
    fallback_used: bool = False,
    error: str = None
) -> Dict[str, Any]:
    """Create standard response metadata."""
    return {
        "mode": get_mode(),
        "data_source": data_source,
        "fallback_used": fallback_used,
        "token_valid": engine_state.zerodha_token_valid,
        "last_error": error,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


# =============================================================================
# DATA FETCHING WITH EXPLICIT ERROR HANDLING
# =============================================================================

def fetch_candles_strict(symbol: str, days: int = 90) -> Dict[str, Any]:
    """
    Fetch candles with STRICT mode handling.
    In live mode: fails explicitly if Zerodha unavailable.
    In demo mode: uses sample data.
    """
    from backend.data.sample_data import generate_sample_ohlcv
    from backend.data.instruments import get_instrument_token
    
    result = {
        "success": False,
        "data": None,
        "data_source": None,
        "error": None
    }
    
    # DEMO MODE: Use sample data
    if is_demo_mode():
        try:
            df = generate_sample_ohlcv(symbol, periods=days * 6)
            result["success"] = True
            result["data"] = df
            result["data_source"] = "sample_data"
            return result
        except Exception as e:
            result["error"] = f"Sample data generation failed: {str(e)}"
            return result
    
    # LIVE MODE: Must use Zerodha, fail explicitly if unavailable
    api_key = os.environ.get('ZERODHA_API_KEY')
    access_token = os.environ.get('ZERODHA_ACCESS_TOKEN')
    
    if not api_key or not access_token:
        result["error"] = "LIVE_MODE_ERROR: Zerodha credentials not configured. Set ZERODHA_API_KEY and ZERODHA_ACCESS_TOKEN in .env"
        engine_state.zerodha_token_valid = False
        return result
    
    try:
        from kiteconnect import KiteConnect
        from datetime import timedelta
        
        kite = KiteConnect(api_key=api_key)
        kite.set_access_token(access_token)
        
        token = get_instrument_token(symbol)
        to_date = datetime.now()
        from_date = to_date - timedelta(days=days)
        
        candles = kite.historical_data(
            instrument_token=token,
            from_date=from_date,
            to_date=to_date,
            interval="60minute",
            continuous=False,
            oi=False
        )
        
        df = pd.DataFrame(candles)
        
        if df.empty:
            result["error"] = f"LIVE_MODE_ERROR: No data returned from Zerodha for {symbol}"
            return result
        
        df = df.rename(columns={"date": "ts"})
        df["ts"] = pd.to_datetime(df["ts"])
        df = df[["ts", "open", "high", "low", "close", "volume"]].copy()
        df = df.set_index("ts").sort_index()
        
        # Resample to 4-hour
        df_4h = df.resample("4h").agg({
            "open": "first",
            "high": "max",
            "low": "min",
            "close": "last",
            "volume": "sum"
        })
        
        result["success"] = True
        result["data"] = df_4h.dropna().reset_index()
        result["data_source"] = "zerodha_live"
        
        engine_state.zerodha_token_valid = True
        engine_state.last_successful_fetch = datetime.now(timezone.utc).isoformat()
        
        return result
        
    except Exception as e:
        error_msg = str(e)
        if "TokenException" in error_msg or "InvalidToken" in error_msg or "token" in error_msg.lower():
            result["error"] = f"LIVE_MODE_ERROR: Zerodha access token invalid or expired. Please refresh token. Details: {error_msg}"
            engine_state.zerodha_token_valid = False
        else:
            result["error"] = f"LIVE_MODE_ERROR: Zerodha API call failed: {error_msg}"
        
        engine_state.last_error = result["error"]
        return result


def run_engine_strict(symbols: list) -> Dict[str, Any]:
    """
    Run signal engine with STRICT mode handling.
    In live mode: fails explicitly if any Zerodha call fails.
    In demo mode: uses sample data throughout.
    """
    result = {
        "success": False,
        "signals": pd.DataFrame(),
        "ranked": pd.DataFrame(),
        "data_source": None,
        "processed_count": 0,
        "error_count": 0,
        "errors": [],
        "error": None
    }
    
    # DEMO MODE: Use the existing engine with sample data
    if is_demo_mode():
        try:
            signals, ranked = run_engine(symbols)
            result["success"] = True
            result["signals"] = signals
            result["ranked"] = ranked
            result["data_source"] = "sample_data"
            result["processed_count"] = len(symbols)
            return result
        except Exception as e:
            result["error"] = f"Demo engine failed: {str(e)}"
            return result
    
    # LIVE MODE: Strict Zerodha usage
    api_key = os.environ.get('ZERODHA_API_KEY')
    access_token = os.environ.get('ZERODHA_ACCESS_TOKEN')
    
    if not api_key or not access_token:
        result["error"] = "LIVE_MODE_ERROR: Zerodha credentials not configured"
        return result
    
    # First validate token
    cred_check = check_zerodha_credentials()
    if not cred_check["token_valid"]:
        result["error"] = f"LIVE_MODE_ERROR: Zerodha token invalid - {cred_check['error']}"
        return result
    
    # Run engine with Zerodha data
    try:
        signals, ranked = run_engine(symbols)
        result["success"] = True
        result["signals"] = signals
        result["ranked"] = ranked
        result["data_source"] = "zerodha_live"
        result["processed_count"] = len(symbols)
        engine_state.last_successful_fetch = datetime.now(timezone.utc).isoformat()
        return result
    except Exception as e:
        error_msg = str(e)
        if "token" in error_msg.lower():
            result["error"] = f"LIVE_MODE_ERROR: Zerodha token issue - {error_msg}"
            engine_state.zerodha_token_valid = False
        else:
            result["error"] = f"LIVE_MODE_ERROR: Engine failed - {error_msg}"
        return result


# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

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
    out = df.copy()
    if "signal" in out.columns:
        out["signal"] = out["signal"].apply(lambda x: 1 if bool(x) else 0)
    if "vb_signal" in out.columns:
        out["vb_signal"] = out["vb_signal"].apply(lambda x: 1 if bool(x) else 0)
    return out


def df_to_csv_response(df: pd.DataFrame, filename: str) -> StreamingResponse:
    """Convert DataFrame to CSV download response."""
    buffer = io.StringIO()
    df.to_csv(buffer, index=False)
    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# =============================================================================
# API ENDPOINTS
# =============================================================================

@app.get("/api/health")
def health():
    """Health check with full status metadata."""
    cred_status = check_zerodha_credentials()
    
    return {
        "status": "ok",
        "meta": create_response_metadata(
            data_source="system",
            fallback_used=False
        ),
        "mode": get_mode(),
        "demo_mode": is_demo_mode(),
        "data_provider": os.environ.get('DATA_PROVIDER', 'unknown'),
        "engine_status": engine_state.last_run_status,
        "last_run": engine_state.last_run,
        "zerodha": {
            "configured": cred_status["configured"],
            "token_valid": cred_status["token_valid"],
            "last_check": engine_state.zerodha_last_check,
            "last_successful_fetch": engine_state.last_successful_fetch,
            "error": cred_status["error"]
        }
    }


@app.get("/api/zerodha/status")
def zerodha_status():
    """Detailed Zerodha authentication status."""
    cred_status = check_zerodha_credentials()
    
    return {
        "meta": create_response_metadata(
            data_source="zerodha_auth_check",
            fallback_used=False,
            error=cred_status["error"]
        ),
        "configured": cred_status["configured"],
        "api_key_present": cred_status["api_key_present"],
        "access_token_present": cred_status["access_token_present"],
        "token_valid": cred_status["token_valid"],
        "user_id": cred_status.get("user_id"),
        "last_check": engine_state.zerodha_last_check,
        "last_successful_fetch": engine_state.last_successful_fetch,
        "error": cred_status["error"]
    }


@app.get("/api/config")
def get_config():
    """Get current configuration (no secrets exposed)."""
    return {
        "meta": create_response_metadata(data_source="config"),
        "mode": get_mode(),
        "demo_mode": is_demo_mode(),
        "data_provider": os.environ.get('DATA_PROVIDER', 'unknown'),
        "zerodha_configured": bool(os.environ.get('ZERODHA_API_KEY')),
        "universe_size": len(TEST_SYMBOLS),
        "output_dir": str(OUTPUT_DIR)
    }


@app.get("/api/debug/status")
def debug_status():
    """Detailed debug status with explicit data source info."""
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
    
    cred_status = check_zerodha_credentials()
    
    return {
        "status": "ok",
        "meta": create_response_metadata(
            data_source="system_state",
            fallback_used=False
        ),
        "engine": {
            "last_run": engine_state.last_run,
            "last_run_status": engine_state.last_run_status,
            "processed_count": engine_state.processed_count,
            "error_count": engine_state.error_count,
            "signals_generated": engine_state.signals_generated,
            "last_error": engine_state.last_error,
            "data_source_used": engine_state.data_source_used
        },
        "data": {
            "signals_file_exists": signals_path.exists(),
            "signals_count": signals_count,
            "ranked_file_exists": ranked_path.exists(),
            "ranked_count": ranked_count
        },
        "config": {
            "mode": get_mode(),
            "demo_mode": is_demo_mode(),
            "data_provider": os.environ.get('DATA_PROVIDER', 'unknown'),
            "universe_size": len(TEST_SYMBOLS)
        },
        "zerodha": {
            "configured": cred_status["configured"],
            "token_valid": cred_status["token_valid"],
            "last_check": engine_state.zerodha_last_check,
            "last_successful_fetch": engine_state.last_successful_fetch,
            "error": cred_status["error"]
        },
        "routes": {
            "/api/health": "ok",
            "/api/signals": "ok",
            "/api/signals/ranked": "ok",
            "/api/universe": "ok",
            "/api/scan": "ok",
            "/api/run": "ok",
            "/api/debug/{symbol}": "ok",
            "/api/debug/{symbol}/summary": "ok",
            "/api/export/signals": "ok",
            "/api/export/ranked": "ok"
        }
    }


@app.get("/api/universe")
def get_universe():
    return {
        "meta": create_response_metadata(data_source="static_config"),
        "count": len(TEST_SYMBOLS),
        "symbols": TEST_SYMBOLS
    }


@app.get("/api/run")
def run_signals():
    """Run the signal engine with explicit mode handling."""
    global engine_state
    
    engine_state.last_run = datetime.now(timezone.utc).isoformat()
    engine_state.last_run_status = "running"
    engine_state.error_count = 0
    
    symbols_to_process = TEST_SYMBOLS[:20]
    engine_state.processed_count = len(symbols_to_process)
    
    result = run_engine_strict(symbols_to_process)
    
    if not result["success"]:
        engine_state.last_run_status = "error"
        engine_state.last_error = result["error"]
        engine_state.data_source_used = None
        
        return JSONResponse(
            status_code=503,
            content={
                "status": "error",
                "meta": create_response_metadata(
                    data_source="none",
                    fallback_used=False,
                    error=result["error"]
                ),
                "error": result["error"],
                "signals_count": 0,
                "ranked_count": 0
            }
        )
    
    engine_state.signals_generated = len(result["signals"]) if not result["signals"].empty else 0
    engine_state.last_run_status = "success"
    engine_state.last_error = None
    engine_state.data_source_used = result["data_source"]
    
    return {
        "status": "success",
        "meta": create_response_metadata(
            data_source=result["data_source"],
            fallback_used=False
        ),
        "signals_count": int(len(result["signals"])),
        "ranked_count": int(len(result["ranked"]))
    }


@app.get("/api/signals")
def get_signals():
    """Get signals with explicit data source metadata."""
    path = OUTPUT_DIR / "signals_latest.csv"
    
    if not path.exists() or path.stat().st_size <= 1:
        # Try to generate signals
        result = run_engine_strict(TEST_SYMBOLS[:20])
        
        if not result["success"]:
            return JSONResponse(
                status_code=503,
                content={
                    "meta": create_response_metadata(
                        data_source="none",
                        fallback_used=False,
                        error=result["error"]
                    ),
                    "error": result["error"],
                    "signals": []
                }
            )
    
    try:
        df = pd.read_csv(path)
        if df.empty:
            return {
                "meta": create_response_metadata(
                    data_source=engine_state.data_source_used or "unknown"
                ),
                "signals": []
            }
        df = convert_signal_to_int(df)
        return {
            "meta": create_response_metadata(
                data_source=engine_state.data_source_used or "file_cache"
            ),
            "signals": clean_records(df)
        }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "meta": create_response_metadata(
                    data_source="none",
                    error=str(e)
                ),
                "error": str(e),
                "signals": []
            }
        )


@app.get("/api/signals/ranked")
def get_ranked_signals():
    """Get ranked signals with explicit data source metadata."""
    path = OUTPUT_DIR / "ranked_signals.csv"
    
    if not path.exists() or path.stat().st_size <= 1:
        result = run_engine_strict(TEST_SYMBOLS[:20])
        
        if not result["success"]:
            return JSONResponse(
                status_code=503,
                content={
                    "meta": create_response_metadata(
                        data_source="none",
                        fallback_used=False,
                        error=result["error"]
                    ),
                    "error": result["error"],
                    "signals": []
                }
            )
    
    try:
        df = pd.read_csv(path)
        if df.empty:
            return {
                "meta": create_response_metadata(
                    data_source=engine_state.data_source_used or "unknown"
                ),
                "signals": []
            }
        df = convert_signal_to_int(df)
        return {
            "meta": create_response_metadata(
                data_source=engine_state.data_source_used or "file_cache"
            ),
            "signals": clean_records(df)
        }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "meta": create_response_metadata(
                    data_source="none",
                    error=str(e)
                ),
                "error": str(e),
                "signals": []
            }
        )


@app.get("/api/debug/{symbol}")
def debug_symbol(symbol: str):
    """Debug symbol with explicit data source."""
    symbol = symbol.upper()
    
    result = fetch_candles_strict(symbol, days=90)
    
    if not result["success"]:
        return JSONResponse(
            status_code=503,
            content={
                "meta": create_response_metadata(
                    data_source="none",
                    fallback_used=False,
                    error=result["error"]
                ),
                "error": result["error"],
                "data": []
            }
        )
    
    df = result["data"]
    df["tradingsymbol"] = symbol
    df["interval"] = "4hour"
    
    from backend.strategies.strategy_vwlm import run_vwlm
    from backend.strategies.strategy_volatility_breakout import run_volatility_breakout
    
    vwlm_df = run_vwlm(df)
    vb_df = run_volatility_breakout(df)
    
    debug_df = vwlm_df.copy()
    debug_df["vb_signal"] = vb_df["signal"]
    
    if "median_42" in vb_df.columns:
        debug_df["median_42"] = vb_df["median_42"]
    
    cols = [
        "ts", "tradingsymbol", "open", "high", "low", "close", "volume",
        "ema_fast", "ema_slow", "atr", "adx", "rsi", "signal", "vb_signal", "median_42"
    ]
    
    available_cols = [c for c in cols if c in debug_df.columns]
    out = debug_df[available_cols].tail(10).copy()
    out = convert_signal_to_int(out)
    
    return {
        "meta": create_response_metadata(
            data_source=result["data_source"],
            fallback_used=False
        ),
        "symbol": symbol,
        "data": clean_records(out)
    }


@app.get("/api/debug/{symbol}/summary")
def debug_symbol_summary(symbol: str):
    """Debug symbol summary with explicit data source."""
    symbol = symbol.upper()
    
    result = fetch_candles_strict(symbol, days=90)
    
    if not result["success"]:
        return JSONResponse(
            status_code=503,
            content={
                "meta": create_response_metadata(
                    data_source="none",
                    fallback_used=False,
                    error=result["error"]
                ),
                "error": result["error"]
            }
        )
    
    df = result["data"]
    df["tradingsymbol"] = symbol
    df["interval"] = "4hour"
    
    from backend.strategies.strategy_vwlm import run_vwlm
    from backend.strategies.strategy_volatility_breakout import run_volatility_breakout
    
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
    
    return {
        "meta": create_response_metadata(
            data_source=result["data_source"],
            fallback_used=False
        ),
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
        "vb_reason": vb_reason
    }


@app.get("/api/scan")
def scan_market(top_n: int = Query(default=10, ge=1, le=100)):
    """Scan market with explicit data source."""
    symbols_to_scan = TEST_SYMBOLS[:min(30, len(TEST_SYMBOLS))]
    
    result = run_engine_strict(symbols_to_scan)
    
    if not result["success"]:
        return JSONResponse(
            status_code=503,
            content={
                "status": "error",
                "meta": create_response_metadata(
                    data_source="none",
                    fallback_used=False,
                    error=result["error"]
                ),
                "error": result["error"],
                "universe_count": len(TEST_SYMBOLS),
                "signals_count": 0,
                "returned_count": 0,
                "results": []
            }
        )
    
    ranked = result["ranked"]
    
    if ranked.empty:
        return {
            "status": "success",
            "meta": create_response_metadata(
                data_source=result["data_source"],
                fallback_used=False
            ),
            "universe_count": len(TEST_SYMBOLS),
            "signals_count": 0,
            "returned_count": 0,
            "results": []
        }
    
    preferred_cols = [
        "ts", "tradingsymbol", "strategy", "close", "ema_fast", "ema_slow",
        "adx", "atr", "rsi", "median_42", "signal", "score", "entry", "sl",
        "target", "rr", "shares", "position_value", "max_loss_if_sl", "max_profit_if_target"
    ]
    
    available_cols = [c for c in preferred_cols if c in ranked.columns]
    out = ranked[available_cols].copy().head(top_n)
    out = convert_signal_to_int(out)
    
    return {
        "status": "success",
        "meta": create_response_metadata(
            data_source=result["data_source"],
            fallback_used=False
        ),
        "universe_count": len(TEST_SYMBOLS),
        "signals_count": int(len(ranked)),
        "returned_count": int(len(out)),
        "results": clean_records(out)
    }


# =============================================================================
# CSV EXPORT ENDPOINTS
# =============================================================================

@app.get("/api/export/signals")
def export_signals_csv():
    """Export signals as CSV file."""
    path = OUTPUT_DIR / "signals_latest.csv"
    
    if not path.exists() or path.stat().st_size <= 1:
        return JSONResponse(
            status_code=404,
            content={
                "error": "No signals data available. Run the engine first.",
                "meta": create_response_metadata(data_source="none")
            }
        )
    
    try:
        df = pd.read_csv(path)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        return df_to_csv_response(df, f"pragati_signals_{timestamp}.csv")
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )


@app.get("/api/export/ranked")
def export_ranked_csv():
    """Export ranked signals as CSV file."""
    path = OUTPUT_DIR / "ranked_signals.csv"
    
    if not path.exists() or path.stat().st_size <= 1:
        return JSONResponse(
            status_code=404,
            content={
                "error": "No ranked signals data available. Run the engine first.",
                "meta": create_response_metadata(data_source="none")
            }
        )
    
    try:
        df = pd.read_csv(path)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        return df_to_csv_response(df, f"pragati_ranked_{timestamp}.csv")
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )


@app.get("/api/instruments/refresh")
def refresh_instruments():
    df = download_nse_instruments()
    return {
        "meta": create_response_metadata(data_source="nse_api"),
        "status": "success",
        "rows": int(len(df))
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
