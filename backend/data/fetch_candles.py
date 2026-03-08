import pandas as pd
from datetime import datetime, timedelta

# Try to use Zerodha if available, otherwise fall back to sample data
USE_SAMPLE_DATA = True  # Set to False if you have valid Zerodha credentials

try:
    from backend.data.zerodha_client import get_kite
    # Test if we can connect
    _test_kite = get_kite()
    USE_SAMPLE_DATA = False
except Exception:
    USE_SAMPLE_DATA = True

from backend.data.sample_data import generate_sample_ohlcv


def fetch_daily_candles(instrument_token: int, days: int = 1500, symbol: str = None) -> pd.DataFrame:
    """Fetch daily candles - uses sample data if Zerodha is unavailable."""
    
    if USE_SAMPLE_DATA:
        return _generate_daily_sample(symbol or str(instrument_token), days)
    
    try:
        kite = get_kite()
        to_date = datetime.now()
        from_date = to_date - timedelta(days=days)

        candles = kite.historical_data(
            instrument_token=instrument_token,
            from_date=from_date,
            to_date=to_date,
            interval="day",
            continuous=False,
            oi=False
        )

        df = pd.DataFrame(candles)

        if df.empty:
            return _generate_daily_sample(symbol or str(instrument_token), days)

        df = df.rename(columns={"date": "ts"})
        df["ts"] = pd.to_datetime(df["ts"])

        keep_cols = ["ts", "open", "high", "low", "close", "volume"]
        return df[keep_cols].copy()
    except Exception as e:
        print(f"Zerodha API error, falling back to sample data: {e}")
        return _generate_daily_sample(symbol or str(instrument_token), days)


def fetch_4h_candles(instrument_token: int, days: int = 180, symbol: str = None) -> pd.DataFrame:
    """Fetch 4-hour candles - uses sample data if Zerodha is unavailable."""
    
    if USE_SAMPLE_DATA:
        return generate_sample_ohlcv(symbol or str(instrument_token), periods=days * 6)
    
    try:
        kite = get_kite()
        to_date = datetime.now()
        from_date = to_date - timedelta(days=days)

        candles = kite.historical_data(
            instrument_token=instrument_token,
            from_date=from_date,
            to_date=to_date,
            interval="60minute",
            continuous=False,
            oi=False
        )

        df = pd.DataFrame(candles)

        if df.empty:
            return generate_sample_ohlcv(symbol or str(instrument_token), periods=days * 6)

        df = df.rename(columns={"date": "ts"})
        df["ts"] = pd.to_datetime(df["ts"])

        df = df[["ts", "open", "high", "low", "close", "volume"]].copy()
        df = df.set_index("ts").sort_index()

        df_4h = df.resample("4h").agg({
            "open": "first",
            "high": "max",
            "low": "min",
            "close": "last",
            "volume": "sum"
        })

        return df_4h.dropna().reset_index()
    except Exception as e:
        print(f"Zerodha API error, falling back to sample data: {e}")
        return generate_sample_ohlcv(symbol or str(instrument_token), periods=days * 6)


def _generate_daily_sample(symbol: str, days: int) -> pd.DataFrame:
    """Generate sample daily OHLCV data."""
    import numpy as np
    
    np.random.seed(abs(hash(symbol)) % (2**32))
    
    dates = pd.date_range(end=pd.Timestamp.now(), periods=days, freq="D")
    
    # Start with a base price that varies by symbol
    base_price = 500 + (abs(hash(symbol)) % 2000)
    returns = np.random.normal(0.0003, 0.02, days)
    prices = base_price * np.exp(np.cumsum(returns))
    
    close = pd.Series(prices)
    open_ = close.shift(1).fillna(close.iloc[0]) * (1 + np.random.normal(0, 0.005, days))
    high = np.maximum(open_, close) * (1 + np.abs(np.random.normal(0.005, 0.003, days)))
    low = np.minimum(open_, close) * (1 - np.abs(np.random.normal(0.005, 0.003, days)))
    volume = np.random.randint(100000, 5000000, days)
    
    df = pd.DataFrame({
        "ts": dates,
        "open": open_.values,
        "high": high.values,
        "low": low.values,
        "close": close.values,
        "volume": volume,
    })
    
    return df.reset_index(drop=True)
