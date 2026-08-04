from fastapi import FastAPI, Request     # FastAPI's type for an incoming request
from database import engine, Base  # libraries needed to actually create tables.
# Imports engine (Live connection to Postgres)
# Import Base (the parent class all our models inherit from)
import models
from routers import customers, products, tickets, issues, solutions, documents, search, ask, api_keys, graph
import time    # to measure how long each request takes
from logging_config import logger

from slowapi import _rate_limit_exceeded_handler  # Limiter is the core rate-limiting engine, 
#_rate_limit_exceeded_handler converts that exception into proper 429 HTTP response         
from slowapi.errors import RateLimitExceeded               # RateLimitExceeded, the exception slowapi raises internally when a limit is hit
from rate_limiter import limiter
from fastapi.middleware.cors import CORSMiddleware


Base.metadata.create_all(bind=engine)  # Build the tables command

app = FastAPI(title="Customer Support Knowledge Assistant")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
# Attaches limiter to the FastAPI app, and registers the handler so that when a limit is exceeded, FastAPI knows to return 
# 429 response instead of crashing down.


app.include_router(customers.router)  # registers all endpoints defined in customers.py onto your main app - which makes POST /customers/ reachable.
app.include_router(products.router)
app.include_router(tickets.router)
app.include_router(issues.router)
app.include_router(solutions.router)
app.include_router(documents.router)
app.include_router(search.router)
app.include_router(ask.router)
app.include_router(api_keys.router)
app.include_router(graph.router)      # register all of graph.py's endpoints onto the main app. 

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.middleware("http")
# registers this function to run automatically on every single HTTP request

async def log_requests(request: Request, call_next):
    # request = the incoming request; call_next = "run the actual endpoint next"

    start_time = time.time()  # record the current time, right before handling the request
    response = await call_next(request)  # run the real endpoint (e.g. create_customer) and get its response
    duration = round((time.time() - start_time) * 1000, 2)   # Calculate how long the whole request took, in milliseconds

    logger.info(f"{request.method} {request.url.path} - Status: {response.status_code} - {duration}ms")
    # write one log line: method, path, status code, and how long it took

    return response 


