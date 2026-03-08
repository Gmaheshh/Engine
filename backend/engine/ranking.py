import pandas as pd
import numpy as np


DEFAULT_CAPITAL = 1_000_000      # 10 lakh
RISK_PER_TRADE_PCT = 0.01        # 1% risk per trade
ATR_SL_MULTIPLIER = 1.5
ATR_TARGET_MULTIPLIER = 3.0


def rank_signals(df: pd.DataFrame) -> pd.DataFrame:
    """
    Rank signals with improved scoring logic.
    
    Score components (normalized 0-100):
    - ADX contribution (30%): Trend strength
    - RSI contribution (15%): Momentum state
    - EMA spread contribution (25%): Trend direction strength (normalized)
    - Volume contribution (15%): Volume vs average
    - Breakout contribution (15%): Price position relative to recent high
    """
    if df.empty:
        return df.copy()

    out = df.copy()

    # Ensure numeric columns
    numeric_cols = ["adx", "rsi", "atr", "close", "ema_fast", "ema_slow", "volume", "vol_ma", "prev_high"]
    for col in numeric_cols:
        if col in out.columns:
            out[col] = pd.to_numeric(out[col], errors="coerce")

    # =============================================================================
    # SCORE COMPONENTS (all normalized to 0-100 range)
    # =============================================================================
    
    out["score"] = 0.0
    
    # 1. ADX Score (30%) - Trend strength
    # ADX typically ranges 0-100, values > 25 indicate strong trend
    if "adx" in out.columns:
        adx_score = out["adx"].fillna(0).clip(0, 100)
        out["adx_score"] = adx_score
        out["score"] += adx_score * 0.30
    
    # 2. RSI Score (15%) - Momentum position
    # For bullish signals: RSI 50-70 is ideal (normalized so 60 = 100)
    if "rsi" in out.columns:
        rsi = out["rsi"].fillna(50)
        # Score highest when RSI is around 60 (bullish momentum without overbought)
        rsi_score = 100 - np.abs(rsi - 60) * 2
        rsi_score = rsi_score.clip(0, 100)
        out["rsi_score"] = rsi_score
        out["score"] += rsi_score * 0.15
    
    # 3. EMA Spread Score (25%) - Normalized trend strength
    # Normalize EMA spread as percentage of price
    if "ema_fast" in out.columns and "ema_slow" in out.columns and "close" in out.columns:
        ema_spread = out["ema_fast"] - out["ema_slow"]
        ema_spread_pct = (ema_spread / out["close"]) * 100  # As percentage
        # Normalize: 0-2% spread maps to 0-100 score
        ema_score = (ema_spread_pct.clip(0, 2) / 2) * 100
        out["ema_spread_pct"] = ema_spread_pct
        out["ema_score"] = ema_score
        out["score"] += ema_score * 0.25
    
    # 4. Volume Score (15%) - Volume expansion
    if "volume" in out.columns and "vol_ma" in out.columns:
        vol_ratio = out["volume"] / out["vol_ma"].replace(0, np.nan)
        # Score: 1.0x = 0, 1.5x = 50, 2.0x+ = 100
        vol_score = ((vol_ratio.fillna(1) - 1) * 100).clip(0, 100)
        out["vol_score"] = vol_score
        out["score"] += vol_score * 0.15
    elif "volume" in out.columns:
        # Fallback if vol_ma not available
        out["vol_score"] = 50  # Neutral
        out["score"] += 50 * 0.15
    
    # 5. Breakout Score (15%) - Price position relative to recent high
    if "close" in out.columns and "prev_high" in out.columns:
        breakout_pct = ((out["close"] - out["prev_high"]) / out["prev_high"]) * 100
        # Score: 0% breakout = 50, 2%+ breakout = 100
        breakout_score = (50 + breakout_pct.clip(-2, 2) * 25).clip(0, 100)
        out["breakout_pct"] = breakout_pct
        out["breakout_score"] = breakout_score
        out["score"] += breakout_score * 0.15
    elif "close" in out.columns:
        # Fallback
        out["breakout_score"] = 50
        out["score"] += 50 * 0.15

    # Final score clipping
    out["score"] = out["score"].clip(0, 100)

    # =============================================================================
    # POSITION SIZING
    # =============================================================================
    
    out["entry"] = out["close"]
    out["sl"] = out["entry"] - (ATR_SL_MULTIPLIER * out["atr"])
    out["target"] = out["entry"] + (ATR_TARGET_MULTIPLIER * out["atr"])

    risk_denom = (out["entry"] - out["sl"]).replace(0, pd.NA)
    out["rr"] = (out["target"] - out["entry"]) / risk_denom

    capital_per_trade = DEFAULT_CAPITAL * 0.10  # 10% of capital per trade
    risk_per_trade = DEFAULT_CAPITAL * RISK_PER_TRADE_PCT  # 1% risk

    out["capital_per_trade"] = capital_per_trade
    out["risk_per_trade"] = risk_per_trade

    out["shares_by_risk"] = (risk_per_trade / risk_denom).fillna(0)
    out["shares_by_capital"] = (capital_per_trade / out["entry"]).fillna(0)

    out["shares"] = out[["shares_by_risk", "shares_by_capital"]].min(axis=1)
    out["shares"] = out["shares"].fillna(0).astype(int)

    out["position_value"] = out["shares"] * out["entry"]
    out["max_loss_if_sl"] = out["shares"] * (out["entry"] - out["sl"])
    out["max_profit_if_target"] = out["shares"] * (out["target"] - out["entry"])

    # =============================================================================
    # SCORE BREAKDOWN FOR TRANSPARENCY
    # =============================================================================
    
    score_cols = ["adx_score", "rsi_score", "ema_score", "vol_score", "breakout_score"]
    for col in score_cols:
        if col not in out.columns:
            out[col] = 0

    return out.sort_values("score", ascending=False).reset_index(drop=True)
