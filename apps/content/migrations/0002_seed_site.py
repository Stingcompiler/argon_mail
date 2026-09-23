from django.db import migrations

FAQ = [
    ("هل أحتاج إلى حساب لتقديم طلب؟", "لا، يمكنك تقديم طلبك مباشرة. احتفظ برقم المتابعة الذي يظهر بعد الإرسال لتعرف حالة طلبك."),
    ("كيف أتواصل مع المسؤول عن طلبي؟", "أدخل رقم هاتفك المستخدم في WhatsApp ضمن الطلب، وسيتواصل معك المسؤول عند الحاجة."),
    ("متى أعرف السعر النهائي للخدمة؟", "توضح صفحة الخدمة طريقة التسعير. للخدمات التي تحتاج مراجعة، يتواصل المسؤول معك لتوضيح السعر قبل بدء التنفيذ."),
]


def seed(apps, schema_editor):
    SiteSettings = apps.get_model("content", "SiteSettings")
    FAQItem = apps.get_model("content", "FAQItem")
    SiteSettings.objects.get_or_create(pk=1)
    if not FAQItem.objects.exists():
        for i, (q, a) in enumerate(FAQ):
            FAQItem.objects.create(question=q, answer=a, sort_order=i)


class Migration(migrations.Migration):
    dependencies = [("content", "0001_initial")]
    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]
