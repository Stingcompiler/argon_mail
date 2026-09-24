import django_filters
from django.db.models import Q

from .models import Order


class OrderFilter(django_filters.FilterSet):
    q = django_filters.CharFilter(method="search")
    status = django_filters.CharFilter(field_name="status__key")
    service = django_filters.NumberFilter(field_name="service_id")
    assignee = django_filters.CharFilter(method="by_assignee")
    created_after = django_filters.DateFilter(field_name="created_at", lookup_expr="date__gte")
    created_before = django_filters.DateFilter(field_name="created_at", lookup_expr="date__lte")

    class Meta:
        model = Order
        fields = []

    def search(self, qs, name, value):
        value = value.strip()
        if not value:
            return qs
        digits = "".join(c for c in value if c.isdigit())
        cond = Q(code__icontains=value) | Q(customer_name__icontains=value)
        if len(digits) >= 4:
            cond |= Q(customer_phone__contains=digits)
        return qs.filter(cond)

    def by_assignee(self, qs, name, value):
        if value == "none":
            return qs.filter(assignee__isnull=True)
        if value == "me":
            return qs.filter(assignee=self.request.user)
        if value.isdigit():
            return qs.filter(assignee_id=int(value))
        return qs
