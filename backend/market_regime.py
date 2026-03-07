import pandas as pd

from backend.data.fetch_candles import fetch_daily_candles
from backend.data.instruments import get_instrument_token
from backend.indicators.ema import ema
from backend.indicators.adx import adx


NIFTY_SYMBOL_CANDIDATES = ["NIFTY 50", "NIFTY", "NIFTY50"]


def fetch_nifty_regime(days: int = 1500) -> pd.DataFrame:
    token = None
    last_error = None

    for sym in NIFTY_SYMBOL_CANDIDATES:
        try:
            token = get_instrument_token(sym)
            break
        except Exception as e:
            last_error = e

    if token is None:
        raise ValueError(f"Could not find NIFTY instrument token. Last error: {last_error}")

    df = fetch_daily_candles(token, days=days)

    if df.empty:
        raise ValueError("No NIFTY candle data returned")

    df = df.copy()
    df["ema_50"] = ema(df["close"], 50)
    df["ema_200"] = ema(df["close"], 200)
    df["adx"] = adx(df, 20)
    df["nifty_return_20"] = df["close"].pct_change(20)

    df["regime_bull"] = (
        (df["close"] > df["ema_200"]) &
        (df["ema_50"] > df["ema_200"]) &
        (df["adx"] > 20)
    )

    return df[["ts", "close", "ema_50", "ema_200", "adx", "nifty_return_20", "regime_bull"]].copy()


def merge_relative_strength(stock_df: pd.DataFrame, regime_df: pd.DataFrame) -> pd.DataFrame:
    out = stock_df.copy()
    out["ts"] = pd.to_datetime(out["ts"])

    regime_df = regime_df.copy()
    regime_df["ts"] = pd.to_datetime(regime_df["ts"])

    out["stock_return_20"] = out["close"].pct_change(20)

    merged = pd.merge(
        out,
        regime_df[["ts", "regime_bull", "nifty_return_20"]],
        on="ts",
        how="left"
    )

    merged["regime_bull"] = merged["regime_bull"].fillna(False)
    merged["rs_filter"] = merged["stock_return_20"] > merged["nifty_return_20"]

    return merged
