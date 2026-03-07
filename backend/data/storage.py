from pathlib import Path
import pandas as pd


def save_csv(df: pd.DataFrame, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index=False)


def load_csv(path: Path) -> pd.DataFrame:
    return pd.read_csv(path, parse_dates=["ts"])
