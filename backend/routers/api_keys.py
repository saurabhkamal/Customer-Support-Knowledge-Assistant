# An endpoint to generate new keys
import secrets    # Built-in module for generating secure random values
from typing import List
from fastapi import APIRouter, Depends    # router class + dependency injection tool
from sqlalchemy.orm import Session        # type hint for the db session

from database import get_db       # reusable DB session dependency
from models import ApiKey         # the API key table model 
from schemas import ApiKeyCreate, ApiKeyResponse  # request/response shapes
from auth import verify_api_key

router = APIRouter(prefix="/api-keys", tags=["API Keys"])
# Every endpoint below starts with /api-keys

@router.post("/", response_model=ApiKeyResponse)    # handles POST /api-keys/, response shaped as ApiKeyResponse
def create_api_key(request: ApiKeyCreate, db: Session = Depends(get_db)):
    # request = validated {label}; db = fresh database session
    
    new_key = ApiKey(
        key=secrets.token_urlsafe(32),
        label=request.label,
    )
    # build a new ApiKey object: generate a secure random key string,
    # and use the label the caller provided

    db.add(new_key)     # stage it to be inserted
    db.commit()         # save it to Postgres
    db.refresh(new_key) # reload it, so we get the real id and created_at

    return new_key   # send a new key back to the response

@router.get("/", response_model=List[ApiKeyResponse])
# handles GET /api-keys/, response is a list of ApiKeyResponses
def list_api_keys(
    db: Session = Depends(get_db),
    api_key: ApiKey = Depends(verify_api_key),
):
    return db.query(ApiKey).all()
    # fetch and return every existing API key

