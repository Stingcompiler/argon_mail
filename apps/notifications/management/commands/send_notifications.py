import signal
import time

from django.core.management.base import BaseCommand
from django.core.cache import cache
from django.db import close_old_connections

from apps.core.views import WORKER_HEARTBEAT_KEY
from apps.notifications.services import deliver_due


class Command(BaseCommand):
    help = "Send due admin e-mail alerts. --loop keeps running (used by start.sh)."

    def add_arguments(self, parser):
        parser.add_argument("--loop", action="store_true")
        parser.add_argument("--interval", type=int, default=15)

    def handle(self, loop, interval, **opts):
        stop = {"now": False}
        signal.signal(signal.SIGTERM, lambda *a: stop.update(now=True))
        while True:
            try:
                cache.set(WORKER_HEARTBEAT_KEY, time.time(), timeout=None)  # read by /api/v1/health/
                n = deliver_due()
                if n:
                    self.stdout.write(f"processed {n} notification(s)")
            except Exception as exc:  # keep the worker alive; next tick retries
                self.stderr.write(f"notification worker error: {exc}")
            if not loop or stop["now"]:
                return
            for _ in range(interval):
                if stop["now"]:
                    return
                time.sleep(1)
            close_old_connections()  # long-running loop: drop stale/broken connections
