import pandas as pd


def rolling_median(series: pd.Series, window: int) -> pd.Series:
    return series.rolling(window=window).median()


def rolling_mean(series: pd.Series, window: int) -> pd.Series:
    return series.rolling(window=window).mean()
