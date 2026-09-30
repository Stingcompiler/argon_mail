"""Postal questions in the FAQ (docs/landing-mobile-audit-plan.md, batch 4).

Added only while the FAQ still holds exactly the three seeded questions, so a
list the owner has edited is left alone. The answers promise nothing the
product does not do: durations and prices are the team's to confirm."""
from django.db import migrations

SEEDED = [
    "هل أحتاج إلى حساب لتقديم طلب؟",
    "كيف أتواصل مع المسؤول عن طلبي؟",
    "متى أعرف السعر النهائي للخدمة؟",
]
POSTAL = [
    ("ما الذي أرسله عبر الخدمات البريدية؟",
     "طرودًا ومستندات. تكتب في نموذج الطلب نوع الشحنة ووجهتها، وإن احتاج شيء توضيحًا يراسلك المسؤول عبر WhatsApp قبل البدء."),
    ("كم يستغرق إرسال الطرد؟",
     "تختلف المدة بحسب الوجهة ونوع الشحنة، ويؤكدها لك المسؤول عند مراجعة الطلب. كل تغيير في حالة الشحنة يظهر في صفحة التتبع."),
    ("هل أستطيع تتبع الطرد بعد إرساله؟",
     "نعم. من أي صفحة اضغط «تتبع طلبك» وأدخل رقم الطلب الذي يبدأ بـ ARJ-، أو ابحث باسمك ورقم هاتفك إن نسيت الرقم."),
    ("ما الذي لا يُشحن؟",
     "المواد الممنوعة قانونًا والمواد الخطرة لا تُقبل. إن لم تكن متأكدًا من شحنتك، اسألنا من صفحة التواصل قبل أن تطلب."),
    ("ماذا أحتاج لطلب خدمة تعليمية أو سفر أو معاملة؟",
     "افتح صفحة الخدمة: فيها المتطلبات والمستندات المطلوبة وطريقة التسعير، ثم أرسل طلبك من النموذج نفسه وتابعه برقمه."),
]


def forwards(apps, schema_editor):
    FAQItem = apps.get_model("content", "FAQItem")
    current = list(FAQItem.objects.order_by("sort_order", "id").values_list("question", flat=True))
    if current != SEEDED:
        return
    for i, (q, a) in enumerate(POSTAL, start=len(SEEDED)):
        FAQItem.objects.create(question=q, answer=a, sort_order=i)


def backwards(apps, schema_editor):
    FAQItem = apps.get_model("content", "FAQItem")
    FAQItem.objects.filter(question__in=[q for q, _ in POSTAL]).delete()


class Migration(migrations.Migration):
    dependencies = [("content", "0011_postal_copy")]

    operations = [migrations.RunPython(forwards, backwards)]
