from django.db import migrations

PAGES = {
    "privacy": ("سياسة الخصوصية", """## بيانات الطلب
نجمع الاسم ورقم WhatsApp والتفاصيل اللازمة لتنفيذ الخدمة فقط، ويطّلع عليها فريق العمل المصرّح له.

## متابعة الحالة
صفحة المتابعة تعرض حالة الطلب والملاحظات العامة فقط، ولا تعرض الاسم أو الهاتف أو تفاصيل الطلب أو الملاحظات الداخلية.

## المرفقات والاحتفاظ
تُحدد مدة الاحتفاظ بالبيانات والمرفقات وتُعلن قبل التشغيل الفعلي."""),
    "terms": ("شروط الاستخدام", """## الخدمات المتاحة
يحدد صاحب المنصة الخدمات والأسعار والمتطلبات المنشورة في صفحة كل خدمة.

## السعر وبدء التنفيذ
تعرض كل خدمة طريقة تسعيرها. تُستكمل تفاصيل السعر والموافقة مع المسؤول قبل بدء التنفيذ.

## الإلغاء والاسترداد
تُحدد أحكام الإلغاء والاسترداد لكل خدمة وتُعتمد قبل بدء التشغيل الحقيقي."""),
}


def seed(apps, schema_editor):
    Page = apps.get_model("content", "Page")
    for i, (slug, (title, body)) in enumerate(PAGES.items()):
        Page.objects.get_or_create(slug=slug, defaults=dict(title=title, body=body, status="published",
                                                            needs_review=True, sort_order=100 + i))


class Migration(migrations.Migration):
    dependencies = [("content", "0005_page")]
    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]
