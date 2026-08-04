from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Ticket, Customer, Product, ApiKey    
from schemas import TicketCreate, TicketUpdate, TicketResponse
from graph_service import sync_ticket
from auth import verify_api_key


router = APIRouter(prefix="/tickets", tags=["Tickets"])

@router.post("/", response_model = TicketResponse)
def create_ticket(
    ticket: TicketCreate,
    db: Session = Depends(get_db),
    api_key: ApiKey = Depends(verify_api_key),
):
    customer = db.query(Customer).filter(Customer.id == ticket.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    if ticket.product_id is not None:
        product = db.query(Product).filter(Product.id == ticket.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")


    new_ticket = Ticket(
        subject=ticket.subject,
        description=ticket.description,
        customer_id=ticket.customer_id,
        product_id=ticket.product_id,
    )
    db.add(new_ticket)
    db.commit()
    db.refresh(new_ticket)

    sync_ticket(
        new_ticket.id,
        new_ticket.subject,
        new_ticket.status,
        new_ticket.customer_id,
        new_ticket.product_id,
    )

    return new_ticket


@router.get("/", response_model=List[TicketResponse])
def list_tickets(
    db: Session = Depends(get_db),
    api_key: ApiKey = Depends(verify_api_key),
):
    return db.query(Ticket).all()

@router.put("/{ticket_id}", response_model=TicketResponse)
def update_ticket(
    ticket_id: int,
    ticket_update: TicketUpdate,
    db: Session = Depends(get_db),
    api_key: ApiKey = Depends(verify_api_key),
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    update_data = ticket_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(ticket, field, value)

    db.commit()
    db.refresh(ticket)

    return ticket