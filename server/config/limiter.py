from slowapi import Limiter
from slowapi.util import get_remote_address

# Use RedisStorage("redis://localhost:6379") for production
limiter = Limiter(key_func=get_remote_address)
