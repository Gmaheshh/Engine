import numpy as np
import pandas as pd


def generate_sample_ohlcv(symbol: str, periods: int = 250) -> pd.DataFrame:
    np.random.seed(abs(hash(symbol)) % (2**32))

    dates = pd.date_range(end=pd.Timestamp.now(), periods=periods, freq="4h")
    base = 100 + np.cumsum(np.random.normal(0.2, 1.5, periods))

    close = pd.Series(base)
    open_ = close.shift(1).fillna(close.iloc[0]) + np.random.normal(0, 0.8, periods)
    high = np.maximum(open_, close) + np.abs(np.random.normal(1.2, 0.5, periods))
    low = np.minimum(open_, close) - np.abs(np.random.normal(1.2, 0.5, periods))
    volume = np.random.randint(10000, 200000, periods)

    df = pd.DataFrame({
        "ts": dates,
        "tradingsymbol": symbol,
        "open": open_.values,
        "high": high.values,
        "low": low.values,
        "close": close.values,
        "volume": volume,
        "interval": "4hour",
    })

    return df.reset_index(drop=True)
