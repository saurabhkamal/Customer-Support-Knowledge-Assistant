import os                               # for reading environment variables
from dotenv import load_dotenv          # to load .env file values
from fastapi import APIRouter, Depends  # router + dependency injection tool
from sqlalchemy.orm import Session      # database session for querying
from openai import OpenAI               # OpenAI client library

from database import get_db             # dependency to get a fresh DB session
from models import DocumentChunk, Document, Issue  # tables we'll query
from schemas import AskRequest, AskResponse # request/response shapes for this endpoint
from embedding_service import generate_embedding  # function to get embeddings
from graph_service import get_solution_for_issue  # function to get solution for an issue

load_dotenv()      # load .env values into environment
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))   # create the OpenAI client

router = APIRouter(prefix="/ask", tags=["Ask"])     # router for /ask endpoints

@router.post("/", response_model=AskResponse)
def ask_question(request: AskRequest, db: Session = Depends(get_db)):
    # request = validated {question}; db = fresh database session

    question_embedding = generate_embedding(request.question)
    # converts the user's question into its own 1536-number embedding

    top_chunk_result = (
        db.query(DocumentChunk,
                 DocumentChunk.embedding.cosine_distance(question_embedding).label("distance"),
                 )
                 .order_by("distance")
                 .limit(1)
                 .first()
        )
        # find the single closest (most similar) document chunk to the question


    top_issue_result = (
        db.query(
            Issue,
            Issue.embedding.cosine_distance(question_embedding).label("distance"),
        )
        .filter(Issue.embedding.is_not(None))
        .order_by("distance")
        .limit(1)
        .first()
    )
    # same idea, but find the single closest matching past Issue instead

    document_context = ""
    document_source = None
    if top_chunk_result:
        chunk, _ = top_chunk_result
        document = db.query(Document).filter(Document.id == chunk.document_id).first()
        document_context = chunk.chunk_text
        document_source = document.title
    # If a matching chunk was found, grab its text and its parent document's title

    issue_context = ""
    issue_source = None
    solution_used = None
    if top_issue_result:
        issue, _ = top_issue_result
        print("DEBUG - issue.id:", issue.id, "| issue.title:", repr(issue.title))
        solution_text = get_solution_for_issue(issue.id)
        if solution_text:
            issue_context = f"Issue: {issue.title}\nSolution: {solution_text}"
            issue_source = issue.title
            solution_used = solution_text
    # If a matching issue was found, ask Neo4j for its linked solution. 
    # If one exists, build a text block describing the issue + its fix

    messages = [
        {
            "role": "system",
            "content": "You are a customer support assistant. Answer using only provided context. If the context doesn't contain "
                       "enough information, say so honestly.",

        },
        {
            "role":"user",
            "content":f"""
                       context from documentation: {document_context}
                       context from a previously resolved issue:  {issue_context}
                       Question: {request.question}
                       Answer the question using the context above
                       """,
        },
    ]
    # build the prompt: system instructions + a user message containing
    # both retrieved contexts and the actual question

    completion = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
    )
    # send the prompt to the LLM, get back a generated response

    answer = completion.choices[0].message.content
    # extract just the generated answer text from the response

    print("DEBUG - issue_source value:", issue_source)
    print("DEBUG - top_issue_result:", top_issue_result)

    return AskResponse(
        answer=answer,
        document_source=document_source,
        issue_source=issue_source,
        solution_used=solution_used,
    )
    # send back the answer along with where its context came from

