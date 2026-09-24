from django.contrib import admin

from .models import FAQItem, SiteSettings

admin.site.register(SiteSettings)
admin.site.register(FAQItem)
