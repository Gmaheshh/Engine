from pathlib import Path
import pandas as pd

from backend.config import OUTPUT_DIR
from backend.data.universe import TEST_SYMBOLS
from backend.data.fetch_candles import fetch_daily_candles
from backend.data.instruments import get_instrument_token
from backend.market_regime import fetch_nifty_regime, merge_relative_strength
from backend.strategies.strategy_volatility_breakout import run_volatility_breakout
from backend.strategies.strategy_vwlm import run_vwlm


def rank_signals(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df.copy()

    out = df.copy()

    for col in ["adx", "rsi", "atr", "close", "volume"]:
        if col in out.columns:
            out[col] = pd.to_numeric(out[col], errors="coerce")

    out["score"] = 0.0

    if "adx" in out.columns:
        out["score"] += out["adx"].fillna(0) * 0.40
    if "rsi" in out.columns:
        out["score"] += out["rsi"].fillna(0) * 0.25
    if "atr" in out.columns and "close" in out.columns:
        out["score"] += ((out["atr"] / out["close"]) * 100).fillna(0) * 0.20
    if "volume" in out.columns:
        out["score"] += (out["volume"].fillna(0) / 100000) * 0.15

    return out.sort_values("score", ascending=False).reset_index(drop=True)


def _latest_signal_row(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty or "signal" not in df.columns:
        return pd.DataFrame()

    latest = df.iloc[[-1]].copy()

    signal_val = latest["signal"].iloc[0]
    if pd.isna(signal_val) or not bool(signal_val):
        return pd.DataFrame()

    latest = latest.replace([float("inf"), float("-inf")], pd.NA)
    return latest


def _process_symbol(
    symbol: str,
    regime_df: pd.DataFrame | None,
    days: int,
    include_vwlm: bool,
    include_breakout: bool,
) -> list[pd.DataFrame]:
    rows = []

    token = get_instrument_token(symbol)
    df = fetch_daily_candles(token, days=days)

    if df.empty or len(df) < 200:
        print(f"Skipping {symbol}: insufficient data")
        return rows

    df = df.copy()
    df["tradingsymbol"] = symbol
    df["interval"] = "day"

    if regime_df is not None:
        df = merge_relative_strength(df, regime_df)

    if include_breakout:
        vb_df = run_volatility_breakout(df.copy())
        vb_latest = _latest_signal_row(vb_df)
        if not vb_latest.empty:
            rows.append(vb_latest)

    if include_vwlm:
        vwlm_df = run_vwlm(df.copy())
        vwlm_latest = _latest_signal_row(vwlm_df)
        if not vwlm_latest.empty:
            rows.append(vwlm_latest)

    return rows


def run_engine(
    symbols: list[str] | None = None,
    days: int = 1500,
    include_vwlm: bool = True,
    include_breakout: bool = True,
):
    symbols = symbols or TEST_SYMBOLS
    all_latest: list[pd.DataFrame] = []

    regime_df = None
    if include_breakout:
        print("Loading NIFTY regime + relative strength...")
        regime_df = fetch_nifty_regime(days=days)
        print("Loaded NIFTY regime + relative strength successfully")

    for idx, symbol in enumerate(symbols, start=1):
        print(f"[{idx}/{len(symbols)}] {symbol}")
        try:
            rows = _process_symbol(
                symbol=symbol,
                regime_df=regime_df,
                days=days,
                include_vwlm=include_vwlm,
                include_breakout=include_breakout,
            )
            if rows:
                all_latest.extend(rows)
                print(f"Signal found: {symbol}")
            else:
                print(f"No signal: {symbol}")
        except Exception as e:
            print(f"Failed: {symbol} -> {e}")

    if not all_latest:
        empty_df = pd.DataFrame()
        (OUTPUT_DIR / "signals_latest.csv").parent.mkdir(parents=True, exist_ok=True)
        empty_df.to_csv(OUTPUT_DIR / "signals_latest.csv", index=False)
        empty_df.to_csv(OUTPUT_DIR / "ranked_signals.csv", index=False)
        return empty_df, empty_df

    final_df = pd.concat(all_latest, ignore_index=True)
    ranked_df = rank_signals(final_df)

    final_df = final_df.replace([float("inf"), float("-inf")], pd.NA)
    ranked_df = ranked_df.replace([float("inf"), float("-inf")], pd.NA)

    (OUTPUT_DIR / "signals_latest.csv").parent.mkdir(parents=True, exist_ok=True)
    final_df.to_csv(OUTPUT_DIR / "signals_latest.csv", index=False)
    ranked_df.to_csv(OUTPUT_DIR / "ranked_signals.csv", index=False)

    return final_df, ranked_df


if __name__ == "__main__":
    signals, ranked = run_engine()

    print("\n===== LIVE SIGNAL SUMMARY =====")
    print(f"Signals found: {len(signals)}")
    if not ranked.empty:
        show_cols = [c for c in [
            "ts",
            "tradingsymbol",
            "strategy",
            "close",
            "adx",
            "atr",
            "rsi",
            "score",
        ] if c in ranked.columns]
        print(ranked[show_cols].head(20).to_string(index=False))
