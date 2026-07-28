from graph_service import sync_ticket

sync_ticket(
    ticket_id=2,
    subject="Payment failure",
    status="open",
    customer_id=2,
    product_id=1,
)

sync_ticket(
    ticket_id=3,
    subject="Setup issue",
    status="open",
    customer_id=2,
    product_id=2,
)

print("Re-synced tickets id=2 and id=3 into Neo4j")