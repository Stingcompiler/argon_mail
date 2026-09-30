"""Postal first: the default hero copy, search description and «الخدمات» link
(docs/landing-mobile-audit-plan.md, batch 1).

Existing settings are updated only while they still hold the previous default
text, so copy the owner already wrote is never overwritten."""
from django.db import migrations, models

CHANGES = {  # field: (old default, new default)
    "hero_title": ("خدمات متنوعة،\nبطلب واحد واضح.", "بريدك ومعاملاتك،\nفي طلب واحد."),
    "hero_text": (
        "اختر الخدمة المناسبة، أرسل تفاصيلك، واحتفظ برقم طلبك لمتابعة حالته.\n"
        "يتواصل معك فريق عرجون عبر WhatsApp عند الحاجة.",
        "أرسل طرودك ومستنداتك، أو اطلب خدمة تعليمية أو سفر أو معاملة، وتتبع كل طلب برقمه.",
    ),
    "seo_description": (
        "خدمات إلكترونية ورقمية متنوعة بطلب واحد واضح، ومتابعة برقم الطلب.",
        "خدمات بريدية وإلكترونية متنوعة بطلب واحد واضح، وتتبع برقم الطلب.",
    ),
}
NAV_LABEL = ("خدماتنا", "الخدمات")  # the /services link, if still the default label


def rename_nav(settings, old, new):
    changed = False
    for item in settings.navigation or []:
        if item.get("href") == "/services" and item.get("label") == old:
            item["label"] = new
            changed = True
    if changed:
        settings.save(update_fields=["navigation"])


def forwards(apps, schema_editor):
    SiteSettings = apps.get_model("content", "SiteSettings")
    for field, (old, new) in CHANGES.items():
        SiteSettings.objects.filter(**{field: old}).update(**{field: new})
    for s in SiteSettings.objects.all():
        rename_nav(s, *NAV_LABEL)


def backwards(apps, schema_editor):
    SiteSettings = apps.get_model("content", "SiteSettings")
    for field, (old, new) in CHANGES.items():
        SiteSettings.objects.filter(**{field: new}).update(**{field: old})
    for s in SiteSettings.objects.all():
        rename_nav(s, NAV_LABEL[1], NAV_LABEL[0])


class Migration(migrations.Migration):
    dependencies = [("content", "0010_brand_identity")]

    operations = [
        migrations.AlterField("sitesettings", "hero_title", models.CharField(default=CHANGES["hero_title"][1], max_length=160)),
        migrations.AlterField("sitesettings", "hero_text", models.TextField(default=CHANGES["hero_text"][1], max_length=600)),
        migrations.AlterField("sitesettings", "seo_description", models.CharField(default=CHANGES["seo_description"][1], max_length=170)),
        migrations.RunPython(forwards, backwards),
    ]
