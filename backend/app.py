import math
import pandas as pd
import numpy as np
from fastapi import FastAPI
from fastapi.responses import JSONResponse

from backend.config import OUTPUT_DIR
from backend.engine.signal_runner import run_engine
from backend.data.instruments import download_nse_instruments, get_instrument_token
from backend.data.universe import TEST_SYMBOLS
from backend.data.fetch_candles import fetch_4h_candles
from backend.strategies.strategy_vwlm import run_vwlm
from backend.strategies.strategy_volatility_breakout import run_volatility_breakout

app = FastAPI(title="PRA-GATI Backend", version="1.0")


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
    if isinstance(v, (np.bool_,)):
        return bool(v)
    return v


def clean_records(df: pd.DataFrame):
    if df.empty:
        return []

    records = df.to_dict(orient="records")
    return [{k: clean_value(v) for k, v in row.items()} for row in records]


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/universe")
def get_universe():
    return {
        "count": len(TEST_SYMBOLS),
        "symbols": TEST_SYMBOLS
    }


@app.get("/instruments/refresh")
def refresh_instruments():
    df = download_nse_instruments()
    return {
        "status": "success",
        "rows": int(len(df))
    }


@app.get("/run")
def run_signals():
    signals, ranked = run_engine(TEST_SYMBOLS)
    return {
        "status": "success",
        "signals_count": int(len(signals)),
        "ranked_count": int(len(ranked)),
    }


@app.get("/signals")
def get_signals():
    path = OUTPUT_DIR / "signals_latest.csv"
    if not path.exists():
        return JSONResponse(
            {"error": "No signals file found. Run /run first."},
            status_code=404
        )

    df = pd.read_csv(path)
    return JSONResponse(content=clean_records(df))


@app.get("/signals/ranked")
def get_ranked_signals():
    path = OUTPUT_DIR / "ranked_signals.csv"
    if not path.exists():
        return JSONResponse(
            {"error": "No ranked signals file found. Run /run first."},
            status_code=404
        )

    df = pd.read_csv(path)
    return JSONResponse(content=clean_records(df))


@app.get("/debug/{symbol}")
def debug_symbol(symbol: str):
    symbol = symbol.upper()

    token = get_instrument_token(symbol)
    df = fetch_4h_candles(token, days=90)

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

    return JSONResponse(content=clean_records(out))


@app.get("/debug/{symbol}/summary")
def debug_symbol_summary(symbol: str):
    symbol = symbol.upper()

    token = get_instrument_token(symbol)
    df = fetch_4h_candles(token, days=90)

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


@app.get("/scan")
def scan_market(top_n: int = 10):
    signals, ranked = run_engine(TEST_SYMBOLS)

    if ranked.empty:
        return JSONResponse(content={
            "status": "success",
            "universe_count": len(TEST_SYMBOLS),
            "signals_count": 0,
            "returned_count": 0,
            "results": []
        })

    preferred_cols =[
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

    return JSONResponse(content={
        "status": "success",
        "universe_count": len(TEST_SYMBOLS),
        "signals_count": int(len(ranked)),
        "returned_count": int(len(out)),
        "results": clean_records(out)
    })
