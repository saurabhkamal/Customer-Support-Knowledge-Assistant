from graph_service import sync_customer

sync_customer(customer_id=2, name="Neha Sharma", email="neha.sharma@example.com")

print("Backfilled customer id=2 into Neo4j")