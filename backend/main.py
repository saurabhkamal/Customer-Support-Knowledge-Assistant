from fastapi import FastAPI
from database import engine, Base  # libraries needed to actually create tables.
# Imports engine (Live connection to Postgres)
# Import Base (the parent class all our models inherit from)
import models
from routers import customers, products, tickets, issues, solutions, documents, search, ask

Base.metadata.create_all(bind=engine)  # Build the tables command

app = FastAPI(title="Customer Support Knowledge Assistant")

app.include_router(customers.router)  # registers all endpoints defined in customers.py onto your main app - which makes POST /customers/ reachable.
app.include_router(products.router)
app.include_router(tickets.router)
app.include_router(issues.router)
app.include_router(solutions.router)
app.include_router(documents.router)
app.include_router(search.router)
app.include_router(ask.router)

@app.get("/health")
def health_check():
    return {"status": "ok"}

