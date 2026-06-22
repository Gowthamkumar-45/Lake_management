from django.contrib import admin
from .models import District, Taluk, LocalBody, WaterBody, WorkEntry, Photo, OfficerProfile, MaintenanceSchedule


@admin.register(District)
class DistrictAdmin(admin.ModelAdmin):
    list_display = ['name']


@admin.register(Taluk)
class TalukAdmin(admin.ModelAdmin):
    list_display = ['name', 'district']
    list_filter = ['district']


@admin.register(LocalBody)
class LocalBodyAdmin(admin.ModelAdmin):
    list_display = ['name', 'lb_type', 'taluk']
    list_filter = ['lb_type', 'taluk']


@admin.register(WaterBody)
class WaterBodyAdmin(admin.ModelAdmin):
    list_display = ['wb_id', 'name', 'wb_type', 'taluk', 'status', 'water_level', 'work_status']
    list_filter = ['status', 'wb_type', 'work_status', 'taluk']
    search_fields = ['wb_id', 'name', 'village']
    ordering = ['wb_id']


@admin.register(WorkEntry)
class WorkEntryAdmin(admin.ModelAdmin):
    list_display = ['water_body', 'work_type', 'title', 'status', 'progress', 'start_date']
    list_filter = ['status', 'work_type']


@admin.register(Photo)
class PhotoAdmin(admin.ModelAdmin):
    list_display = ['water_body', 'phase', 'officer', 'taken_at']
    list_filter = ['phase']


@admin.register(OfficerProfile)
class OfficerProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'role', 'taluk', 'status']
    list_filter = ['role', 'status']


@admin.register(MaintenanceSchedule)
class MaintenanceScheduleAdmin(admin.ModelAdmin):
    list_display = ['water_body', 'title', 'scheduled_date', 'status', 'officer']
    list_filter = ['status']
