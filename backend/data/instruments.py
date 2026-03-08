from pathlib import Path
import pandas as pd
import hashlib

from backend.data.universe import TEST_SYMBOLS

DATA_DIR = Path(__file__).resolve().parent
INSTRUMENTS_CSV = DATA_DIR / "instruments_nse.csv"

# Fallback: generate pseudo-tokens for sample data mode
USE_SAMPLE_TOKENS = True

try:
    from backend.data.zerodha_client import get_kite
    _test = get_kite()
    USE_SAMPLE_TOKENS = False
except Exception:
    USE_SAMPLE_TOKENS = True


def download_nse_instruments() -> pd.DataFrame:
    """Download NSE instruments from Zerodha, or generate sample if unavailable."""
    if USE_SAMPLE_TOKENS:
        return _generate_sample_instruments()
    
    try:
        kite = get_kite()
        instruments = kite.instruments("NSE")
        df = pd.DataFrame(instruments)

        DATA_DIR.mkdir(parents=True, exist_ok=True)
        df.to_csv(INSTRUMENTS_CSV, index=False)
        return df
    except Exception as e:
        print(f"Failed to download instruments: {e}")
        return _generate_sample_instruments()


def _generate_sample_instruments() -> pd.DataFrame:
    """Generate sample instruments DataFrame for local development."""
    records = []
    for symbol in TEST_SYMBOLS:
        # Generate a consistent pseudo-token from symbol name
        token = int(hashlib.md5(symbol.encode()).hexdigest()[:8], 16) % 10000000
        records.append({
            "instrument_token": token,
            "exchange_token": token // 256,
            "tradingsymbol": symbol,
            "name": symbol,
            "exchange": "NSE",
            "segment": "NSE",
            "instrument_type": "EQ",
            "tick_size": 0.05,
            "lot_size": 1,
        })
    
    df = pd.DataFrame(records)
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    df.to_csv(INSTRUMENTS_CSV, index=False)
    return df


def load_instruments_df(force_refresh: bool = False) -> pd.DataFrame:
    if force_refresh or not INSTRUMENTS_CSV.exists():
        return download_nse_instruments()

    return pd.read_csv(INSTRUMENTS_CSV)


def get_instrument_token(symbol: str, exchange: str = "NSE") -> int:
    """Get instrument token for a symbol. Returns pseudo-token if not found."""
    symbol = symbol.strip().upper()

    try:
        df = load_instruments_df().copy()
        df["tradingsymbol"] = df["tradingsymbol"].astype(str).str.strip().str.upper()

        match = df[
            (df["tradingsymbol"] == symbol) &
            (df["exchange"] == exchange)
        ]

        if not match.empty:
            return int(match.iloc[0]["instrument_token"])
    except Exception as e:
        print(f"Error loading instruments: {e}")

    # Fallback: generate pseudo-token from symbol name
    return int(hashlib.md5(symbol.encode()).hexdigest()[:8], 16) % 10000000
