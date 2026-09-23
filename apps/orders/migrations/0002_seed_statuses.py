from django.db import migrations

STATUSES = [
    ("new", "جديد", "new", True),
    ("in-review", "قيد المراجعة", "in_review", False),
    ("waiting-customer", "بانتظار العميل", "waiting_customer", False),
    ("in-progress", "قيد التنفيذ", "in_progress", False),
    ("ready", "جاهز للتسليم", "ready", False),
    ("completed", "مكتمل", "completed", False),
    ("cancelled", "ملغي", "cancelled", False),
    ("failed", "متعذر التنفيذ", "failed", False),
]


def seed(apps, schema_editor):
    OrderStatus = apps.get_model("orders", "OrderStatus")
    for i, (key, label, meaning, initial) in enumerate(STATUSES):
        OrderStatus.objects.get_or_create(
            key=key, defaults={"label": label, "meaning": meaning, "sort_order": i, "is_initial": initial}
        )


class Migration(migrations.Migration):
    dependencies = [("orders", "0001_initial")]
    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]
