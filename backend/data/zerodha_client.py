import os
from kiteconnect import KiteConnect

def get_kite():
    """Get authenticated Kite Connect instance using environment variables."""
    api_key = os.environ.get('ZERODHA_API_KEY')
    access_token = os.environ.get('ZERODHA_ACCESS_TOKEN')
    
    if not api_key or not access_token:
        raise ValueError(
            "Zerodha credentials not found in environment. "
            "Set ZERODHA_API_KEY and ZERODHA_ACCESS_TOKEN."
        )
    
    kite = KiteConnect(api_key=api_key)
    kite.set_access_token(access_token)
    return kite


def is_zerodha_available() -> bool:
    """Check if Zerodha credentials are configured."""
    api_key = os.environ.get('ZERODHA_API_KEY')
    access_token = os.environ.get('ZERODHA_ACCESS_TOKEN')
    return bool(api_key and access_token)
