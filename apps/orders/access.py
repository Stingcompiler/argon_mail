from apps.accounts.models import Role

from .models import Order


def visible_orders(user):
    """Orders a staff member may see. Executors only see assigned orders."""
    if not (user and user.is_authenticated and user.is_active and user.role in Role.values):
        return Order.objects.none()
    qs = Order.objects.all()
    if user.role == Role.EXECUTOR:
        qs = qs.filter(assignee=user)
    return qs
