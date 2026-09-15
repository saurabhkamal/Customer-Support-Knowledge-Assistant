"""Read-only connectivity check for the backend's three external dependencies.

Run from the backend directory:  python scripts/healthcheck.py
Exits non-zero if any dependency is unreachable, so it can gate a deploy.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

results = []


def check(name, fn):
    try:
        results.append((name, True, fn()))
    except Exception as exc:
        results.append((name, False, f"{type(exc).__name__}: {exc}"))


def postgres():
    from sqlalchemy import inspect, text

    from database import engine

    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
        has_vector = conn.execute(
            text("SELECT 1 FROM pg_extension WHERE extname = 'vector'")
        ).fetchone()
    tables = sorted(inspect(engine).get_table_names())
    if not has_vector:
        raise RuntimeError("connected, but the 'vector' extension is not installed")
    return f"{len(tables)} tables, pgvector present"


def neo4j():
    from graph_database import get_neo4j_driver

    driver = get_neo4j_driver()
    driver.verify_connectivity()
    with driver.session() as session:
        labels = sorted(session.run("CALL db.labels()").value())
    return f"labels: {', '.join(labels) or 'none'}"


def openai():
    from embedding_service import generate_embedding

    return f"embedding dimensions: {len(generate_embedding('healthcheck'))}"


check("Postgres", postgres)
check("Neo4j", neo4j)
check("OpenAI", openai)

for name, ok, detail in results:
    print(f"[{'OK' if ok else 'FAIL'}] {name}: {detail}")

sys.exit(0 if all(ok for _, ok, _ in results) else 1)
