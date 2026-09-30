"""Identity «بريد عرجون للخدمات الإلكترونية والرقمية» (docs/brand-redesign-plan.md).

Existing settings are updated only while they still hold the previous default
text, so copy the owner already wrote is never overwritten."""
from django.db import migrations, models

CHANGES = {  # field: (old default, new default)
    "tagline": ("نقرّب لك المسافات", "للخدمات الإلكترونية والرقمية"),
    "hero_eyebrow": ("من السودان، أقرب إليك", "تواصلٌ أذكى… لمستقبل رقمي أفضل"),
    "seo_title": ("بريد عرجون | خدمات تقرّب المسافات", "بريد عرجون | للخدمات الإلكترونية والرقمية"),
    "seo_description": (
        "خدمات متنوعة، وطلب تتابعه بسهولة.",
        "خدمات إلكترونية ورقمية متنوعة بطلب واحد واضح، ومتابعة برقم الطلب.",
    ),
}


def forwards(apps, schema_editor):
    SiteSettings = apps.get_model("content", "SiteSettings")
    for field, (old, new) in CHANGES.items():
        SiteSettings.objects.filter(**{field: old}).update(**{field: new})


def backwards(apps, schema_editor):
    SiteSettings = apps.get_model("content", "SiteSettings")
    for field, (old, new) in CHANGES.items():
        SiteSettings.objects.filter(**{field: new}).update(**{field: old})


class Migration(migrations.Migration):
    dependencies = [("content", "0009_hero_copy")]

    operations = [
        migrations.AlterField("sitesettings", "tagline", models.CharField(default=CHANGES["tagline"][1], max_length=120)),
        migrations.AlterField("sitesettings", "hero_eyebrow", models.CharField(default=CHANGES["hero_eyebrow"][1], max_length=120)),
        migrations.AlterField("sitesettings", "seo_title", models.CharField(default=CHANGES["seo_title"][1], max_length=70)),
        migrations.AlterField("sitesettings", "seo_description", models.CharField(default=CHANGES["seo_description"][1], max_length=170)),
        migrations.RunPython(forwards, backwards),
    ]
