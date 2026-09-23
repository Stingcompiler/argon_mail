"""Short-lived signed download links for private files.

The token binds a file to the user who requested it. The download view
re-checks that user's current access, so a deactivated user or a removed
assignment invalidates links that have not expired yet."""
from django.core import signing

SALT = "arjoon.private-file"
MAX_AGE = 300  # seconds


def make_token(file_id, user_id) -> str:
    return signing.dumps({"f": str(file_id), "u": user_id}, salt=SALT, compress=False)


def read_token(token: str) -> dict:
    return signing.loads(token, salt=SALT, max_age=MAX_AGE)
