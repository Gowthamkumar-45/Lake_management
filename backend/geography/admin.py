from django.contrib import admin

from .models import Area, District, LocalBody, Village, Ward


@admin.register(District)
class DistrictAdmin(admin.ModelAdmin):
    list_display = ("name", "code")
    search_fields = ("name",)


@admin.register(LocalBody)
class LocalBodyAdmin(admin.ModelAdmin):
    list_display = ("name", "body_type", "district")
    list_filter = ("body_type", "district")
    search_fields = ("name",)


@admin.register(Ward)
class WardAdmin(admin.ModelAdmin):
    list_display = ("name", "number", "local_body")
    list_filter = ("local_body",)
    search_fields = ("name", "number")


@admin.register(Village)
class VillageAdmin(admin.ModelAdmin):
    list_display = ("name", "local_body")
    list_filter = ("local_body",)
    search_fields = ("name",)


@admin.register(Area)
class AreaAdmin(admin.ModelAdmin):
    list_display = ("name", "ward")
    list_filter = ("ward__local_body",)
    search_fields = ("name",)
