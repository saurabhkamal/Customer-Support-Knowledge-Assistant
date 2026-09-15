"""Deactivate an API key by id.

    python scripts/revoke_key.py 1

Refuses to run if it would leave no active key, so the API cannot lock
itself out. Key values are never printed.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import text  # noqa: E402

from database import engine  # noqa: E402

if len(sys.argv) != 2 or not sys.argv[1].isdigit():
    sys.exit("usage: python scripts/revoke_key.py <key_id>")

key_id = int(sys.argv[1])

with engine.begin() as conn:
    rows = conn.execute(
        text("SELECT id, label, is_active FROM api_keys ORDER BY id")
    ).fetchall()

    print("before:")
    for r in rows:
        print(f"  id={r[0]} label={r[1]!r} active={r[2]}")

    target = next((r for r in rows if r[0] == key_id), None)
    if target is None:
        sys.exit(f"\nABORT: no key with id={key_id}")
    if not target[2]:
        print(f"\nkey id={key_id} is already inactive; nothing to do.")
        sys.exit(0)
    if not [r for r in rows if r[0] != key_id and r[2]]:
        sys.exit(
            f"\nABORT: id={key_id} is the only active key. "
            "Mint a replacement first:\n"
            "  python scripts/create_first_key.py \"replacement\""
        )

    conn.execute(
        text("UPDATE api_keys SET is_active = false WHERE id = :i"), {"i": key_id}
    )

    print("\nafter:")
    for r in conn.execute(
        text("SELECT id, label, is_active FROM api_keys ORDER BY id")
    ).fetchall():
        print(f"  id={r[0]} label={r[1]!r} active={r[2]}")
