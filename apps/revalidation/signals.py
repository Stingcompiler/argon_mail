from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from apps.catalog.models import Category, Service, ServiceField, ServiceSlugRedirect
from apps.content.models import FAQItem, Page, SiteSettings
from apps.media_library.models import PublicAsset

from .client import revalidate

# Cache tags used by frontend/src/lib/server-api.ts
SERVICES = "services"
SITE = "site"


def service_tag(slug):
    return f"service:{slug}"


@receiver([post_save, post_delete], sender=Service)
def service_changed(sender, instance, **kwargs):
    old = list(ServiceSlugRedirect.objects.filter(service_id=instance.pk).values_list("old_slug", flat=True))
    revalidate(SERVICES, service_tag(instance.slug), *[service_tag(s) for s in old])


@receiver([post_save, post_delete], sender=ServiceField)
def field_changed(sender, instance, **kwargs):
    revalidate(service_tag(instance.service.slug))


@receiver([post_save, post_delete], sender=Category)
def category_changed(sender, instance, **kwargs):
    revalidate(SERVICES)


@receiver([post_save, post_delete], sender=SiteSettings)
@receiver([post_save, post_delete], sender=FAQItem)
def site_changed(sender, instance, **kwargs):
    revalidate(SITE)


@receiver([post_save, post_delete], sender=Page)
def page_changed(sender, instance, **kwargs):
    # "site" carries the footer links; "page:<slug>" the page itself.
    revalidate(SITE, f"page:{instance.slug}")


@receiver([post_save, post_delete], sender=PublicAsset)
def asset_changed(sender, instance, **kwargs):
    revalidate(SERVICES, SITE)
