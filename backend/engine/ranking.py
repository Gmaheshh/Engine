import pandas as pd


DEFAULT_CAPITAL = 1_000_000      # 10 lakh
RISK_PER_TRADE_PCT = 0.01        # 1% risk per trade
ATR_SL_MULTIPLIER = 1.5
ATR_TARGET_MULTIPLIER = 3.0


def rank_signals(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df.copy()

    out = df.copy()

    for col in ["adx", "rsi", "atr", "close", "ema_fast", "ema_slow"]:
        if col in out.columns:
            out[col] = pd.to_numeric(out[col], errors="coerce")

    out["score"] = 0.0

    if "adx" in out.columns:
        out["score"] += out["adx"].fillna(0) * 0.4
    if "rsi" in out.columns:
        out["score"] += out["rsi"].fillna(0) * 0.2
    if "ema_fast" in out.columns and "ema_slow" in out.columns:
        out["score"] += (out["ema_fast"] - out["ema_slow"]).fillna(0) * 0.4

    out["entry"] = out["close"]
    out["sl"] = out["entry"] - (ATR_SL_MULTIPLIER * out["atr"])
    out["target"] = out["entry"] + (ATR_TARGET_MULTIPLIER * out["atr"])

    risk_denom = (out["entry"] - out["sl"]).replace(0, pd.NA)
    out["rr"] = (out["target"] - out["entry"]) / risk_denom

    capital_per_trade = DEFAULT_CAPITAL * 0.10
    risk_per_trade = DEFAULT_CAPITAL * RISK_PER_TRADE_PCT

    out["capital_per_trade"] = capital_per_trade
    out["risk_per_trade"] = risk_per_trade

    out["shares_by_risk"] = (risk_per_trade / risk_denom).fillna(0)
    out["shares_by_capital"] = (capital_per_trade / out["entry"]).fillna(0)

    out["shares"] = out[["shares_by_risk", "shares_by_capital"]].min(axis=1)
    out["shares"] = out["shares"].fillna(0).astype(int)

    out["position_value"] = out["shares"] * out["entry"]
    out["max_loss_if_sl"] = out["shares"] * (out["entry"] - out["sl"])
    out["max_profit_if_target"] = out["shares"] * (out["target"] - out["entry"])

    return out.sort_values("score", ascending=False).reset_index(drop=True)
