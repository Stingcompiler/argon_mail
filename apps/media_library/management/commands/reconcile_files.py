"""Compare PrivateFile rows with files on disk. Run after every restore.

Reports rows whose file is missing or whose checksum changed, and files on
disk that no row references (orphans). Read-only unless --delete-orphans.
Exit status 1 when rows point at missing or corrupted files.
"""
import hashlib
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from apps.media_library.models import PrivateFile
from apps.media_library.storage import absolute


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


class Command(BaseCommand):
    help = "Check that private files on disk match the database."

    def add_arguments(self, parser):
        parser.add_argument("--checksums", action="store_true", help="Also verify sha256 of every file (slower).")
        parser.add_argument("--delete-orphans", action="store_true", help="Delete files no row references.")

    def handle(self, checksums, delete_orphans, **opts):
        root = Path(settings.PRIVATE_ROOT)
        known, missing, corrupted = set(), [], []
        for f in PrivateFile.objects.only("id", "path", "sha256", "order_id").iterator():
            p = absolute(f.path)
            known.add(p)
            if not p.is_file():
                missing.append(f)
            elif checksums and sha256(p) != f.sha256:
                corrupted.append(f)
        on_disk = {p.resolve() for p in root.rglob("*") if p.is_file() and not p.name.endswith(".part")} if root.exists() else set()
        orphans = sorted(on_disk - known)

        self.stdout.write(f"rows: {len(known)}  files on disk: {len(on_disk)}")
        self.stdout.write(f"missing files: {len(missing)}  corrupted: {len(corrupted)}  orphans: {len(orphans)}")
        for f in missing:
            self.stdout.write(f"  MISSING order={f.order_id} file={f.pk} path={f.path}")
        for f in corrupted:
            self.stdout.write(f"  CORRUPTED order={f.order_id} file={f.pk} path={f.path}")
        for p in orphans[:50]:
            self.stdout.write(f"  ORPHAN {p}")
        if delete_orphans:
            for p in orphans:
                p.unlink(missing_ok=True)
            self.stdout.write(f"deleted {len(orphans)} orphan file(s)")
        if missing or corrupted:
            raise SystemExit(1)
