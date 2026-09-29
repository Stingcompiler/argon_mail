"""New default hero copy (docs/landing-page-enhancement-plan.md, phase 1).

Existing settings are updated only while they still hold the previous default
text, so copy the owner already wrote is never overwritten."""
from django.db import migrations, models

OLD_TITLE = "خدمات متنوعة.\nومسافات أقرب."
OLD_TEXT = "كل ما تحتاجه لإنجاز خطوتك القادمة، في مكان واحد.\nاختر خدمتك، أرسل طلبك، ودع التفاصيل علينا."
NEW_TITLE = "خدمات متنوعة،\nبطلب واحد واضح."
NEW_TEXT = (
    "اختر الخدمة المناسبة، أرسل تفاصيلك، واحتفظ برقم طلبك لمتابعة حالته.\n"
    "يتواصل معك فريق عرجون عبر WhatsApp عند الحاجة."
)


def forwards(apps, schema_editor):
    SiteSettings = apps.get_model("content", "SiteSettings")
    SiteSettings.objects.filter(hero_title=OLD_TITLE).update(hero_title=NEW_TITLE)
    SiteSettings.objects.filter(hero_text=OLD_TEXT).update(hero_text=NEW_TEXT)


def backwards(apps, schema_editor):
    SiteSettings = apps.get_model("content", "SiteSettings")
    SiteSettings.objects.filter(hero_title=NEW_TITLE).update(hero_title=OLD_TITLE)
    SiteSettings.objects.filter(hero_text=NEW_TEXT).update(hero_text=OLD_TEXT)


class Migration(migrations.Migration):
    dependencies = [("content", "0008_appearance")]

    operations = [
        migrations.AlterField("sitesettings", "hero_title", models.CharField(default=NEW_TITLE, max_length=160)),
        migrations.AlterField("sitesettings", "hero_text", models.TextField(default=NEW_TEXT, max_length=600)),
        migrations.RunPython(forwards, backwards),
    ]
