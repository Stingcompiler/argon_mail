"""Prepare demo data for scripts/smoke.sh in CI: demo catalogue plus a
service with a file field and a 15 MB per-file limit."""
from django.core.management import call_command

from apps.catalog.models import Service, ServiceField
from apps.content.models import SiteSettings

call_command("seed_demo")
s = Service.objects.get(slug="تجهيز-ومراجعة-المستندات")
ServiceField.objects.get_or_create(service=s, key="scan", defaults=dict(label="صورة المستند", type="file", required=True, sort_order=9))
settings_row = SiteSettings.load()
settings_row.max_file_mb = 15
settings_row.save()
print("e2e data ready")
