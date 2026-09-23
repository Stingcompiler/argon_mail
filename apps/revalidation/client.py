"""Ask the Next.js server to drop cached public pages after content changes.

Tags are collected per transaction and sent once after commit. A failure is
logged and never breaks the save: pages still refresh on their own after
their `revalidate` period.
"""
import json
import logging
import threading
import urllib.request

from django.conf import settings
from django.db import transaction

log = logging.getLogger(__name__)
_pending = threading.local()


def _send(tags):
    if not settings.INTERNAL_SECRET or not tags:
        return
    req = urllib.request.Request(
        f"{settings.NEXT_INTERNAL_URL}/internal/revalidate",
        data=json.dumps({"tags": sorted(tags)}).encode(),
        headers={"Content-Type": "application/json", "X-Internal-Secret": settings.INTERNAL_SECRET},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=3) as resp:
            if resp.status >= 300:
                log.warning("revalidate %s -> HTTP %s", tags, resp.status)
    except Exception as exc:  # network errors must not fail the save
        log.warning("revalidate %s failed: %s", tags, exc)


def _flush():
    tags = getattr(_pending, "tags", set())
    _pending.tags = set()
    _send(tags)


def revalidate(*tags):
    tags = {t for t in tags if t}
    if not tags:
        return
    conn = transaction.get_connection()
    if not conn.in_atomic_block:
        _send(tags)
        return
    # One request per transaction. A rollback clears run_on_commit, so a
    # stale pending set is replaced rather than extended.
    if any(item[1] is _flush for item in conn.run_on_commit):
        _pending.tags.update(tags)
    else:
        _pending.tags = set(tags)
        transaction.on_commit(_flush)
