"""Create or update a staff account without putting secrets in code.

The password is read from the STAFF_PASSWORD environment variable or asked
interactively. Example:

    STAFF_PASSWORD=... python manage.py create_staff owner@example.com "اسم المدير" --role admin
"""
import getpass
import os

from django.contrib.auth import password_validation
from django.core.management.base import BaseCommand, CommandError

from apps.accounts.models import Role, User


class Command(BaseCommand):
    help = "Create or update a staff member (admin, operator, executor)."

    def add_arguments(self, parser):
        parser.add_argument("email")
        parser.add_argument("full_name")
        parser.add_argument("--role", choices=Role.values, default=Role.ADMIN)

    def handle(self, email, full_name, role, **opts):
        password = os.environ.get("STAFF_PASSWORD") or getpass.getpass("Password: ")
        if not password:
            raise CommandError("A password is required.")
        password_validation.validate_password(password)
        user, created = User.objects.get_or_create(email=email.lower(), defaults={"full_name": full_name})
        user.full_name = full_name
        user.role = role
        user.is_staff = role == Role.ADMIN
        user.is_superuser = role == Role.ADMIN
        user.is_active = True
        user.set_password(password)
        user.save()
        self.stdout.write(self.style.SUCCESS(f"{'Created' if created else 'Updated'} {role} {user.email}"))
