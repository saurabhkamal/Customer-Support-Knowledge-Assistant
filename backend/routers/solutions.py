from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Solution, Issue, ApiKey
from schemas import SolutionCreate, SolutionResponse
from graph_service import sync_solution
from auth import verify_api_key


router = APIRouter(prefix="/solutions", tags=["Solutions"])

@router.post("/", response_model=SolutionResponse)
def create_solution(
    solution: SolutionCreate,
    db: Session = Depends(get_db),
    api_key: ApiKey = Depends(verify_api_key),
):
    issue = db.query(Issue).filter(Issue.id == solution.issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    new_solution = Solution(
        description=solution.description,
        issue_id=solution.issue_id,
    )
    db.add(new_solution)
    db.commit()
    db.refresh(new_solution)

    sync_solution(new_solution.id, new_solution.description, new_solution.issue_id)

    return new_solution

@router.get("/", response_model=List[SolutionResponse])
def list_solutions(
    db: Session = Depends(get_db),
    api_key: ApiKey = Depends(verify_api_key),
):
    return db.query(Solution).all()

