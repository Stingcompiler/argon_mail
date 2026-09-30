from django.test import TestCase

from apps.content.models import FAQItem


class PostalFaqTests(TestCase):
    """Batch 4 of docs/landing-mobile-audit-plan.md: a fresh install answers the
    postal questions too, after the three general ones (migration 0012)."""

    def test_postal_questions_follow_the_general_ones(self):
        questions = list(FAQItem.objects.order_by("sort_order", "id").values_list("question", flat=True))
        self.assertEqual(questions[:3], ["هل أحتاج إلى حساب لتقديم طلب؟", "كيف أتواصل مع المسؤول عن طلبي؟", "متى أعرف السعر النهائي للخدمة؟"])
        self.assertIn("كم يستغرق إرسال الطرد؟", questions)
        self.assertIn("ما الذي لا يُشحن؟", questions)
        self.assertEqual(len(questions), 8)
        self.assertTrue(all(f.is_published for f in FAQItem.objects.all()))
