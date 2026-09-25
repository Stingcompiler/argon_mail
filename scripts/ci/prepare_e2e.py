"""Prepare data for scripts/smoke.sh and the Playwright suite:
- demo catalogue, a file field on one service and a 15 MB per-file limit;
- a draft service for the preview test;
- an admin account from E2E_LOGIN / E2E_PASSWORD (if set)."""
import os

from django.core.management import call_command

from apps.accounts.models import Role, User
from apps.catalog.models import Category, Service, ServiceField
from apps.content.models import SiteSettings

call_command("seed_demo")
s = Service.objects.get(slug="تجهيز-ومراجعة-المستندات")
ServiceField.objects.get_or_create(service=s, key="scan", defaults=dict(label="صورة المستند", type="file", required=True, sort_order=9))
Service.objects.get_or_create(name="خدمة مسودة للمعاينة", defaults=dict(
    category=Category.objects.first(), description="تظهر فقط عبر رابط معاينة موقّع.", status="draft"))
settings_row = SiteSettings.load()
settings_row.max_file_mb = 15
settings_row.save()

login, password = os.environ.get("E2E_LOGIN"), os.environ.get("E2E_PASSWORD")
if login and password:
    user, _ = User.objects.get_or_create(email=f"{login}@e2e.invalid", defaults={"full_name": "E2E Admin"})
    user.username, user.role, user.is_active = login, Role.ADMIN, True
    user.set_password(password)
    user.save()
print("e2e data ready")
