# Writing schemas.py for customer

from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


class CustomerCreate(BaseModel):
    name: str
    email: EmailStr


class CustomerResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    created_at: datetime

    class config:
        from_attributes = True


class ProductCreate(BaseModel):
    name: str
    description: str | None = None

class ProductResponse(BaseModel):
    id: int
    name: str
    description: str | None
    created_at: datetime

    class config:
        from_attributes = True


class TicketCreate(BaseModel):
    subject: str
    description: Optional[str] = None   # Optional[str] is another way to write str | None
    customer_id: int
    product_id: Optional[int] = None


class TicketUpdate(BaseModel):
    subject: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    product_id: Optional[int] = None

class TicketResponse(BaseModel):
    id: int
    subject: str
    description: Optional[str]
    status: str
    customer_id: int
    product_id: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


class IssueCreate(BaseModel):
    title: str
    description: Optional[str] = None
    ticket_id: int

class IssueResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    ticket_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class SolutionCreate(BaseModel):
    description: str
    issue_id: int

class SolutionResponse(BaseModel):
    id: int
    description: str
    issue_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class DocumentCreate(BaseModel):
    title: str
    content: str
    product_id: int


class DocumentResponse(BaseModel):
    id: int
    title: str
    content: str
    product_id: int
    created_at: datetime

    class config:
        from_attributes = True


class SearchRequest(BaseModel):
    query: str
    top_k: int = 5

class SearchResult(BaseModel):
    chunk_id: int
    document_id: int
    document_title: str
    chunk_text: str
    similarity_score: float

    class Config:
        from_attributes = True


class AskRequest(BaseModel):
    question: str

class AskResponse(BaseModel):
    answer: str
    document_source: Optional[str] = None
    issue_source: Optional[str] = None
    solution_used: Optional[str] = None

class ApiKeyCreate(BaseModel):
    label: str


class ApiKeyResponse(BaseModel):
    id: int
    key: str
    label: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

        
