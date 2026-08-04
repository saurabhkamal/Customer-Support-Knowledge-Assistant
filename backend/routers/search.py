from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from sqlalchemy import select

from database import get_db
from models import DocumentChunk, Document, ApiKey 
from schemas import SearchRequest, SearchResult
from embedding_service import generate_embedding
from auth import verify_api_key
from rate_limiter import limiter


router = APIRouter(prefix="/search", tags=["Search"])

# POST /search/, response will be a JSON array of SearchResult objects
@router.post("/", response_model=list[SearchResult])
@limiter.limit("10/minute")
def search_documents(
    request: Request,
    request_body: SearchRequest,
    db: Session = Depends(get_db),
    api_key: ApiKey = Depends(verify_api_key),
):
    # Takes SearchRequest (query text + top_k), db = a fresh DB session

    query_embedding = generate_embedding(request_body.query)  # convert the user's search text into its own 1536-number embedding

    results = (
        db.query(
            DocumentChunk,
            DocumentChunk.embedding.cosine_distance(query_embedding).label("distance"),
            # fetch each chunk PLUS how "far" its embedding is from the query's embedding
        )
        .order_by("distance") # sort so the closest (most similar) chunks come first
        .limit(request_body.top_k) # only keep the top N results
        .all() # actually run the query, get back a list of (chunk, distance) pairs
    )

    response = []
    # empty list to collect the final formatted results

    for chunk, distance in results:
        # loop through each matching chunk and its distance score

        document = db.query(Document).filter(Document.id == chunk.document_id).first()
        # look up the chunk's parent document, to get its title

        response.append(SearchResult(
            chunk_id=chunk.id,                # this is chunk's own id
            document_id=document.id,          # which document it belongs to
            document_title=document.title,    # that document's title
            chunk_text=chunk.chunk_text,      # the actual matched text
            similarity_score=1 - distance     # flip distance into an intuitive score (higher = more similar)
            )
        )
         # build one clean result object and add it to the list
    return response   # send back the list of results as the API response 
