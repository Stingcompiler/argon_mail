import uuid

from apps.accounts.models import Role, User
from apps.catalog.models import Category, Service, ServiceField

ORIGIN = "http://127.0.0.1:3000"
PASSWORD = "S3cure-pass-phrase!"


def make_user(email="admin@example.com", role=Role.ADMIN, name="مدير"):
    return User.objects.create_user(email=email, password=PASSWORD, full_name=name, role=role)


def make_service(name="خدمة تجريبية", status="published", fields=None):
    cat, _ = Category.objects.get_or_create(name="مجال")
    s = Service.objects.create(category=cat, name=name, description="وصف", status=status)
    for i, f in enumerate(fields or [{"key": "dest", "label": "الوجهة", "type": "text", "required": True}]):
        ServiceField.objects.create(service=s, sort_order=i, **f)
    return s


def order_payload(service, **over):
    data = {
        "service": service.slug,
        "customer_name": "عميل",
        "customer_phone": "+249 912 345 678",
        "answers": {"dest": "الخرطوم"},
        "details": "",
        "consent": True,
    }
    data.update(over)
    return data


def idem():
    return {"HTTP_IDEMPOTENCY_KEY": str(uuid.uuid4())}
