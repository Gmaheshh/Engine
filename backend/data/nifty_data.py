import yfinance as yf
import pandas as pd


def get_nifty_data():

    df = yf.download("^NSEI", period="3y", interval="1d")

    df = df.reset_index()

    df["nifty_return_20"] = df["Close"].pct_change(20)

    return df
