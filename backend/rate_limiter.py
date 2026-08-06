from slowapi import Limiter
from slowapi.util import get_remote_address      # get_remote_address is a helper that identifies who's making a request

limiter = Limiter(key_func=get_remote_address)   # track limits per IP address