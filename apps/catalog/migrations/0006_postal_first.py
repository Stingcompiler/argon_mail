"""The postal area leads the main cards (docs/landing-mobile-audit-plan.md,
batch 1): where the owner has not ordered the areas (every sort_order is 0),
the area with a postal icon moves to the front. An order the owner set is
left alone."""
from django.db import migrations

POSTAL_ICONS = ("package", "mail", "delivery")


def forwards(apps, schema_editor):
    Category = apps.get_model("catalog", "Category")
    areas = list(Category.objects.order_by("sort_order", "id"))
    if not areas or any(a.sort_order for a in areas):
        return
    postal = next((a for a in areas if a.icon_key in POSTAL_ICONS), None)
    if postal is None or areas[0].pk == postal.pk:
        return
    ordered = [postal] + [a for a in areas if a.pk != postal.pk]
    for i, a in enumerate(ordered):
        Category.objects.filter(pk=a.pk).update(sort_order=i)


class Migration(migrations.Migration):
    dependencies = [("catalog", "0005_area_card_texts")]

    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
