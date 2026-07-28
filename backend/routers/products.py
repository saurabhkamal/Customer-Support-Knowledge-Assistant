from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from graph_service import sync_product

from database import get_db
from models import Product
from schemas import ProductCreate, ProductResponse

router = APIRouter(prefix="/products", tags=["Products"])

@router.post("/", response_model=ProductResponse)
def create_product(product: ProductCreate, db: Session = Depends(get_db)):
    existing = db.query(Product).filter(Product.name == product.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Product already exists")

    new_product = Product(name=product.name, description=product.description)
    db.add(new_product)
    db.commit()
    db.refresh(new_product)

    sync_product(new_product.id, new_product.name, new_product.description)

    return new_product

@router.get("/", response_model=List[ProductResponse])
def list_products(db: Session = Depends(get_db)):
    return db.query(Product).all()