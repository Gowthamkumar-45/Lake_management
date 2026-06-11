from django.contrib import admin

from .models import WaterBody


@admin.register(WaterBody)
class WaterBodyAdmin(admin.ModelAdmin):
    list_display = ("name", "kind", "status", "local_body", "water_source")
    list_filter = ("kind", "status", "water_source", "local_body__body_type")
    search_fields = ("name",)
    autocomplete_fields = ("local_body", "ward", "area", "village")
