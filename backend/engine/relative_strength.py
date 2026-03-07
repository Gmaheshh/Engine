def relative_strength_filter(stock_df, nifty_df):

    stock_df["stock_return_20"] = stock_df["close"].pct_change(20)

    merged = stock_df.merge(
        nifty_df[["Date", "nifty_return_20"]],
        left_on="ts",
        right_on="Date",
        how="left"
    )

    merged["rs_filter"] = merged["stock_return_20"] > merged["nifty_return_20"]

    return merged
