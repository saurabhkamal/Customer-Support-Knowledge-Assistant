from database import SessionLocal      # import the session factory to open our own DB session
from models import Issue               # import the Issue model to query the issues table
from embedding_service import generate_embedding  

db = SessionLocal()  # open a new database session

try:
    issues = db.query(Issue).filter(Issue.embedding.is_(None)).all() # fetch all issues that don't have an embedding yet

    for issue in issues:
        combined_text = f"{issue.title} {issue.description or ''}"  # merge title + description into one string to embed
        issue.embedding = generate_embedding(combined_text)
        db.add(issue) # stage the change
    db.commit()  # save all updates to Postgres at once
    print(f"Backfilled embeddings for {len(issues)} issues")   # confirm how many were done

finally:
    db.close()   # always close the session, even if an error occurred