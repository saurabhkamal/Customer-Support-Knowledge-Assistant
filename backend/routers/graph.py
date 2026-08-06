from fastapi import APIRouter, Depends       # router class + dependency tool
from models import ApiKey                     # for the api_key type hint
from auth import verify_api_key                # our API key check
from graph_service import get_ticket_graph     

router = APIRouter(prefix="/graph", tags=["Graph"])
# creates the router; endpoints below start with/graph

@router.get("/ticket/{ticket_id}")    # handles GET /graph/ticket/{ticket_id},  e.g. /graph/ticket/3
def get_ticket_graph_view(
    ticket_id: int,                # extracted from the URL path
    api_key: ApiKey = Depends(verify_api_key)     # require a valid API key
):
    return get_ticket_graph(ticket_id)
    # call our graph_service function and return its result directly

