from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Issue, Ticket
from schemas import IssueCreate, IssueResponse
from graph_service import sync_issue

router = APIRouter(prefix="/issues", tags=["Issues"])

@router.post("/", response_model=IssueResponse)
def create_issue(issue: IssueCreate, db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(Ticket.id == issue.ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    new_issue = Issue(
        title=issue.title,
        description=issue.description,
        ticket_id=issue.ticket_id,
    )
    db.add(new_issue)
    db.commit()
    db.refresh(new_issue)

    sync_issue(new_issue.id, new_issue.title, new_issue.description, new_issue.ticket_id)

    return new_issue

@router.get("/", response_model=List[IssueResponse])
def list_issues(db: Session = Depends(get_db)):
    return db.query(Issue).all()

