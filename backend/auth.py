from fastapi import Header, HTTPException, Depends, Security
# Header reads the value from the request's HTTP headers
# HTTPException: returns a proper error response
# Depends: FastAPI's dependency injection tool

from fastapi.security import APIKeyHeader
from sqlalchemy.orm import Session

from database import get_db
from models import ApiKey     # the ApiKey table model, so we can query it

api_key_header = APIKeyHeader(name="X-API-Key")



def verify_api_key(x_api_key: str = Security(api_key_header), db: Session = Depends(get_db)):
    # x_api_key: reads the "X-API-Key" header from the incoming request (required)
    # db: gets a fresh database session

    key_record = db.query(ApiKey).filter(ApiKey.key == x_api_key, ApiKey.is_active == True).first()
    # look up a row in api_keys where the key matches AND it's still active

    if not key_record:
        raise HTTPException(status_code=401, detail="Invalid or inactive API key")
        # if no match was found, reject the request with a 401 Unauthorized error

    return key_record   # if valid, return the matching ApiKey row 