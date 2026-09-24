from unittest.mock import patch

from django.test import TestCase, override_settings

from apps.core.tests.factories import make_service


@override_settings(INTERNAL_SECRET="s")
class RevalidationTests(TestCase):
    def test_one_request_per_transaction_with_all_tags(self):
        with patch("apps.revalidation.client._send") as send:
            with self.captureOnCommitCallbacks(execute=True):
                service = make_service(name="خدمة")
        send.assert_called_once()
        tags = send.call_args.args[0]
        self.assertIn("services", tags)
        self.assertIn(f"service:{service.slug}", tags)
