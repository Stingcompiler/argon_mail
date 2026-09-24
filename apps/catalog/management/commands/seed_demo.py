"""Optional demo catalogue for local development and review.

Never run automatically; the owner defines real services from the dashboard.
"""
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.catalog.models import Category, Service, ServiceField

DEMO = [
    ("خدمات بريدية", "إرسال الطرود والمستندات", "package", "sage", "من مكانك إلى وجهتك",
     "قرّب المسافات. نساعدك في تنسيق إرسال طرودك ومستنداتك ومتابعة وصولها.",
     [("destination", "وجهة الإرسال", "text", True, []),
      ("kind", "نوع الشحنة", "select", True, ["مستندات", "طرد صغير", "طرد كبير"])]),
    ("خدمات تعليمية", "المساعدة في التقديم الدراسي", "education", "sand", "مساحة لطموحك",
     "خطوتك القادمة تبدأ هنا. مساعدة في تجهيز متطلبات التقديم ومتابعة الإجراءات.",
     [("program", "البرنامج أو الجهة التعليمية", "text", True, [])]),
    ("خدمات السفر", "تنسيق متطلبات السفر", "travel", "blue", "لرحلة أكثر اطمئنانًا",
     "رتّب رحلتك بوضوح. نساعدك في معرفة المتطلبات وتنسيق خطوات طلبك.",
     [("destination", "وجهة السفر", "text", True, []), ("date", "تاريخ السفر المتوقع", "date", False, [])]),
    ("خدمات عامة", "تجهيز ومراجعة المستندات", "document", "rose", "نهتم بالتفاصيل",
     "كل التفاصيل في مكانها. مساعدة في تنظيم مستنداتك ومراجعة متطلبات الخدمة.",
     [("documents", "نوع المستندات", "multiselect", True, ["شهادات", "هوية", "عقود", "أخرى"])]),
]


class Command(BaseCommand):
    help = "Create demo categories and services (development only)."

    @transaction.atomic
    def handle(self, *args, **opts):
        for i, (cat, name, icon, color, tag, desc, fields) in enumerate(DEMO):
            category, _ = Category.objects.get_or_create(name=cat, defaults={"sort_order": i})
            service, created = Service.objects.get_or_create(
                name=name,
                defaults=dict(category=category, icon_key=icon, color=color, tagline=tag, description=desc,
                              duration_text="تُحدد بعد مراجعة الطلب", status="published", sort_order=i,
                              requirements="تُوضّح المتطلبات التفصيلية بعد مراجعة الطلب."),
            )
            if created:
                for j, (key, label, typ, req, options) in enumerate(fields):
                    ServiceField.objects.create(service=service, key=key, label=label, type=typ, required=req,
                                                options=options, sort_order=j)
        self.stdout.write(self.style.SUCCESS("Demo catalogue ready."))
