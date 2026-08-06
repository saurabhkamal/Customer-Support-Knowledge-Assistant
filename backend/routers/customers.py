from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Customer
from schemas import CustomerCreate, CustomerResponse
from typing import List
from graph_service import sync_customer
from auth import verify_api_key
from models import ApiKey


router = APIRouter(prefix="/customers", tags=["Customers"])

@router.post("/", response_model=CustomerResponse)
def create_customer(customer: CustomerCreate, db: Session = Depends(get_db), api_key: ApiKey = Depends(verify_api_key)):
    existing = db.query(Customer).filter(Customer.email == customer.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_customer = Customer(name=customer.name, email=customer.email)
    db.add(new_customer)
    db.commit()
    db.refresh(new_customer)

    sync_customer(new_customer.id, new_customer.name, new_customer.email)
    # This one line means: every time a customer is created via your API, it's automatically written to both Postgres and Neo4j.

    return new_customer


@router.get("/", response_model=List[CustomerResponse])
def list_customers(
    db: Session = Depends(get_db),
    api_key: ApiKey = Depends(verify_api_key),
):
    customers = db.query(Customer).all()
    return customers

