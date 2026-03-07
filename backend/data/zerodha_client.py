from kiteconnect import KiteConnect

# Replace with your credentials
API_KEY = "pmivw7e6yy03l9ml"
ACCESS_TOKEN = "ASd7Gld5lLZieaTiWMM7qFWjvrSEYMsq"


def get_kite():
    kite = KiteConnect(api_key=API_KEY)
    kite.set_access_token(ACCESS_TOKEN)
    return kite
