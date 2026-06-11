from django.contrib import admin

from .models import Equipment, FundEntry, RenovationStage, StagePhoto, Worker


class StagePhotoInline(admin.TabularInline):
    model = StagePhoto
    extra = 0


@admin.register(RenovationStage)
class RenovationStageAdmin(admin.ModelAdmin):
    list_display = ("water_body", "order", "title", "status", "photo_count")
    list_filter = ("status",)
    search_fields = ("title", "water_body__name")
    inlines = [StagePhotoInline]


@admin.register(Worker)
class WorkerAdmin(admin.ModelAdmin):
    list_display = ("water_body", "name", "gender", "designation", "count")
    list_filter = ("gender",)


@admin.register(Equipment)
class EquipmentAdmin(admin.ModelAdmin):
    list_display = ("water_body", "name", "quantity")


@admin.register(FundEntry)
class FundEntryAdmin(admin.ModelAdmin):
    list_display = ("water_body", "purpose", "amount", "spent_on")
    list_filter = ("spent_on",)
