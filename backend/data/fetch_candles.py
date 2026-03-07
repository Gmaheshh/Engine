import pandas as pd
from datetime import datetime, timedelta

from backend.data.zerodha_client import get_kite


def fetch_daily_candles(instrument_token: int, days: int = 1500) -> pd.DataFrame:
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
        return pd.DataFrame(columns=["ts", "open", "high", "low", "close", "volume"])

    df = df.rename(columns={"date": "ts"})
    df["ts"] = pd.to_datetime(df["ts"])

    keep_cols = ["ts", "open", "high", "low", "close", "volume"]
    return df[keep_cols].copy()


def fetch_4h_candles(instrument_token: int, days: int = 180) -> pd.DataFrame:
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
        return pd.DataFrame(columns=["ts", "open", "high", "low", "close", "volume"])

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
