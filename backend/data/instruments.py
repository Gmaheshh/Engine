from pathlib import Path
import pandas as pd

from backend.data.zerodha_client import get_kite

DATA_DIR = Path(__file__).resolve().parent
INSTRUMENTS_CSV = DATA_DIR / "instruments_nse.csv"


def download_nse_instruments() -> pd.DataFrame:
    kite = get_kite()
    instruments = kite.instruments("NSE")
    df = pd.DataFrame(instruments)

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    df.to_csv(INSTRUMENTS_CSV, index=False)
    return df


def load_instruments_df(force_refresh: bool = False) -> pd.DataFrame:
    if force_refresh or not INSTRUMENTS_CSV.exists():
        return download_nse_instruments()

    return pd.read_csv(INSTRUMENTS_CSV)


def get_instrument_token(symbol: str, exchange: str = "NSE") -> int:
    symbol = symbol.strip().upper()

    df = load_instruments_df().copy()
    df["tradingsymbol"] = df["tradingsymbol"].astype(str).str.strip().str.upper()

    match = df[
        (df["tradingsymbol"] == symbol) &
        (df["exchange"] == exchange)
    ]

    if match.empty:
        raise ValueError(f"Instrument token not found for symbol={symbol} exchange={exchange}")

    return int(match.iloc[0]["instrument_token"])
