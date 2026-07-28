import os   # to read environment variables (like DATABASE_URL) from the system/OS level, rather than hardcoding secrets in the code.
from dotenv import load_dotenv # This function knows how to read a ".env" file and load its contents into the environment, so os.getenv() can find them.
from sqlalchemy import create_engine # builds the actual connection object SQLAlchemy uses to talk to the database (Postgres, in this project)
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv()  # load_dotenv() reads your .env file so os.getenv("DATABASE_URL") can find it

DATABASE_URL = os.getenv("DATABASE_URL") # Reads the environment variable named "DATABASE_URL" and stores its value

engine = create_engine(DATABASE_URL)  # engine is the actual connection to Postgres database

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
# SessionLocal is a factory that creates database "sessions" (think of a session as a conversation with the DB — you open one, do some work, 
# commit or rollback, then close it)

Base = declarative_base()  # Base is what your table models (in models.py) will inherit from

# get_db() is a helper you'll plug into FastAPI routes later — it opens a session, hands each incoming request a fresh database session, and guarantees it closes 
# afterward even if there's an error
def get_db():
    db = SessionLocal()   # creates one session instance for this particular request / operation
    try:
        yield db
    finally:
        db.close()


# 1. Load the secret DATABASE_URL from .env
# 2. Build the connection engine to Postgres
# 3. Set up a way to create "sessions" - temporary workspace for talking to the DB
# 4. Set up Base, the parent class your future table models will use
# 5. get_db() a helper function

