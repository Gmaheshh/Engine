import pandas as pd

from backend.indicators.atr import atr
from backend.indicators.adx import adx
from backend.indicators.rsi import rsi
from backend.indicators.ema import ema
from backend.indicators.rolling_stats import rolling_mean, rolling_median


def run_volatility_breakout(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()

    out["atr"] = atr(out, 20)
    out["adx"] = adx(out, 20)
    out["rsi"] = rsi(out["close"], 14)

    out["ema_fast"] = ema(out["close"], 18)
    out["ema_slow"] = ema(out["close"], 42)
    out["vol_ma_20"] = rolling_mean(out["volume"], 20)
    
    # Add median_42 for debug endpoint
    out["median_42"] = rolling_median(out["close"], 42)

    out["hh_20"] = out["high"].shift(1).rolling(20).max()

    out["range_10"] = out["high"].shift(1).rolling(10).max() - out["low"].shift(1).rolling(10).min()
    out["atr_mean_10"] = out["atr"].shift(1).rolling(10).mean()

    out["atr_pct"] = out["atr"] / out["close"]

    out["trend_up"] = (
        (out["ema_fast"] > out["ema_slow"]) &
        (out["close"] > out["ema_fast"])
    )

    out["trend_strength"] = out["adx"] > 20
    out["momentum_confirm"] = out["rsi"] > 52
    out["breakout_20"] = out["close"] > out["hh_20"]
    out["volume_expansion"] = out["volume"] > (out["vol_ma_20"] * 1.15)
    out["volatility_confirm"] = out["atr_pct"] > 0.004
    out["compression_confirm"] = out["range_10"] < (out["atr_mean_10"] * 10)

    candle_range = (out["high"] - out["low"]).replace(0, pd.NA)
    out["close_strength"] = (out["close"] - out["low"]) / candle_range
    out["close_strength_confirm"] = out["close_strength"] > 0.55

    out["prev_close"] = out["close"].shift(1)
    out["gap_pct"] = (out["open"] - out["prev_close"]).abs() / out["prev_close"]
    out["gap_ok"] = out["gap_pct"] < 0.04

    if "regime_bull" not in out.columns:
        out["regime_bull"] = True

    if "rs_filter" not in out.columns:
        out["rs_filter"] = True

    out["signal"] = (
        out["regime_bull"] &
        out["rs_filter"] &
        out["trend_up"] &
        out["trend_strength"] &
        out["momentum_confirm"] &
        out["breakout_20"] &
        out["volume_expansion"] &
        out["volatility_confirm"] &
        out["compression_confirm"] &
        out["close_strength_confirm"] &
        out["gap_ok"]
    )

    out["strategy"] = "VOLATILITY_BREAKOUT_PRO"

    return out
