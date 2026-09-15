"""Rebuild the Neo4j graph from Postgres, which is the source of truth.

    python scripts/resync_graph.py

Use after recreating a Neo4j instance, or whenever the graph has drifted.
Every sync_* call is a MERGE, so running this repeatedly is safe.

Order is load-bearing: sync_ticket does MATCH (c:Customer), sync_issue does
MATCH (t:Ticket), sync_solution does MATCH (i:Issue) and sync_document does
MATCH (p:Product). A parent that does not exist yet means the relationship is
silently skipped while the node itself still gets created — so the graph looks
populated but is missing edges.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from database import SessionLocal  # noqa: E402
from graph_database import get_neo4j_driver  # noqa: E402
from graph_service import (  # noqa: E402
    sync_customer,
    sync_document,
    sync_issue,
    sync_product,
    sync_solution,
    sync_ticket,
)
from models import (  # noqa: E402
    Customer,
    Document,
    Issue,
    Product,
    Solution,
    Ticket,
)

try:
    get_neo4j_driver().verify_connectivity()
except Exception as exc:
    sys.exit(f"Neo4j unreachable, nothing synced: {type(exc).__name__}: {exc}")

db = SessionLocal()
try:
    steps = [
        ("customers", Customer, lambda r: sync_customer(r.id, r.name, r.email)),
        ("products", Product, lambda r: sync_product(r.id, r.name, r.description)),
        ("tickets", Ticket, lambda r: sync_ticket(
            r.id, r.subject, r.status, r.customer_id, r.product_id
        )),
        ("issues", Issue, lambda r: sync_issue(
            r.id, r.title, r.description, r.ticket_id
        )),
        ("solutions", Solution, lambda r: sync_solution(
            r.id, r.description, r.issue_id
        )),
        ("documents", Document, lambda r: sync_document(
            r.id, r.title, r.content, r.product_id
        )),
    ]

    for name, model, sync in steps:
        rows = db.query(model).order_by(model.id).all()
        for row in rows:
            sync(row)
        print(f"  synced {len(rows):3} {name}")
finally:
    db.close()

with get_neo4j_driver().session() as session:
    print("\ngraph now contains:")
    for label in sorted(session.run("CALL db.labels()").value()):
        count = session.run(f"MATCH (n:{label}) RETURN count(n) AS c").single()["c"]
        print(f"  {label:10} {count}")
    print("\nrelationships:")
    for rel in sorted(session.run("CALL db.relationshipTypes()").value()):
        count = session.run(
            f"MATCH ()-[r:{rel}]->() RETURN count(r) AS c"
        ).single()["c"]
        print(f"  {rel:14} {count}")
