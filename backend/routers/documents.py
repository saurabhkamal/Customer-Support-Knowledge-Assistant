from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from database import get_db
from models import Document, Product, DocumentChunk, ApiKey
from schemas import DocumentCreate, DocumentResponse
from graph_service import sync_document
from embedding_service import split_into_chunks, generate_embedding
from auth import verify_api_key
from rate_limiter import limiter


router = APIRouter(prefix="/documents", tags=["Documents"])

@router.post("/", response_model=DocumentResponse)
@limiter.limit("3/minute")
def create_document(
    request: Request,
    document: DocumentCreate,
    db: Session = Depends(get_db),
    api_key: ApiKey = Depends(verify_api_key),
):
    product = db.query(Product).filter(Product.id == document.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    new_document = Document(
        title=document.title,
        content=document.content,
        product_id=document.product_id,
    )
    db.add(new_document)
    db.commit()
    db.refresh(new_document)

    sync_document(new_document.id, new_document.title, new_document.content, new_document.product_id)

    chunks = split_into_chunks(new_document.content)      # Splits the document's full text into a list of smaller chunk-strings
    for chunk_text in chunks:
        embedding = generate_embedding(chunk_text)        # For each chunk, makes a separate OpenAI call to get its own unique embedding
        new_chunk = DocumentChunk(
            document_id = new_document.id,
            chunk_text = chunk_text,
            embedding = embedding,
        )
        db.add(new_chunk)  # Stages this new chunk to be inserted - tells the SQLAlchemy "remembers this object"

        # 1. document_id = new_document.id -> links the chunk back to its parent document, using the document's real database-assigned id
        # 2. chunk_text = chunk_text -> stores this specific piece of the document's text
        # 3. embedding = embedding -> stores the list of 1536 numbers we just got back from OpenAI for this specific chunk of text.

    db.commit()
    # Permanently saving it in Supabase database

    return new_document

@router.get("/", response_model=List[DocumentResponse])
def list_documents(
    db: Session = Depends(get_db),
    api_key: ApiKey = Depends(verify_api_key),
):
    return db.query(Document).all()


