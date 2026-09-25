import io
from pathlib import Path

from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework.test import APITestCase

from apps.accounts.models import Role
from apps.catalog.models import Service
from apps.content.models import SiteSettings
from apps.core.tests.factories import make_service, make_user
from apps.media_library.models import PublicAsset


def image_bytes(fmt="JPEG", size=(3000, 1500), exif=True):
    img = Image.new("RGB", size, (20, 90, 70))
    out = io.BytesIO()
    kwargs = {}
    if exif and fmt == "JPEG":
        ex = Image.Exif()
        ex[0x010F] = "SecretCam"  # Make
        kwargs["exif"] = ex.tobytes()
    img.save(out, fmt, **kwargs)
    return out.getvalue()


class PublicAssetTests(APITestCase):
    def setUp(self):
        self.client.force_authenticate(make_user())

    def upload(self, data, name="photo.jpg", alt="صورة الخدمة"):
        return self.client.post("/api/v1/admin/assets/", {"file": SimpleUploadedFile(name, data), "alt_text": alt}, format="multipart")

    def test_upload_resizes_strips_metadata_and_serves(self):
        r = self.upload(image_bytes())
        self.assertEqual(r.status_code, 201, r.content)
        a = r.json()
        self.assertEqual((a["width"], a["height"]), (2000, 1000))
        self.assertTrue(a["url"].startswith("/media/assets/"))
        stored = Path(settings.MEDIA_ROOT) / PublicAsset.objects.get(pk=a["id"]).path
        self.assertNotIn(b"SecretCam", stored.read_bytes())
        self.assertNotIn("photo", a["url"])
        res = self.client.get(a["url"])
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res["Content-Type"], "image/jpeg")
        self.assertIn("immutable", res["Cache-Control"])

    def test_alt_text_required(self):
        r = self.upload(image_bytes(), alt="  ")
        self.assertEqual(r.status_code, 400)
        self.assertIn("alt_text", r.json()["errors"])

    def test_rejects_non_images_svg_and_fakes(self):
        self.assertEqual(self.upload(b"%PDF-1.4 x", name="a.pdf").status_code, 400)
        self.assertEqual(self.upload(b'<svg xmlns="http://www.w3.org/2000/svg"/>', name="a.svg").status_code, 400)
        self.assertEqual(self.upload(b"\x89PNG\r\n\x1a\n" + b"garbage", name="a.png").status_code, 400)  # corrupt

    def test_usage_blocks_delete_and_is_reported(self):
        a = self.upload(image_bytes(fmt="PNG", size=(400, 300)), name="logo.png").json()
        service = make_service(name="خدمة بصورة")
        r = self.client.patch(f"/api/v1/admin/services/{service.pk}/", {"image": a["id"]}, format="json")
        self.assertEqual(r.json()["image_data"]["url"], a["url"])
        self.client.patch("/api/v1/admin/settings/", {"logo": a["id"]}, format="json")
        listed = next(x for x in self.client.get("/api/v1/admin/assets/").json() if x["id"] == a["id"])
        self.assertEqual(set(listed["usage"]), {"صورة الخدمة: خدمة بصورة", "شعار الموقع"})
        self.assertEqual(self.client.delete(f"/api/v1/admin/assets/{a['id']}/").status_code, 409)
        self.client.force_authenticate(None)
        pub = self.client.get(f"/api/v1/public/services/{service.slug}/").json()
        self.assertEqual(pub["image"], {"url": a["url"], "alt": "صورة الخدمة", "width": 400, "height": 300})
        self.assertEqual(self.client.get("/api/v1/public/site/").json()["settings"]["logo_data"]["url"], a["url"])

    def test_unused_asset_deleted_with_file(self):
        a = self.upload(image_bytes(size=(100, 100))).json()
        path = Path(settings.MEDIA_ROOT) / PublicAsset.objects.get(pk=a["id"]).path
        self.assertEqual(self.client.delete(f"/api/v1/admin/assets/{a['id']}/").status_code, 204)
        self.assertFalse(path.exists())

    def test_alt_text_editable_file_not(self):
        a = self.upload(image_bytes(size=(100, 100))).json()
        r = self.client.patch(f"/api/v1/admin/assets/{a['id']}/", {"alt_text": "وصف جديد", "width": 1}, format="json")
        self.assertEqual((r.json()["alt_text"], r.json()["width"]), ("وصف جديد", 100))

    def test_media_route_never_serves_private_or_traversal(self):
        for path in ("/media/private/x.pdf", "/media/../private/orders/a.pdf", "/media/assets/../../x.png", "/media/assets/a.svg"):
            self.assertEqual(self.client.get(path).status_code, 404, path)

    def test_executor_cannot_manage_media(self):
        self.client.force_authenticate(make_user("e@example.com", Role.EXECUTOR, "منفذ"))
        self.assertEqual(self.client.get("/api/v1/admin/assets/").status_code, 403)
