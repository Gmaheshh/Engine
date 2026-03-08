import pandas as pd

from backend.data.sample_data import generate_sample_ohlcv
from backend.data.instruments import get_instrument_token
from backend.indicators.ema import ema
from backend.indicators.adx import adx

# Use sample data mode for market regime too
USE_SAMPLE_DATA = True


def fetch_nifty_regime(days: int = 1500) -> pd.DataFrame:
    """Fetch NIFTY market regime data. Uses sample data for local development."""
    
    # Generate sample NIFTY data
    df = _generate_nifty_sample(days)
    
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


def _generate_nifty_sample(days: int) -> pd.DataFrame:
    """Generate sample NIFTY index data."""
    import numpy as np
    
    np.random.seed(42)  # Consistent NIFTY data
    
    dates = pd.date_range(end=pd.Timestamp.now(), periods=days, freq="D")
    
    # NIFTY typically ranges 15000-25000
    base_price = 18000
    returns = np.random.normal(0.0004, 0.012, days)  # Slight upward drift
    prices = base_price * np.exp(np.cumsum(returns))
    
    close = pd.Series(prices)
    open_ = close.shift(1).fillna(close.iloc[0]) * (1 + np.random.normal(0, 0.003, days))
    high = np.maximum(open_, close) * (1 + np.abs(np.random.normal(0.003, 0.002, days)))
    low = np.minimum(open_, close) * (1 - np.abs(np.random.normal(0.003, 0.002, days)))
    volume = np.random.randint(500000000, 1000000000, days)
    
    df = pd.DataFrame({
        "ts": dates,
        "open": open_.values,
        "high": high.values,
        "low": low.values,
        "close": close.values,
        "volume": volume,
    })
    
    return df.reset_index(drop=True)


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
