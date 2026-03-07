import pandas as pd

from backend.data.universe import TEST_SYMBOLS
from backend.data.fetch_candles import fetch_daily_candles
from backend.data.instruments import get_instrument_token
from backend.market_regime import fetch_nifty_regime, merge_relative_strength
from backend.strategies.strategy_volatility_breakout import run_volatility_breakout
from backend.strategies.strategy_vwlm import run_vwlm

INITIAL_CAPITAL = 1_000_000
CAPITAL_PER_TRADE = 100_000
RISK_PER_TRADE = 10_000


def compute_equity_curve(trades: pd.DataFrame, initial_capital: float = INITIAL_CAPITAL) -> pd.DataFrame:
    if trades.empty:
        return pd.DataFrame({"equity": [initial_capital]})

    equity = initial_capital
    values = []

    for _, row in trades.iterrows():
        equity += row["pnl"]
        values.append(equity)

    return pd.DataFrame({"equity": values})


def compute_metrics(trades: pd.DataFrame, equity_curve: pd.DataFrame) -> dict:
    if trades.empty:
        return {
            "trades": 0,
            "win_rate": 0.0,
            "total_pnl": 0.0,
            "total_return": 0.0,
            "max_drawdown": 0.0,
            "avg_pnl_per_trade": 0.0,
            "profit_factor": 0.0,
        }

    wins = (trades["pnl"] > 0).sum()
    total_trades = len(trades)
    total_pnl = trades["pnl"].sum()
    total_return = total_pnl / INITIAL_CAPITAL
    avg_pnl_per_trade = trades["pnl"].mean()

    gross_profit = trades.loc[trades["pnl"] > 0, "pnl"].sum()
    gross_loss = abs(trades.loc[trades["pnl"] < 0, "pnl"].sum())
    profit_factor = gross_profit / gross_loss if gross_loss > 0 else 0.0

    eq = equity_curve["equity"]
    running_max = eq.cummax()
    drawdown = (eq - running_max) / running_max
    max_drawdown = drawdown.min()

    return {
        "trades": int(total_trades),
        "win_rate": float(wins / total_trades),
        "total_pnl": float(total_pnl),
        "total_return": float(total_return),
        "max_drawdown": float(max_drawdown),
        "avg_pnl_per_trade": float(avg_pnl_per_trade),
        "profit_factor": float(profit_factor),
    }


def generate_trades_vwlm(df: pd.DataFrame) -> pd.DataFrame:
    required_cols = ["ts", "open", "high", "low", "close", "signal", "atr", "ema_fast", "ema_slow"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        return pd.DataFrame()

    df = df.reset_index(drop=True)
    trades = []
    i = 0

    while i < len(df) - 1:
        signal_val = df.iloc[i]["signal"]

        if pd.isna(signal_val) or not bool(signal_val):
            i += 1
            continue

        entry_idx = i + 1
        entry_price = df.iloc[entry_idx]["open"]
        atr_val = df.iloc[i]["atr"]

        if pd.isna(entry_price) or pd.isna(atr_val) or entry_price <= 0 or atr_val <= 0:
            i += 1
            continue

        sl = entry_price - (1.5 * atr_val)
        target = entry_price + (3.0 * atr_val)
        risk_per_share = entry_price - sl

        if risk_per_share <= 0:
            i += 1
            continue

        shares = int(min(CAPITAL_PER_TRADE / entry_price, RISK_PER_TRADE / risk_per_share))
        if shares <= 0:
            i += 1
            continue

        exit_price = None
        exit_time = None
        exit_reason = None
        j = entry_idx

        while j < len(df):
            high = df.iloc[j]["high"]
            low = df.iloc[j]["low"]
            close = df.iloc[j]["close"]
            ema_fast = df.iloc[j]["ema_fast"]
            ema_slow = df.iloc[j]["ema_slow"]

            if pd.notna(low) and low <= sl:
                exit_price = sl
                exit_time = df.iloc[j]["ts"]
                exit_reason = "SL"
                break

            if pd.notna(high) and high >= target:
                exit_price = target
                exit_time = df.iloc[j]["ts"]
                exit_reason = "TARGET"
                break

            if pd.notna(ema_fast) and pd.notna(ema_slow) and ema_fast < ema_slow:
                exit_price = close
                exit_time = df.iloc[j]["ts"]
                exit_reason = "EMA_REVERSAL"
                break

            j += 1

        if exit_price is None:
            exit_price = df.iloc[-1]["close"]
            exit_time = df.iloc[-1]["ts"]
            exit_reason = "FORCED_EOD"

        pnl = (exit_price - entry_price) * shares

        trades.append({
            "strategy": "VWLM",
            "signal_time": df.iloc[i]["ts"],
            "entry_time": df.iloc[entry_idx]["ts"],
            "exit_time": exit_time,
            "entry_price": float(entry_price),
            "exit_price": float(exit_price),
            "sl": float(sl),
            "target": float(target),
            "shares": int(shares),
            "pnl": float(pnl),
            "exit_reason": exit_reason,
        })

        i = max(j, entry_idx + 1)

    return pd.DataFrame(trades)


def generate_trades_vb(df: pd.DataFrame) -> pd.DataFrame:
    required_cols = ["ts", "open", "high", "low", "close", "signal", "atr"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        return pd.DataFrame()

    df = df.reset_index(drop=True)
    trades = []
    i = 0

    while i < len(df) - 1:
        signal_val = df.iloc[i]["signal"]

        if pd.isna(signal_val) or not bool(signal_val):
            i += 1
            continue

        entry_idx = i + 1
        entry_price = df.iloc[entry_idx]["open"]
        atr_val = df.iloc[i]["atr"]

        if pd.isna(entry_price) or pd.isna(atr_val) or entry_price <= 0 or atr_val <= 0:
            i += 1
            continue

        sl = entry_price - (1.5 * atr_val)
        target = entry_price + (3.0 * atr_val)
        risk_per_share = entry_price - sl

        if risk_per_share <= 0:
            i += 1
            continue

        shares = int(min(CAPITAL_PER_TRADE / entry_price, RISK_PER_TRADE / risk_per_share))
        if shares <= 0:
            i += 1
            continue

        exit_price = None
        exit_time = None
        exit_reason = None
        j = entry_idx

        while j < len(df):
            high = df.iloc[j]["high"]
            low = df.iloc[j]["low"]
            close = df.iloc[j]["close"]

            if pd.notna(low) and low <= sl:
                exit_price = sl
                exit_time = df.iloc[j]["ts"]
                exit_reason = "SL"
                break

            if pd.notna(high) and high >= target:
                exit_price = target
                exit_time = df.iloc[j]["ts"]
                exit_reason = "TARGET"
                break

            if j > entry_idx:
                prev_low = df.iloc[j - 1]["low"]
                if pd.notna(prev_low) and pd.notna(close) and close < prev_low:
                    exit_price = close
                    exit_time = df.iloc[j]["ts"]
                    exit_reason = "BREAKOUT_FADE"
                    break

            j += 1

        if exit_price is None:
            exit_price = df.iloc[-1]["close"]
            exit_time = df.iloc[-1]["ts"]
            exit_reason = "FORCED_EOD"

        pnl = (exit_price - entry_price) * shares

        trades.append({
            "strategy": "VOLATILITY_BREAKOUT",
            "signal_time": df.iloc[i]["ts"],
            "entry_time": df.iloc[entry_idx]["ts"],
            "exit_time": exit_time,
            "entry_price": float(entry_price),
            "exit_price": float(exit_price),
            "sl": float(sl),
            "target": float(target),
            "shares": int(shares),
            "pnl": float(pnl),
            "exit_reason": exit_reason,
        })

        i = max(j, entry_idx + 1)

    return pd.DataFrame(trades)


def backtest_symbol(
    symbol: str,
    days: int = 1500,
    mode: str = "combined",
    regime_df: pd.DataFrame | None = None,
) -> pd.DataFrame:
    print(f"Processing: {symbol}")

    token = get_instrument_token(symbol)
    raw = fetch_daily_candles(token, days=days)

    if raw.empty or len(raw) < 200:
        print(f"Skipping {symbol}: insufficient data")
        return pd.DataFrame()

    raw = raw.copy()
    raw["tradingsymbol"] = symbol
    raw["interval"] = "day"

    if regime_df is not None:
        raw = merge_relative_strength(raw, regime_df)

    parts = []

    if mode in ["vwlm", "combined"]:
        vwlm_df = run_vwlm(raw.copy())
        vwlm_trades = generate_trades_vwlm(vwlm_df)
        if not vwlm_trades.empty:
            parts.append(vwlm_trades)

    if mode in ["vb", "combined"]:
        vb_df = run_volatility_breakout(raw.copy())
        vb_trades = generate_trades_vb(vb_df)
        if not vb_trades.empty:
            parts.append(vb_trades)

    if not parts:
        print(f"Done: {symbol} | trades: 0")
        return pd.DataFrame()

    all_trades = pd.concat(parts, ignore_index=True)
    all_trades["symbol"] = symbol

    print(f"Done: {symbol} | trades: {len(all_trades)}")
    return all_trades


def run_backtest(symbols=None, days: int = 1500, mode: str = "combined"):
    symbols = symbols or TEST_SYMBOLS
    all_trades = []

    print(f"\nRunning backtest mode: {mode}")
    print(f"Universe size: {len(symbols)}")

    regime_df = None
    if mode in ["vb", "combined"]:
        print("Loading NIFTY regime + relative strength...")
        regime_df = fetch_nifty_regime(days=days)
        print("Loaded NIFTY regime + relative strength successfully")

    for idx, symbol in enumerate(symbols, start=1):
        print(f"[{idx}/{len(symbols)}] {symbol}")
        try:
            trades = backtest_symbol(symbol, days=days, mode=mode, regime_df=regime_df)
            if not trades.empty:
                all_trades.append(trades)
        except Exception as e:
            print(f"Failed: {symbol} -> {e}")

    if all_trades:
        trades_df = pd.concat(all_trades, ignore_index=True)
        trades_df = trades_df.sort_values("entry_time").reset_index(drop=True)
    else:
        trades_df = pd.DataFrame()

    equity_curve = compute_equity_curve(trades_df, INITIAL_CAPITAL)
    metrics = compute_metrics(trades_df, equity_curve)

    return trades_df, equity_curve, metrics


def print_metrics(title: str, metrics: dict):
    print(f"\n===== {title} =====")
    for k, v in metrics.items():
        print(f"{k}: {v}")


if __name__ == "__main__":
    vb_trades, vb_equity, vb_metrics = run_backtest(TEST_SYMBOLS, days=1500, mode="vb")
    print_metrics("VOLATILITY BREAKOUT ONLY", vb_metrics)

    vwlm_trades, vwlm_equity, vwlm_metrics = run_backtest(TEST_SYMBOLS, days=1500, mode="vwlm")
    print_metrics("VWLM ONLY", vwlm_metrics)

    combined_trades, combined_equity, combined_metrics = run_backtest(TEST_SYMBOLS, days=1500, mode="combined")
    print_metrics("COMBINED", combined_metrics)
