"""Mint an API key directly against the database.

POST /api-keys/ requires an existing valid key, so the first one has to be
created out-of-band. Run from the backend directory:

    python scripts/create_first_key.py "local dev"

Prints the key once. It is stored as-is, so retrieve it later with a DB query
if lost, or mint a replacement and deactivate the old one.
"""

import secrets
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from database import SessionLocal  # noqa: E402
from models import ApiKey  # noqa: E402

label = sys.argv[1] if len(sys.argv) > 1 else "bootstrap"

db = SessionLocal()
try:
    existing = db.query(ApiKey).filter(ApiKey.is_active == True).count()  # noqa: E712
    if existing:
        print(f"Warning: {existing} active key(s) already exist. Creating another.")

    new_key = ApiKey(key=secrets.token_urlsafe(32), label=label)
    db.add(new_key)
    db.commit()
    db.refresh(new_key)

    print(f"Created key id={new_key.id} label={new_key.label!r}")
    print(new_key.key)
finally:
    db.close()
