import os
from unittest.mock import patch

from django.core.cache import cache
from django.core.management import call_command
from django.test import override_settings
from rest_framework.test import APITestCase

from apps.accounts.models import Role, User
from apps.core.tests.factories import ORIGIN, PASSWORD, make_user


@override_settings(TRUSTED_ORIGINS=[ORIGIN])
class UsernameLoginTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = make_user()
        self.user.username = "Musab"
        self.user.save()

    def login(self, **body):
        return self.client.post("/api/v1/auth/login/", body, format="json", HTTP_ORIGIN=ORIGIN)

    def test_username_is_stored_lower_case(self):
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, "musab")

    def test_login_with_username_any_case(self):
        for ident in ("musab", "MUSAB", " Musab "):
            r = self.login(login=ident, password=PASSWORD)
            self.assertEqual(r.status_code, 200, (ident, r.content))
            self.assertEqual(r.json()["user"]["username"], "musab")

    def test_login_with_email_still_works(self):
        self.assertEqual(self.login(login="ADMIN@example.com", password=PASSWORD).status_code, 200)
        self.assertEqual(self.login(email="admin@example.com", password=PASSWORD).status_code, 200)  # old clients

    def test_same_error_for_unknown_user_and_wrong_password(self):
        a = self.login(login="nobody", password=PASSWORD)
        b = self.login(login="musab", password="wrong-password")
        self.assertEqual((a.status_code, b.status_code), (401, 401))
        self.assertEqual(a.json(), b.json())

    def test_missing_identifier(self):
        self.assertEqual(self.login(password=PASSWORD).status_code, 400)


class TeamUsernameTests(APITestCase):
    def setUp(self):
        self.client.force_authenticate(make_user())

    def test_create_and_rename_with_validation(self):
        r = self.client.post("/api/v1/admin/team/", {"email": "op@example.com", "full_name": "مشغل", "role": "operator",
                                                    "username": "Op.One", "password": "Str0ng-pass-phrase!"}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.json()["username"], "op.one")
        uid = r.json()["id"]
        r = self.client.post("/api/v1/admin/team/", {"email": "x@example.com", "full_name": "س", "role": "executor",
                                                    "username": "OP.ONE", "password": "Str0ng-pass-phrase!"}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("username", r.json()["errors"])
        for bad in ("ab", "has space", "-start", "عربي"):
            r = self.client.patch(f"/api/v1/admin/team/{uid}/", {"username": bad}, format="json")
            self.assertEqual(r.status_code, 400, bad)
        r = self.client.patch(f"/api/v1/admin/team/{uid}/", {"username": ""}, format="json")
        self.assertIsNone(r.json()["username"])
        self.assertEqual(User.objects.filter(username__isnull=True).count(), 2)

    def test_create_staff_command_with_username(self):
        with patch.dict(os.environ, {"STAFF_PASSWORD": "Str0ng-pass-phrase!"}):
            call_command("create_staff", "boss@example.com", "مدير", "--role", "admin", "--username", "Boss")
        self.assertEqual(User.objects.get(email="boss@example.com").username, "boss")
        self.assertEqual(User.objects.get(email="boss@example.com").role, Role.ADMIN)
