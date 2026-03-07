import pandas as pd
import numpy as np


def adx(df: pd.DataFrame, window: int = 14) -> pd.Series:
    high = df["high"]
    low = df["low"]
    close = df["close"]

    up_move = high.diff()
    down_move = -low.diff()

    plus_dm = pd.Series(
        np.where((up_move > down_move) & (up_move > 0), up_move, 0.0),
        index=df.index
    )
    minus_dm = pd.Series(
        np.where((down_move > up_move) & (down_move > 0), down_move, 0.0),
        index=df.index
    )

    prev_close = close.shift(1)

    tr1 = high - low
    tr2 = (high - prev_close).abs()
    tr3 = (low - prev_close).abs()

    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    atr_ = tr.rolling(window=window, min_periods=window).mean()

    plus_di = 100 * plus_dm.rolling(window=window, min_periods=window).mean() / atr_
    minus_di = 100 * minus_dm.rolling(window=window, min_periods=window).mean() / atr_

    denom = (plus_di + minus_di).replace(0, 1e-10)
    dx = ((plus_di - minus_di).abs() / denom) * 100

    return dx.rolling(window=window, min_periods=window).mean()
