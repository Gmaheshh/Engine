import pandas as pd

from backend.indicators.ema import ema
from backend.indicators.atr import atr
from backend.indicators.adx import adx
from backend.indicators.rsi import rsi
from backend.indicators.rolling_stats import rolling_mean


def run_vwlm(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()

    out["ema_fast"] = ema(out["close"], 18)
    out["ema_slow"] = ema(out["close"], 42)
    out["atr"] = atr(out, 20)
    out["adx"] = adx(out, 20)
    out["rsi"] = rsi(out["close"], 14)
    out["vol_ma"] = rolling_mean(out["volume"], 20)

    out["prev_high"] = out["high"].shift(1)

    out["ema_bull"] = out["ema_fast"] > out["ema_slow"]
    out["price_breakout"] = out["close"] > out["prev_high"]
    out["volume_confirm"] = out["volume"] > (out["vol_ma"] * 1.05)
    out["trend_confirm"] = out["adx"] > 20
    out["momentum_confirm"] = out["rsi"] > 50

    out["atr_pct"] = out["atr"] / out["close"]
    out["volatility_confirm"] = out["atr_pct"] > 0.003

    out["signal"] = (
        out["ema_bull"] &
        out["price_breakout"] &
        out["volume_confirm"] &
        out["trend_confirm"] &
        out["momentum_confirm"] &
        out["volatility_confirm"]
    )

    out["strategy"] = "VWLM"

    return out
