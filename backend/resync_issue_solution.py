from graph_service import sync_issue, sync_solution

# Backfill: issue id=1 was created before sync_issue existed
sync_issue(
    issue_id=1,
    title="Login failure after password reset",
    description="User unable to authenticate post reset",
    ticket_id=1,
)

# Re-confirm solution id=1 links to it
sync_solution(
    solution_id=1,
    description="Cleared cached session tokens and had user re-login",
    issue_id=1,
)