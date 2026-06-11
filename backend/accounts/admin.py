from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ("username", "role", "designation", "district", "is_active")
    list_filter = ("role", "district", "is_active")
    fieldsets = UserAdmin.fieldsets + (
        (
            "Lake Management",
            {"fields": ("role", "phone", "designation", "district", "local_bodies")},
        ),
    )
